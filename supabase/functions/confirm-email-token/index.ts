import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json().catch(() => ({}))
    const token: string = (body?.token || '').toString().trim()
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: row, error } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('token, user_id, email, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      console.error('token lookup failed', error)
      return new Response(JSON.stringify({ error: 'Lookup failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!row) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (row.used_at) {
      return new Response(JSON.stringify({ error: 'already_used', email: row.email }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark profile verified
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', row.user_id)
    if (profErr) {
      console.error('profile update failed', profErr)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    return new Response(JSON.stringify({ success: true, email: row.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('confirm-email-token error', error)
    return new Response(JSON.stringify({ error: error?.message || 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
