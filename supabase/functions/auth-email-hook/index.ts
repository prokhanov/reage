import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const DEFAULT_SUBJECTS: Record<string, string> = {
  signup: 'Подтвердите ваш email',
  invite: 'Вас пригласили в ReAge',
  magiclink: 'Ссылка для входа в ReAge',
  recovery: 'Сброс пароля ReAge',
  email_change: 'Подтвердите смену email в ReAge',
  reauthentication: 'Ваш код подтверждения ReAge',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'reage'
const SENDER_DOMAIN = 'notify.reage.life'
const ROOT_DOMAIN = 'reage.life'
const FROM_DOMAIN = 'notify.reage.life'

const SAMPLE_PROJECT_URL = 'https://reage.lovable.app'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

async function fetchCustomTemplate(templateType: string): Promise<Record<string, string> | null> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, heading, body_text, button_label, footer_text')
      .eq('template_type', templateType)
      .maybeSingle()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

async function fetchSenderSettings(): Promise<{ name: string; email: string; domain: string }> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return { name: SITE_NAME, email: 'noreply', domain: FROM_DOMAIN }
    const { data } = await supabase
      .from('email_sender_settings')
      .select('sender_name, sender_email, sender_domain')
      .limit(1)
      .maybeSingle()
    if (data) {
      return {
        name: data.sender_name || SITE_NAME,
        email: data.sender_email || 'noreply',
        domain: data.sender_domain || FROM_DOMAIN,
      }
    }
  } catch {}
  return { name: SITE_NAME, email: 'noreply', domain: FROM_DOMAIN }
}

function buildCustomProps(dbTemplate: Record<string, string> | null): Record<string, string> {
  if (!dbTemplate) return {}
  return {
    customHeading: dbTemplate.heading,
    customBodyText: dbTemplate.body_text,
    ...(dbTemplate.button_label ? { customButtonLabel: dbTemplate.button_label } : {}),
    customFooterText: dbTemplate.footer_text,
  }
}

async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: previewCorsHeaders })

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400, headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dbTemplate = await fetchCustomTemplate(type)
  const customProps = buildCustomProps(dbTemplate)
  const sampleData = { ...(SAMPLE_DATA[type] || {}), ...customProps }
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200, headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: any
  let run_id = ''
  try {
    const verified = await verifyWebhookRequest({ req, secret: apiKey, parser: parseEmailWebhookPayload })
    payload = verified.payload
    run_id = payload.run_id
  } catch (error) {
    if (error instanceof WebhookError) {
      switch (error.code) {
        case 'invalid_signature':
        case 'missing_timestamp':
        case 'invalid_timestamp':
        case 'stale_timestamp':
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        case 'invalid_payload':
        case 'invalid_json':
          return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
      }
    }
    console.error('Webhook verification failed', { error })
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!run_id || payload.version !== '1') {
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let emailType = payload.data.action_type
  console.log('Received auth event', { emailType, email: payload.data.email, run_id })

  const supabaseAdmin = getSupabaseAdmin()

  // Test override (one-time): renders the requested template instead
  let isTest = false
  if (supabaseAdmin) {
    try {
      const { data: override } = await supabaseAdmin
        .from('test_email_overrides')
        .select('template_type')
        .eq('email', payload.data.email)
        .maybeSingle()
      if (override?.template_type) {
        emailType = override.template_type
        isTest = true
        await supabaseAdmin.from('test_email_overrides').delete().eq('email', payload.data.email)
      }
    } catch (err) {
      console.error('Error checking test override:', err)
    }
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const [dbTemplate, senderSettings] = await Promise.all([
    fetchCustomTemplate(emailType),
    fetchSenderSettings(),
  ])
  const customProps = buildCustomProps(dbTemplate)
  const subject = dbTemplate?.subject || DEFAULT_SUBJECTS[emailType] || 'Notification'

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: payload.data.email,
    confirmationUrl: payload.data.url,
    token: payload.data.token,
    email: payload.data.email,
    oldEmail: payload.data.old_email,
    newEmail: payload.data.new_email,
    ...customProps,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Supabase admin not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const messageId = crypto.randomUUID()

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: payload.data.email,
    status: 'pending',
    metadata: { is_test: isTest },
  })

  const fromAddress = `${senderSettings.name} <${senderSettings.email}@${senderSettings.domain}>`

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id,
      message_id: messageId,
      to: payload.data.email,
      from: fromAddress,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, run_id, emailType })
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: payload.data.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, email: payload.data.email, run_id })
  return new Response(JSON.stringify({ success: true, queued: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (url.pathname.endsWith('/preview')) return handlePreview(req)
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
