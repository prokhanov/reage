// Drip email processor — runs every 5 minutes via pg_cron
// Picks pending scheduled emails, checks unsubscribes & cancel conditions,
// renders Markdown to HTML, and enqueues into transactional_emails queue.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { marked } from 'npm:marked@13.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'ReAge'
const ROOT_DOMAIN = 'reage.life'
const SENDER_DOMAIN = 'notify.reage.life'
const FROM_ADDRESS = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`
const APP_URL = 'https://reage.life'
const FUNCTIONS_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1`

interface ProfileRow {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  name: string | null
}

function renderEmailHtml(opts: {
  subject: string
  preheader?: string | null
  bodyHtml: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  unsubscribeSeriesUrl: string
  unsubscribeAllUrl: string
}) {
  const { subject, preheader, bodyHtml, ctaLabel, ctaUrl, unsubscribeSeriesUrl, unsubscribeAllUrl } = opts
  const ctaBlock = ctaLabel && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;"><tr><td><a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;font-family:Arial,sans-serif;">${escapeHtml(ctaLabel)}</a></td></tr></table>`
    : ''
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px 32px;text-align:left;">
        <div style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${SITE_NAME}</div>
      </td></tr>
      <tr><td style="padding:8px 32px 24px 32px;font-size:16px;line-height:1.6;color:#1f2937;">
        <div style="font-size:15px;line-height:1.65;">${bodyHtml}</div>
        ${ctaBlock}
      </td></tr>
      <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;font-family:Arial,sans-serif;">
        ${SITE_NAME} · ${ROOT_DOMAIN}
      </td></tr>

    </table>
    <div style="max-width:560px;margin-top:14px;font-size:11px;color:#9ca3af;text-align:center;font-family:Arial,sans-serif;">
      ${SITE_NAME} · ${ROOT_DOMAIN}
    </div>
  </td></tr>
</table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function fillPlaceholders(text: string, profile: ProfileRow, urls: { dashboard: string; unsubscribeSeries: string; unsubscribeAll: string }): string {
  const firstName = profile.first_name || (profile.name ? profile.name.split(' ')[0] : '') || ''
  return text
    .replaceAll('{{first_name}}', firstName)
    .replaceAll('{{last_name}}', profile.last_name || '')
    .replaceAll('{{name}}', profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '')
    .replaceAll('{{email}}', profile.email || '')
    .replaceAll('{{dashboard_url}}', urls.dashboard)
    .replaceAll('{{unsubscribe_url}}', urls.unsubscribeSeries)
    .replaceAll('{{unsubscribe_all_url}}', urls.unsubscribeAll)
    .replaceAll('{{site_url}}', APP_URL)
}

async function makeUnsubscribeToken(email: string, scope: string, secret: string): Promise<string> {
  const payload = `${email}|${scope}|${Math.floor(Date.now() / 1000)}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payloadB64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${payloadB64}.${sigB64}`
}

async function getOrCreateUnsubscribeToken(supabase: any, email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing?.token) return existing.token

  const token = crypto.randomUUID()
  const { data: inserted, error } = await supabase
    .from('email_unsubscribe_tokens')
    .insert({ email: normalizedEmail, token })
    .select('token')
    .single()

  if (error) {
    const { data: fallback } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (fallback?.token) return fallback.token
    throw error
  }

  return inserted.token
}

async function checkCancelConditions(supabase: any, userId: string, conditions: any[]): Promise<string | null> {
  if (!Array.isArray(conditions) || conditions.length === 0) return null
  for (const cond of conditions) {
    const t = cond?.type
    if (t === 'has_active_subscription') {
      const { data } = await supabase.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').limit(1)
      if (data && data.length > 0) return 'has_active_subscription'
    } else if (t === 'has_any_analysis') {
      const { data } = await supabase.from('analyses').select('id').eq('user_id', userId).limit(1)
      if (data && data.length > 0) return 'has_any_analysis'
    } else if (t === 'email_confirmed') {
      const { data } = await supabase.rpc('get_users_email_confirmed', { user_ids: [userId] })
      if (data && data[0]?.email_confirmed_at) return 'email_confirmed'
    } else if (t === 'email_not_confirmed') {
      const { data } = await supabase.rpc('get_users_email_confirmed', { user_ids: [userId] })
      if (!data || !data[0]?.email_confirmed_at) return 'email_not_confirmed'
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const unsubSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // reuse as HMAC secret

  // Optional override via body for one-off step send (test/manual)
  let limit = 50
  let testRunIds: string[] | null = null
  try {
    const body = await req.json()
    if (body?.limit) limit = Math.min(200, Math.max(1, Number(body.limit)))
    if (body?.schedule_ids && Array.isArray(body.schedule_ids)) testRunIds = body.schedule_ids
  } catch { /* no body, normal cron */ }

  let query = supabase
    .from('email_drip_schedule')
    .select('id, user_id, series_id, step_id, send_at, attempt')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(limit)

  if (testRunIds) query = supabase.from('email_drip_schedule').select('id, user_id, series_id, step_id, send_at, attempt').in('id', testRunIds)

  const { data: due, error: dueErr } = await query
  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Bulk fetch related rows
  const stepIds = [...new Set(due.map((r) => r.step_id))]
  const seriesIds = [...new Set(due.map((r) => r.series_id))]
  const userIds = [...new Set(due.map((r) => r.user_id))]

  const [{ data: steps }, { data: series }, { data: profiles }] = await Promise.all([
    supabase.from('email_drip_steps').select('*').in('id', stepIds),
    supabase.from('email_drip_series').select('id, name, is_active').in('id', seriesIds),
    supabase.from('profiles').select('id, email, first_name, last_name, name').in('id', userIds),
  ])

  const stepMap = new Map((steps ?? []).map((s: any) => [s.id, s]))
  const seriesMap = new Map((series ?? []).map((s: any) => [s.id, s]))
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p as ProfileRow]))

  let processed = 0
  let skipped = 0
  let failed = 0
  let sent = 0

  for (const row of due) {
    processed++
    const step = stepMap.get(row.step_id)
    const seriesRow = seriesMap.get(row.series_id)
    const profile = profileMap.get(row.user_id)

    const finishSkip = async (reason: string) => {
      skipped++
      await supabase.from('email_drip_schedule').update({ status: 'skipped', skip_reason: reason, updated_at: new Date().toISOString() }).eq('id', row.id)
    }
    const finishFail = async (msg: string) => {
      failed++
      await supabase.from('email_drip_schedule').update({ status: 'failed', error_message: msg.slice(0, 500), attempt: row.attempt + 1, updated_at: new Date().toISOString() }).eq('id', row.id)
    }

    if (!seriesRow || !seriesRow.is_active) { await finishSkip('series_inactive'); continue }
    if (!step || !step.is_active) { await finishSkip('step_inactive'); continue }
    if (!profile || !profile.email) { await finishSkip('no_email'); continue }

    // Check unsubscribes
    const { data: unsub } = await supabase
      .from('email_unsubscribes')
      .select('scope')
      .eq('email', profile.email.toLowerCase())
      .in('scope', [`series:${row.series_id}`, 'all_marketing'])
    if (unsub && unsub.length > 0) { await finishSkip('unsubscribed'); continue }

    // Check suppressed (hard bounce / complaint)
    try {
      const { data: supp } = await supabase.from('suppressed_emails').select('email').eq('email', profile.email.toLowerCase()).limit(1)
      if (supp && supp.length > 0) { await finishSkip('suppressed'); continue }
    } catch { /* table may not exist in some envs */ }

    // Check cancel conditions
    const cancelReason = await checkCancelConditions(supabase, row.user_id, step.cancel_conditions ?? [])
    if (cancelReason) { await finishSkip(`cancel:${cancelReason}`); continue }

    // Build URLs and content
    const seriesToken = await makeUnsubscribeToken(profile.email.toLowerCase(), `series:${row.series_id}`, unsubSecret)
    const allToken = await makeUnsubscribeToken(profile.email.toLowerCase(), 'all_marketing', unsubSecret)
    const unsubscribeSeriesUrl = `${APP_URL}/unsubscribe?token=${encodeURIComponent(seriesToken)}`
    const unsubscribeAllUrl = `${APP_URL}/unsubscribe?token=${encodeURIComponent(allToken)}`
    const dashboardUrl = `${APP_URL}/dashboard`

    const urls = { dashboard: dashboardUrl, unsubscribeSeries: unsubscribeSeriesUrl, unsubscribeAll: unsubscribeAllUrl }

    const subject = fillPlaceholders(step.subject, profile, urls)
    const preheader = step.preheader ? fillPlaceholders(step.preheader, profile, urls) : null
    const ctaLabel = step.cta_label ? fillPlaceholders(step.cta_label, profile, urls) : null
    const ctaUrl = step.cta_url ? fillPlaceholders(step.cta_url, profile, urls) : null
    const bodyMd = fillPlaceholders(step.body_markdown || '', profile, urls)
    const bodyHtml = await marked.parse(bodyMd, { breaks: true, gfm: true })

    const html = renderEmailHtml({ subject, preheader, bodyHtml: bodyHtml as string, ctaLabel, ctaUrl, unsubscribeSeriesUrl, unsubscribeAllUrl })
    const text = bodyMd + (ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : '')

    const messageId = crypto.randomUUID()
    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, profile.email)

    try {
      // Log pending
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: `drip:${row.series_id}:${row.step_id}`,
        recipient_email: profile.email,
        status: 'pending',
        metadata: {
          drip_schedule_id: row.id,
          series_id: row.series_id,
          step_id: row.step_id,
          series_name: seriesRow.name,
          step_order_index: step.order_index,
        },
      })
    } catch { /* logging best-effort */ }

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: messageId,
        to: profile.email,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: `drip:${row.series_id}:${row.step_id}`,
        unsubscribe_token: unsubscribeToken,
        metadata: {
          drip_schedule_id: row.id,
          series_id: row.series_id,
          step_id: row.step_id,
          series_name: seriesRow.name,
          step_order_index: step.order_index,
        },
        queued_at: new Date().toISOString(),
      },
    })

    if (enqErr) {
      await finishFail(`enqueue_failed: ${enqErr.message}`)
      continue
    }

    sent++
    await supabase.from('email_drip_schedule').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      attempt: row.attempt + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
  }

  return new Response(JSON.stringify({ processed, sent, skipped, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
