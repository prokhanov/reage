// Drip admin actions: send test, enrol user, cancel user, run-now (manual trigger)
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'superadmin')
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const action = body?.action as string

    if (action === 'test_send') {
      // body: { step_id, email }
      const { step_id, email } = body
      if (!step_id || !email) {
        return new Response(JSON.stringify({ error: 'step_id and email required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      // Create a temporary schedule row pointing to current user but with test email override stored in skip_reason metadata?
      // Simpler: insert a one-off schedule row for the *current* admin user with send_at=now and immediately invoke processor.
      // But we want it to go to `email`, not the admin's email. So we temporarily upsert a fake profile? No — instead invoke directly.

      // Direct send path: fetch the step, render, enqueue once, log.
      const { data: step } = await admin.from('email_drip_steps').select('*, series:email_drip_series(name)').eq('id', step_id).maybeSingle()
      if (!step) return new Response(JSON.stringify({ error: 'step not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Call drip-process internally with a synthetic profile won't work without DB row.
      // Build minimal email directly here using same template:
      const { marked } = await import('npm:marked@13.0.0')
      const SITE_NAME = 'ReAge'
      const SENDER_DOMAIN = 'notify.reage.life'
      const FROM_ADDRESS = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`
      const APP_URL = 'https://reage.life'
      const fakeUnsub = `${APP_URL}/unsubscribe?token=test`
      const sample = {
        first_name: 'Тест',
        name: 'Тест Тестов',
        email,
        dashboard_url: `${APP_URL}/dashboard`,
        unsubscribe_url: fakeUnsub,
      }
      const fill = (s: string) => (s || '')
        .replaceAll('{{first_name}}', sample.first_name)
        .replaceAll('{{name}}', sample.name)
        .replaceAll('{{email}}', sample.email)
        .replaceAll('{{dashboard_url}}', sample.dashboard_url)
        .replaceAll('{{unsubscribe_url}}', fakeUnsub)
        .replaceAll('{{unsubscribe_all_url}}', fakeUnsub)
        .replaceAll('{{site_url}}', APP_URL)
      const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
      const subject = `[ТЕСТ] ${fill(step.subject)}`
      const ctaLabel = step.cta_label ? fill(step.cta_label) : null
      const ctaUrl = step.cta_url ? fill(step.cta_url) : null
      const bodyHtml = await marked.parse(fill(step.body_markdown || ''), { breaks: true, gfm: true })
      const ctaBlock = ctaLabel && ctaUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;"><tr><td><a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;font-family:Arial,sans-serif;">${esc(ctaLabel)}</a></td></tr></table>`
        : ''
      const preheader = step.preheader ? fill(step.preheader) : null
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 32px 8px 32px;"><div style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${SITE_NAME}</div></td></tr>
  <tr><td style="padding:8px 32px 24px 32px;font-size:15px;line-height:1.65;color:#1f2937;"><div style="font-size:13px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:10px 14px;border-radius:8px;margin-bottom:18px;">⚠ Это тестовое письмо. Реальные ссылки отписки в нём не работают.</div>${bodyHtml}${ctaBlock}</td></tr>
  <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;">Тестовая отправка из админки ${SITE_NAME}.</td></tr>
</table></td></tr></table></body></html>`
      const text = fill(step.body_markdown || '')

      const messageId = crypto.randomUUID()
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: `drip-test:${step_id}`,
        recipient_email: email,
        status: 'pending',
        metadata: { is_test: true, drip_step_id: step_id, sent_by: user.id },
      })

      const { error: enqErr } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: email,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: `drip-test-${step_id}`,
          queued_at: new Date().toISOString(),
        },
      })
      if (enqErr) {
        return new Response(JSON.stringify({ error: enqErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true, message_id: messageId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'enroll_user') {
      // body: { user_id, series_id }
      const { user_id, series_id } = body
      const { data, error } = await admin.rpc('enroll_user_in_series', { p_user_id: user_id, p_series_id: series_id, p_base_time: new Date().toISOString() })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, enrolled_steps: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'cancel_user_series') {
      const { user_id, series_id } = body
      const { error } = await admin.from('email_drip_schedule')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', user_id).eq('series_id', series_id).eq('status', 'pending')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'reset_user_series') {
      // Delete schedule rows so user can be re-enrolled fresh
      const { user_id, series_id } = body
      const { error } = await admin.from('email_drip_schedule').delete().eq('user_id', user_id).eq('series_id', series_id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'enroll_all_existing') {
      // For a series, enroll every patient who doesn't already have a row for any step of the series
      const { series_id } = body
      const { data: patients } = await admin.rpc('has_role', { _user_id: '00000000-0000-0000-0000-000000000000', _role: 'patient' })
      // simpler: get all profiles that have patient role
      const { data: patientRoleRows } = await admin.from('user_roles').select('user_id').eq('role', 'patient')
      const userIds = (patientRoleRows ?? []).map((r: any) => r.user_id)
      let enrolled = 0
      for (const uid of userIds) {
        const { data: existing } = await admin.from('email_drip_schedule').select('id').eq('user_id', uid).eq('series_id', series_id).limit(1)
        if (existing && existing.length > 0) continue
        await admin.rpc('enroll_user_in_series', { p_user_id: uid, p_series_id: series_id, p_base_time: new Date().toISOString() })
        enrolled++
      }
      return new Response(JSON.stringify({ success: true, enrolled_users: enrolled }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('drip-admin error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
