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
const FROM_ADDRESS = `Команда ReAge <hello@${SENDER_DOMAIN}>`
const REPLY_TO = `hello@${SENDER_DOMAIN}`
const COMPANY_LEGAL = 'ООО «РеЭйдж», Москва'
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
  const { preheader, bodyHtml, ctaLabel, ctaUrl, unsubscribeSeriesUrl, unsubscribeAllUrl } = opts
  const ctaBlock = ctaLabel && ctaUrl
    ? `<p style="margin:20px 0;"><a href="${ctaUrl}" style="color:#0f172a;">${escapeHtml(ctaLabel)}</a></p>`
    : ''
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${SITE_NAME}</title></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ''}
<div style="max-width:560px;margin:0 auto;">
${bodyHtml}
${ctaBlock}
<p style="margin-top:28px;color:#6b7280;font-size:12px;line-height:1.6;">
${SITE_NAME}, ${ROOT_DOMAIN}<br>
${COMPANY_LEGAL}
</p>

</div>
</body></html>`
}



function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function markdownToPlainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')   // links
    .replace(/\*\*(.+?)\*\*/g, '$1')                   // bold **
    .replace(/__(.+?)__/g, '$1')                       // bold __
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')        // italic *
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2')          // italic _
    .replace(/^#{1,6}\s+/gm, '')                       // headings
    .replace(/^\s*[-*+]\s+/gm, '• ')                   // bullets
    .replace(/^\s*>\s?/gm, '')                         // blockquotes
    .replace(/`([^`]+)`/g, '$1')                       // inline code
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
    }
    // email_confirmed / email_not_confirmed cancel-conditions намеренно убраны:
    // drip-письма не должны зависеть от факта подтверждения email.
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
    const text = markdownToPlainText(bodyMd) + (ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : '') + `\n\n—\n${SITE_NAME} · ${ROOT_DOMAIN}\n${COMPANY_LEGAL}\nОтписаться: ${unsubscribeSeriesUrl}`

    const messageId = crypto.randomUUID()
    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, profile.email)
    const shortLabel = step.order_index === 1 ? 'welcome' : `drip-${step.order_index}`

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
        reply_to: REPLY_TO,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: shortLabel,
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
