// Public unsubscribe endpoint. Validates HMAC token and inserts row in email_unsubscribes.
// Token format: base64url(email|scope|timestamp).base64url(hmac)
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(token: string, secret: string): Promise<{ email: string; scope: string; ts: number } | null> {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null
    const payload = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const [email, scope, tsStr] = payload.split('|')
    if (!email || !scope || !tsStr) return null
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(payload))
    if (!ok) return null
    return { email, scope, ts: Number(tsStr) }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const token = body?.token as string
    if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const parsed = await verifyToken(token, secret)
    if (!parsed) return new Response(JSON.stringify({ error: 'Недействительная или просроченная ссылка' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { autoRefreshToken: false, persistSession: false } })

    if (req.method === 'GET' || body?.preview) {
      // Just return info
      let seriesName: string | null = null
      if (parsed.scope.startsWith('series:')) {
        const sid = parsed.scope.slice(7)
        const { data } = await supabase.from('email_drip_series').select('name').eq('id', sid).maybeSingle()
        seriesName = data?.name ?? null
      }
      return new Response(JSON.stringify({ email: parsed.email, scope: parsed.scope, series_name: seriesName }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Lookup user_id by email (best-effort)
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', parsed.email).maybeSingle()

    const { error } = await supabase.from('email_unsubscribes').upsert({
      email: parsed.email.toLowerCase(),
      user_id: profile?.id ?? null,
      scope: parsed.scope,
      reason: 'user_clicked_unsubscribe',
    }, { onConflict: 'email,scope' })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, email: parsed.email, scope: parsed.scope }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
