import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const FEEDBACK_SCHEMA = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  email: z.string().trim().email('Укажите корректный email').max(255, 'Email слишком длинный').toLowerCase(),
  phone: z.string().trim().max(32, 'Телефон слишком длинный').optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Введите сообщение').max(2000, 'Сообщение слишком длинное'),
  type: z.enum(['feedback', 'example_report', 'consultation']).optional().default('feedback'),
})

async function sendTelegramFeedbackNotification(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  payload: { name: string; email: string; phone?: string; message: string },
): Promise<boolean> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('telegram_notification_settings')
      .select('is_active, internal_secret, enabled_events')
      .eq('singleton', true)
      .maybeSingle()

    if (settingsError || !settings?.is_active || !settings.internal_secret) {
      console.error('Telegram settings unavailable for feedback notification', { settingsError })
      return false
    }

    if ((settings.enabled_events ?? {}).feedback_received !== true) {
      console.warn('Telegram feedback notification is disabled')
      return false
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': settings.internal_secret,
      },
      body: JSON.stringify({
        event_type: 'feedback_received',
        payload,
      }),
    })

    const responseText = await response.text()
    let responseJson: Record<string, unknown> | null = null
    try {
      responseJson = responseText ? JSON.parse(responseText) : null
    } catch {
      responseJson = null
    }

    if (!response.ok || responseJson?.ok === false) {
      console.error('Telegram feedback notification failed', {
        status: response.status,
        response: responseText.slice(0, 500),
      })
      return false
    }

    return true
  } catch (err) {
    console.error('Telegram feedback notification failed unexpectedly', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const parsed = FEEDBACK_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { name, email, message, type } = parsed.data
  const phone = parsed.data.phone?.trim() || undefined

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const idempotencyKey = `feedback-${email}-${Date.now().toString(36)}`

    const telegramPromise = sendTelegramFeedbackNotification(supabase, supabaseUrl, {
      name,
      email,
      phone,
      message,
    })

    const teamEmailPromise = supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'feedback-notification',
        recipientEmail: 'team@reage.life',
        idempotencyKey,
        templateData: { name, email, phone: phone ?? '—', message, siteName: 'ReAge' },
      },
    })

    // For "Прислать пример отчёта" — also email the client with a demo-report link.
    // Fire-and-forget through waitUntil to avoid blocking the response on a cold start.
    if (type === 'example_report') {
      const clientEmailTask = supabase.functions
        .invoke('send-analysis-booking-email', {
          body: {
            recipient_email: email,
            template_type: 'example_report_landing',
            cta_url: 'https://reage.life/demo-report',
            vars: { name },
            idempotency_key: `example-report-${email}-${new Date().toISOString().slice(0, 10)}`,
          },
        })
        .then((res) => {
          if (res.error || (res.data as any)?.error) {
            console.error('Failed to send example-report email to client', { error: res.error, data: res.data })
          }
        })
        .catch((err) => {
          console.error('Failed to invoke example-report email', err)
        })
      // @ts-ignore — EdgeRuntime is available in Supabase Edge Runtime
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(clientEmailTask)
      }
    }

    const [teamRes, telegramSent] = await Promise.all([teamEmailPromise, telegramPromise])

    const teamEmailQueued = !teamRes.error && (teamRes.data as any)?.success === true

    if (!teamEmailQueued) {
      console.error('Failed to send feedback email to team', { error: teamRes.error, data: teamRes.data, telegramSent })
    }

    if (!teamEmailQueued && !telegramSent) {
      return new Response(JSON.stringify({ error: 'Не удалось отправить сообщение. Попробуйте позже.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!telegramSent) {
      console.error('Feedback accepted but Telegram notification was not delivered')
    }


    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error in send-feedback', err)
    return new Response(JSON.stringify({ error: 'Не удалось отправить сообщение. Попробуйте позже.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
