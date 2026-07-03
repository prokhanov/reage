import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Status = 'ok' | 'expired' | 'already_used' | 'not_found' | 'invalid' | 'error'

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function lookupToken(token: string) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return { status: 'invalid' as Status }
  }
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: row, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('token, user_id, email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()
  if (error) {
    console.error('token lookup failed', error)
    return { status: 'error' as Status }
  }
  if (!row) return { status: 'not_found' as Status }
  if (row.used_at) return { status: 'already_used' as Status, email: row.email }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { status: 'expired' as Status, email: row.email }
  }
  return { status: 'ok' as Status, email: row.email, user_id: row.user_id, supabaseAdmin }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const mode: string = (body?.mode || 'verify').toString()
    const token: string = (body?.token || '').toString().trim()

    const result = await lookupToken(token)
    if (result.status !== 'ok') {
      return json({ ok: false, error: result.status, email: (result as any).email })
    }

    if (mode === 'verify') {
      return json({ ok: true, email: result.email })
    }

    if (mode === 'apply') {
      const password: string = (body?.password || '').toString()
      if (!password || password.length < 6 || password.length > 72) {
        return json({ ok: false, error: 'invalid_password' })
      }
      const { supabaseAdmin, user_id } = result as any
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
      if (updErr) {
        console.error('password update failed', updErr)
        const code = (updErr as any)?.code || ''
        const message = (updErr as any)?.message || ''
        const reasons = (updErr as any)?.reasons || []
        if (
          code === 'weak_password' ||
          /weak|easy to guess|pwned/i.test(message) ||
          (Array.isArray(reasons) && reasons.includes('pwned'))
        ) {
          return json({ ok: false, error: 'weak_password', reasons })
        }
        return json({ ok: false, error: 'update_failed' }, 500)
      }
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)
      return json({ ok: true })
    }

    return json({ ok: false, error: 'unknown_mode' }, 400)
  } catch (error: any) {
    console.error('confirm-password-reset-token error', error)
    return json({ ok: false, error: error?.message || 'unknown' }, 500)
  }
})
