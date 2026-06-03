import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Superadmin check
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden: superadmin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const targetUserId: string | undefined = body.userId
    const newEmailRaw: string | undefined = body.newEmail
    const newEmail = newEmailRaw?.trim().toLowerCase()

    if (!targetUserId || !newEmail) {
      return new Response(JSON.stringify({ error: 'userId и newEmail обязательны' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return new Response(JSON.stringify({ error: 'Некорректный email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch target user (for old email)
    const { data: targetUserData, error: getErr } = await admin.auth.admin.getUserById(targetUserId)
    if (getErr || !targetUserData?.user) {
      return new Response(JSON.stringify({ error: 'Пользователь не найден' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const oldEmail = targetUserData.user.email ?? null

    if (oldEmail && oldEmail.toLowerCase() === newEmail) {
      return new Response(JSON.stringify({ error: 'Новый email совпадает с текущим' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Uniqueness check in profiles
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', newEmail)
      .neq('id', targetUserId)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ error: 'Этот email уже используется другим пользователем' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update auth user (mark confirmed)
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      email: newEmail,
      email_confirm: true,
    })
    if (updErr) {
      const msg = updErr.message || 'Не удалось изменить email'
      const status = msg.toLowerCase().includes('already') ? 409 : 500
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update profile
    await admin.from('profiles').update({ email: newEmail }).eq('id', targetUserId)

    // Log in CRM (patient_interactions) — type 'note', mark in metadata
    try {
      await admin.from('patient_interactions').insert({
        user_id: targetUserId,
        created_by: user.id,
        interaction_type: 'note',
        status: 'completed',
        title: 'Смена email администратором',
        description: `Email изменён с ${oldEmail ?? '—'} на ${newEmail}.`,
        metadata: {
          kind: 'admin_email_change',
          old_email: oldEmail,
          new_email: newEmail,
        },
      })
    } catch (logErr) {
      console.error('Failed to log interaction', logErr)
    }

    return new Response(JSON.stringify({ success: true, oldEmail, newEmail }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('admin-change-user-email error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
