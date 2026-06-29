import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const FEEDBACK_SCHEMA = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  email: z.string().trim().email('Укажите корректный email').max(255, 'Email слишком длинный').toLowerCase(),
  message: z.string().trim().min(1, 'Введите сообщение').max(2000, 'Сообщение слишком длинное'),
})

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

  const { name, email, message } = parsed.data

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const idempotencyKey = `feedback-${email}-${Date.now().toString(36)}`

    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'feedback-notification',
        recipientEmail: 'team@reage.life',
        idempotencyKey,
        templateData: { name, email, message, siteName: 'ReAge' },
      },
    })

    if (error || !data?.success) {
      console.error('Failed to send feedback notification', { error, data })
      return new Response(JSON.stringify({ error: 'Не удалось отправить сообщение. Попробуйте позже.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
