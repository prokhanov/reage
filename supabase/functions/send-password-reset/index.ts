import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'reage'
const ROOT_DOMAIN = 'reage.life'
const SENDER_DOMAIN = 'notify.reage.life'
const FROM_DOMAIN = 'notify.reage.life'
const APP_URL = Deno.env.get('APP_URL') || 'https://reage.life'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const email: string = (body?.email || '').toString().trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Lookup user by email
    let userId: string | null = null
    let page = 1
    while (page <= 20 && !userId) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      const match = data.users.find(u => (u.email || '').toLowerCase() === email)
      if (match) { userId = match.id; break }
      if (data.users.length < 200) break
      page++
    }

    // Always return success to avoid email enumeration
    if (!userId) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invalidate previous active tokens
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('used_at', null)

    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({ user_id: userId, email })
      .select('token')
      .single()
    if (tokenErr || !tokenRow) {
      console.error('reset token insert failed', tokenErr)
      return new Response(JSON.stringify({ error: 'token_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Root URL — обходим проблему с api.reage.life/auth/v1/verify
    const resetUrl = `${APP_URL}/?password_reset_token=${tokenRow.token}`

    // Custom template copy (если задана через админку)
    const { data: tpl } = await supabaseAdmin
      .from('email_templates')
      .select('subject, heading, body_text, button_label, footer_text')
      .eq('template_type', 'recovery')
      .maybeSingle()

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
      recipient: email,
      confirmationUrl: resetUrl,
    }
    if (tpl?.heading) (props as any).customHeading = tpl.heading
    if (tpl?.body_text) (props as any).customBodyText = tpl.body_text
    if (tpl?.button_label) (props as any).customButtonLabel = tpl.button_label
    if (tpl?.footer_text) (props as any).customFooterText = tpl.footer_text

    const subject = tpl?.subject || 'Сброс пароля'
    const html = await renderAsync(React.createElement(RecoveryEmail, props as any))
    const text = await renderAsync(React.createElement(RecoveryEmail, props as any), { plainText: true })

    const messageId = crypto.randomUUID()
    const idempotencyKey = `password-reset:${userId}:${tokenRow.token}`

    // Unsubscribe token (требуется sender'ом)
    let unsubscribeToken: string
    const { data: existingUnsub } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token').eq('email', email).maybeSingle()
    if (existingUnsub?.token) {
      unsubscribeToken = existingUnsub.token
    } else {
      const newToken = crypto.randomUUID()
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .insert({ email, token: newToken })
        .select('token').single()
      if (insErr) {
        const { data: fallback } = await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .select('token').eq('email', email).maybeSingle()
        unsubscribeToken = fallback?.token || newToken
      } else {
        unsubscribeToken = inserted.token
      }
    }

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'recovery',
      recipient_email: email,
      status: 'pending',
      metadata: { source: 'send-password-reset' },
    })

    const fromAddress = `${senderName} <${senderEmail}@${senderDomain}>`

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: idempotencyKey,
        to: email,
        from: fromAddress,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: 'recovery',
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('enqueue failed', enqueueError)
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: email,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return new Response(JSON.stringify({ error: 'enqueue_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-password-reset error', error)
    return new Response(JSON.stringify({ error: error?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
