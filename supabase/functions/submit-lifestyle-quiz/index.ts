// Public endpoint invoked from the landing page hidden-risk test.
// Stores the submission, sends a Telegram lead notification, and enqueues
// the "welcome" transactional email (if the template is active).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const name = body.name ? String(body.name).trim() : null
    const phone = body.phone ? String(body.phone).trim() : null

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const insertPayload = {
      email,
      name,
      phone,
      consent: true,
      quiz_version: body.quiz_version ?? null,
      sex: body.sex ?? null,
      age_band: body.age_band ?? null,
      height_cm: body.height_cm ?? null,
      weight_kg: body.weight_kg ?? null,
      answers: body.answers ?? {},
      result: body.result ?? null,
      user_agent: body.user_agent ?? null,
    }

    const { data: inserted, error: insErr } = await supabase
      .from('lifestyle_quiz_submissions')
      .insert(insertPayload as never)
      .select('id')
      .maybeSingle()

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Telegram notification (best effort) — server-side RPC reads secret + settings.
    try {
      await supabase.rpc('invoke_telegram_notify', {
        p_event_type: 'lifestyle_quiz_lead',
        p_payload: {
          submission_id: inserted?.id ?? null,
          email,
          name,
          phone,
          sex: body.sex ?? null,
          age_band: body.age_band ?? null,
          result_summary: body.result?.toneHeadline ?? null,
        },
      })
    } catch (e) {
      console.error('telegram notify failed', e)
    }

    // Welcome email (best effort) — respects is_active flag on the template.
    try {
      const { data: tpl } = await supabase
        .from('email_templates')
        .select('is_active')
        .eq('template_type', 'lifestyle_quiz_lead')
        .maybeSingle()

      if (tpl?.is_active !== false) {
        await supabase.functions.invoke('send-analysis-booking-email', {
          body: {
            recipient_email: email,
            template_type: 'lifestyle_quiz_lead',
            cta_url: 'https://reage.life/demo-report',
            vars: { name: name || 'друг' },
          },
        })
      }
    } catch (e) {
      console.error('welcome email failed', e)
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
