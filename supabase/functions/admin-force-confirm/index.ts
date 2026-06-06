import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Allow superadmin OR has admin permission on patients module
    const { data: isSuper } = await admin.rpc('has_role', { _user_id: user.id, _role: 'superadmin' })
    if (!isSuper) {
      const { data: hasPerm } = await admin.rpc('has_admin_permission', { _user_id: user.id, _module: 'patients' })
      if (!hasPerm) return json({ error: 'Forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const targetUserId: string | undefined = body.userId
    const type: 'email' | 'phone' | undefined = body.type
    const phone: string | undefined = body.phone // optional, digits only (e.g. "79991234567")

    if (!targetUserId || !type || !['email', 'phone'].includes(type)) {
      return json({ error: 'userId и type обязательны' }, 400)
    }

    if (type === 'email') {
      const { error } = await admin.auth.admin.updateUserById(targetUserId, { email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      await admin.from('profiles').update({ email_verified: true }).eq('id', targetUserId)
      return json({ success: true })
    }

    // phone
    const normalized = (phone ?? '').replace(/\D/g, '')
    if (normalized && normalized.length < 8) return json({ error: 'Некорректный номер' }, 400)

    const updates: Record<string, unknown> = { phone_verified_at: new Date().toISOString() }
    if (normalized) updates.phone = normalized

    const { error: pErr } = await admin.from('profiles').update(updates).eq('id', targetUserId)
    if (pErr) return json({ error: pErr.message }, 400)

    if (normalized) {
      // Also sync auth.users.phone (best-effort)
      await admin.auth.admin.updateUserById(targetUserId, { phone: normalized, phone_confirm: true })
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
