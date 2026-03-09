import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail, parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
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

const SITE_NAME = "reage"
const SENDER_DOMAIN = "notify.reage.life"
const ROOT_DOMAIN = "reage.life"
const FROM_DOMAIN = "notify.reage.life"

const SAMPLE_PROJECT_URL = "https://reage.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
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

// Fetch custom template content from DB
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

// Fetch sender settings from DB
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

// Preview endpoint
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dbTemplate = await fetchCustomTemplate(type)
  const customProps = buildCustomProps(dbTemplate)
  const sampleData = { ...(SAMPLE_DATA[type] || {}), ...customProps }
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler
async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: any
  let run_id = ''
  try {
    const verified = await verifyWebhookRequest({
      req,
      secret: apiKey,
      parser: parseEmailWebhookPayload,
    })
    payload = verified.payload
    run_id = payload.run_id
  } catch (error) {
    if (error instanceof WebhookError) {
      switch (error.code) {
        case 'invalid_signature':
        case 'missing_timestamp':
        case 'invalid_timestamp':
        case 'stale_timestamp':
          console.error('Invalid webhook signature', { error: error.message })
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        case 'invalid_payload':
        case 'invalid_json':
          console.error('Invalid webhook payload', { error: error.message })
          return new Response(
            JSON.stringify({ error: 'Invalid webhook payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    }

    console.error('Webhook verification failed', { error })
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!run_id) {
    console.error('Webhook payload missing run_id')
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (payload.version !== '1') {
    console.error('Unsupported payload version', { version: payload.version, run_id })
    return new Response(
      JSON.stringify({ error: `Unsupported payload version: ${payload.version}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let emailType = payload.data.action_type
  console.log('Received auth event', { emailType, email: payload.data.email, run_id })

  // Check if there's a test override for this email (from send-test-email function)
  try {
    const supabase = getSupabaseAdmin()
    if (supabase) {
      const { data: override } = await supabase
        .from('test_email_overrides')
        .select('template_type')
        .eq('email', payload.data.email)
        .maybeSingle()

      if (override?.template_type) {
        console.log(`Test override found: rendering "${override.template_type}" instead of "${emailType}"`)
        emailType = override.template_type
        // Delete the override (one-time use)
        await supabase.from('test_email_overrides').delete().eq('email', payload.data.email)
      }
    }
  } catch (err) {
    console.error('Error checking test override:', err)
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch custom content and sender settings from DB
  const [dbTemplate, senderSettings] = await Promise.all([
    fetchCustomTemplate(emailType),
    fetchSenderSettings(),
  ])
  const customProps = buildCustomProps(dbTemplate)
  const emailSubject = dbTemplate?.subject || DEFAULT_SUBJECTS[emailType] || 'Notification'

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: payload.data.email,
    confirmationUrl: payload.data.url,
    token: payload.data.token,
    email: payload.data.email,
    newEmail: payload.data.new_email,
    ...customProps,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  const callbackUrl = payload.data.callback_url
  if (!callbackUrl) {
    console.error('No callback_url in payload', { run_id })
    return new Response(JSON.stringify({ error: 'Missing callback_url in payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let result: { message_id?: string }
  try {
    result = await sendLovableEmail(
      {
        run_id,
        to: payload.data.email,
        from: `${senderSettings.name} <${senderSettings.email}@${senderSettings.domain}>`,
        sender_domain: SENDER_DOMAIN,
        subject: emailSubject,
        html,
        text,
        purpose: 'transactional',
      },
      { apiKey, sendUrl: callbackUrl }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('Email API error', { error: message, run_id })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Email sent successfully', { message_id: result.message_id, run_id })
  return new Response(
    JSON.stringify({ success: true, message_id: result.message_id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
