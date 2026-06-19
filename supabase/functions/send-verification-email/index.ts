import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'reage'
const ROOT_DOMAIN = 'reage.life'
const SENDER_DOMAIN = 'notify.reage.life'
const FROM_DOMAIN = 'notify.reage.life'
const APP_URL = 'https://reage.life'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const targetEmail: string = (body?.email || user.email || '').toString().trim().toLowerCase()
    const targetUserId: string = body?.userId || user.id

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authorization: own email OR admin
    if (targetUserId !== user.id) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles').select('role').eq('user_id', user.id)
      const isAdmin = roles?.some(r => r.role === 'superadmin' || r.role === 'admin')
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Invalidate previous active tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .is('used_at', null)

    // Create new token
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({ user_id: targetUserId, email: targetEmail })
      .select('token')
      .single()
    if (tokenErr || !tokenRow) {
      console.error('token insert failed', tokenErr)
      return new Response(JSON.stringify({ error: 'Could not create token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const verifyUrl = `${APP_URL}/verify-email?token=${tokenRow.token}`

    // Fetch custom template copy (admin "Подтвердите ваш email")
    const { data: tpl } = await supabaseAdmin
      .from('email_templates')
      .select('subject, heading, body_text, button_label, footer_text')
      .eq('template_type', 'signup')
      .maybeSingle()

    // Fetch sender settings
    const { data: senderRow } = await supabaseAdmin
      .from('email_sender_settings')
      .select('sender_name, sender_email, sender_domain')
      .limit(1).maybeSingle()
    const senderName = senderRow?.sender_name || SITE_NAME
    const senderEmail = senderRow?.sender_email || 'noreply'
    const senderDomain = senderRow?.sender_domain || FROM_DOMAIN

    const props: Record<string, string> = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: targetEmail,
      confirmationUrl: verifyUrl,
    }
    if (tpl?.heading) props.customHeading = tpl.heading
    if (tpl?.body_text) props.customBodyText = tpl.body_text
    if (tpl?.button_label) props.customButtonLabel = tpl.button_label
    if (tpl?.footer_text) props.customFooterText = tpl.footer_text

    const subject = tpl?.subject || 'Подтвердите ваш email'
    const html = await renderAsync(React.createElement(SignupEmail, props))
    const text = await renderAsync(React.createElement(SignupEmail, props), { plainText: true })

    const messageId = crypto.randomUUID()
    const runId = crypto.randomUUID()

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup',
      recipient_email: targetEmail,
      status: 'pending',
      metadata: { source: 'send-verification-email' },
    })

    const fromAddress = `${senderName} <${senderEmail}@${senderDomain}>`

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        run_id: runId,
        message_id: messageId,
        to: targetEmail,
        from: fromAddress,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: 'signup',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('enqueue failed', enqueueError)
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'signup',
        recipient_email: targetEmail,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-verification-email error', error)
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
