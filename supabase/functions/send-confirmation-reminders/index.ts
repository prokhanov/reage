// Sends "confirm your email/phone" reminders on a schedule.
// Triggered hourly by pg_cron or manually from admin UI.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'ReAge'
const ROOT_DOMAIN = 'reage.life'
const SENDER_DOMAIN = 'notify.reage.life'
const FROM_ADDRESS = `Команда ReAge <hello@${SENDER_DOMAIN}>`
const REPLY_TO = `hello@${SENDER_DOMAIN}`
const APP_URL = 'https://reage.life'
const COMPANY_LEGAL = 'ООО «РиЭйдж», Москва'

type ReminderType = 'confirm_reminder_email' | 'confirm_reminder_phone' | 'confirm_reminder_both'

interface Settings {
  reminder_type: ReminderType
  enabled: boolean
  first_delay_hours: number
  frequency_hours: number
  max_reminders: number
}

interface Template {
  template_type: string
  subject: string
  heading: string
  body_text: string
  button_label: string | null
  footer_text: string
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function renderHtml(t: Template, ctaUrl: string): string {
  const paragraphs = t.body_text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const cta = t.button_label
    ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="color:#0f172a;text-decoration:underline;">${escapeHtml(t.button_label)}</a></p>`
    : ''
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(t.subject)}</title></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(t.heading)}</h1>
${paragraphs}
${cta}
<p style="margin-top:28px;color:#6b7280;font-size:12px;line-height:1.6;">
${escapeHtml(t.footer_text)}<br>
${SITE_NAME}, ${ROOT_DOMAIN}<br>
${COMPANY_LEGAL}
</p>
</div>
</body></html>`
}

function renderText(t: Template, ctaUrl: string): string {
  return `${t.heading}\n\n${t.body_text}${t.button_label ? `\n\n${t.button_label}: ${ctaUrl}` : ''}\n\n—\n${t.footer_text}\n${SITE_NAME} · ${ROOT_DOMAIN}\n${COMPANY_LEGAL}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Optional dryRun for admin "send now" preview
  let dryRun = false
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      dryRun = !!body?.dryRun
    }
  } catch { /* ignore */ }

  // 1. Load settings and templates
  const [{ data: settingsRows }, { data: templateRows }] = await Promise.all([
    supabase.from('confirmation_reminder_settings').select('*'),
    supabase.from('email_templates').select('*').in('template_type', [
      'confirm_reminder_email',
      'confirm_reminder_phone',
      'confirm_reminder_both',
    ]),
  ])

  const settingsByType = new Map<ReminderType, Settings>()
  for (const s of (settingsRows ?? []) as Settings[]) settingsByType.set(s.reminder_type, s)
  const templateByType = new Map<string, Template>()
  for (const t of (templateRows ?? []) as Template[]) templateByType.set(t.template_type, t)

  // 2. List all auth users (paginated)
  const allUsers: any[] = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    allUsers.push(...data.users)
    if (data.users.length < 200) break
    page++
    if (page > 50) break // hard safety cap (10k users)
  }

  const now = Date.now()
  let candidates = 0
  let enqueued = 0
  let skipped = 0

  for (const u of allUsers) {
    if (!u.email) { skipped++; continue }

    const emailConfirmed = !!u.email_confirmed_at
    const phoneConfirmed = !!u.phone_confirmed_at
    if (emailConfirmed && phoneConfirmed) { skipped++; continue }

    let type: ReminderType
    if (!emailConfirmed && !phoneConfirmed) type = 'confirm_reminder_both'
    else if (!emailConfirmed) type = 'confirm_reminder_email'
    else type = 'confirm_reminder_phone'

    const settings = settingsByType.get(type)
    const template = templateByType.get(type)
    if (!settings || !template || !settings.enabled) { skipped++; continue }

    candidates++

    // 3. Age since registration
    const createdAt = u.created_at ? new Date(u.created_at).getTime() : now
    const hoursSinceCreation = (now - createdAt) / 3_600_000
    if (hoursSinceCreation < settings.first_delay_hours) { skipped++; continue }

    // 4. Sent log for this user + type
    const { data: log } = await supabase
      .from('confirmation_reminder_log')
      .select('sent_at')
      .eq('user_id', u.id)
      .eq('reminder_type', type)
      .order('sent_at', { ascending: false })

    const sentCount = log?.length ?? 0
    if (sentCount >= settings.max_reminders) { skipped++; continue }

    if (sentCount > 0) {
      const lastSent = new Date(log![0].sent_at).getTime()
      const hoursSinceLast = (now - lastSent) / 3_600_000
      if (hoursSinceLast < settings.frequency_hours) { skipped++; continue }
    }

    if (dryRun) { continue }

    // 5. Build email + enqueue
    const ctaUrl = type === 'confirm_reminder_phone' ? `${APP_URL}/profile` : `${APP_URL}/auth`
    const html = renderHtml(template, ctaUrl)
    const text = renderText(template, ctaUrl)
    const messageId = crypto.randomUUID()

    try {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: type,
        recipient_email: u.email,
        status: 'pending',
        metadata: { reminder_type: type, user_id: u.id, attempt: sentCount + 1 },
      })
    } catch { /* best effort */ }

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: `${type}:${u.id}:${sentCount + 1}`,
        to: u.email,
        from: FROM_ADDRESS,
        reply_to: REPLY_TO,
        sender_domain: SENDER_DOMAIN,
        subject: template.subject,
        html,
        text,
        purpose: 'transactional',
        label: type,
        queued_at: new Date().toISOString(),
        metadata: { reminder_type: type, user_id: u.id, attempt: sentCount + 1 },
      },
    })

    if (enqErr) {
      console.error('enqueue failed', enqErr)
      skipped++
      continue
    }

    await supabase.from('confirmation_reminder_log').insert({
      user_id: u.id,
      reminder_type: type,
    })
    enqueued++
  }

  return new Response(
    JSON.stringify({ ok: true, dryRun, total_users: allUsers.length, candidates, enqueued, skipped }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
