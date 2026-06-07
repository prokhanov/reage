// Sends "appointment booking" confirmation emails.
// Can be invoked from app code with patient details, or as a test send from admin UI.

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
const TEMPLATE_TYPE = 'analysis_booking'

interface Template {
  template_type: string
  subject: string
  heading: string
  body_text: string
  button_label: string | null
  footer_text: string
}

interface Vars {
  patient_name?: string
  appointment_date?: string
  appointment_time?: string
  clinic_address?: string
  [key: string]: string | undefined
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function applyVars(text: string, vars: Vars): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
}

function renderHtml(t: Template, vars: Vars, ctaUrl: string): string {
  const heading = applyVars(t.heading, vars)
  const subject = applyVars(t.subject, vars)
  const body = applyVars(t.body_text, vars)
  const footer = applyVars(t.footer_text, vars)
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const cta = t.button_label
    ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(applyVars(t.button_label, vars))}</a></p>`
    : ''
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;">
<h1 style="margin:0 0 16px;font-size:22px;color:#2d1a4e;">${escapeHtml(heading)}</h1>
${paragraphs}
${cta}
<p style="margin-top:28px;color:#6b7280;font-size:12px;line-height:1.6;">
${escapeHtml(footer)}<br>
${SITE_NAME}, ${ROOT_DOMAIN}<br>
${COMPANY_LEGAL}
</p>
</div>
</body></html>`
}

function renderText(t: Template, vars: Vars, ctaUrl: string): string {
  return `${applyVars(t.heading, vars)}\n\n${applyVars(t.body_text, vars)}${t.button_label ? `\n\n${applyVars(t.button_label, vars)}: ${ctaUrl}` : ''}\n\n—\n${applyVars(t.footer_text, vars)}\n${SITE_NAME} · ${ROOT_DOMAIN}\n${COMPANY_LEGAL}`
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json().catch(() => ({}))
    const isTest = !!body.test
    const recipient: string = String(body.recipient_email || body.test_email || '').trim()
    if (!recipient) {
      return new Response(JSON.stringify({ error: 'recipient_email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const vars: Vars = isTest
      ? {
          patient_name: 'Иван Иванов',
          appointment_date: '15 июня 2026',
          appointment_time: '09:30',
          clinic_address: 'г. Москва, ул. Примерная, д. 1',
          ...(body.vars || {}),
        }
      : (body.vars || {})

    const ctaUrl: string = body.cta_url || `${APP_URL}/profile`

    const { data: tpl, error: tplErr } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', TEMPLATE_TYPE)
      .maybeSingle()

    if (tplErr || !tpl) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const template = tpl as Template
    const subject = (isTest ? '[ТЕСТ] ' : '') + applyVars(template.subject, vars)
    const html = renderHtml(template, vars, ctaUrl)
    const text = renderText(template, vars, ctaUrl)
    const messageId = crypto.randomUUID()
    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, recipient)

    try {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: TEMPLATE_TYPE,
        recipient_email: recipient,
        status: 'pending',
        metadata: { test: isTest },
      })
    } catch { /* best effort */ }

    const idempotencyKey = body.idempotency_key
      || (isTest ? `test:${TEMPLATE_TYPE}:${recipient}:${Date.now()}` : `${TEMPLATE_TYPE}:${recipient}:${Date.now()}`)

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: idempotencyKey,
        to: recipient,
        from: FROM_ADDRESS,
        reply_to: REPLY_TO,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: TEMPLATE_TYPE,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
        metadata: { test: isTest, vars },
      },
    })

    if (enqErr) {
      return new Response(JSON.stringify({ error: enqErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, test: isTest, sent_to: recipient }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
