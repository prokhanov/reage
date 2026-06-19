import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_HOME = 'https://reage.life'
const APP_LOGIN = 'https://reage.life/login'
const BRAND = 'reAge'

type Status = 'success' | 'expired' | 'already_used' | 'not_found' | 'invalid' | 'error'

function renderPage(status: Status, email?: string): string {
  const palette = {
    bg: '#0b0d12',
    card: '#13161d',
    border: '#23272f',
    text: '#e8eaed',
    muted: '#9aa0a6',
    accent: '#7c5cff',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  }

  const variants: Record<Status, { title: string; desc: string; icon: string; iconColor: string; cta: string; ctaHref: string }> = {
    success: {
      title: 'Email подтверждён',
      desc: email
        ? `Адрес <b>${email}</b> успешно подтверждён. Теперь вы можете пользоваться всеми возможностями ${BRAND}.`
        : `Адрес успешно подтверждён. Теперь вы можете пользоваться всеми возможностями ${BRAND}.`,
      icon: '✓',
      iconColor: palette.success,
      cta: 'Войти в личный кабинет',
      ctaHref: APP_LOGIN,
    },
    already_used: {
      title: 'Email уже подтверждён',
      desc: email
        ? `Адрес <b>${email}</b> был подтверждён ранее. Можно сразу войти в личный кабинет.`
        : 'Этот адрес был подтверждён ранее. Можно сразу войти в личный кабинет.',
      icon: '✓',
      iconColor: palette.success,
      cta: 'Войти в личный кабинет',
      ctaHref: APP_LOGIN,
    },
    expired: {
      title: 'Ссылка истекла',
      desc: 'Срок действия ссылки подтверждения закончился. Войдите в личный кабинет — там можно запросить новое письмо.',
      icon: '⏱',
      iconColor: palette.warning,
      cta: 'Перейти ко входу',
      ctaHref: APP_LOGIN,
    },
    not_found: {
      title: 'Ссылка недействительна',
      desc: 'Мы не нашли такой токен подтверждения. Возможно, он уже был аннулирован новым письмом.',
      icon: '!',
      iconColor: palette.danger,
      cta: 'На главную',
      ctaHref: APP_HOME,
    },
    invalid: {
      title: 'Некорректная ссылка',
      desc: 'Похоже, ссылка повреждена. Запросите новое письмо подтверждения в личном кабинете.',
      icon: '!',
      iconColor: palette.danger,
      cta: 'Перейти ко входу',
      ctaHref: APP_LOGIN,
    },
    error: {
      title: 'Что-то пошло не так',
      desc: 'Не удалось подтвердить email. Попробуйте ещё раз чуть позже или запросите новое письмо.',
      icon: '!',
      iconColor: palette.danger,
      cta: 'На главную',
      ctaHref: APP_HOME,
    },
  }

  const v = variants[status]

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${v.title} — ${BRAND}</title>
<meta name="robots" content="noindex,nofollow" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background: ${palette.bg};
    color: ${palette.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 460px;
    background: ${palette.card};
    border: 1px solid ${palette.border};
    border-radius: 16px;
    padding: 40px 32px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  }
  .brand {
    font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;
    color: ${palette.muted}; margin-bottom: 28px;
  }
  .icon {
    width: 72px; height: 72px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 36px; font-weight: 700; line-height: 1;
    color: ${v.iconColor};
    background: ${v.iconColor}1a;
    margin-bottom: 20px;
  }
  h1 { font-size: 22px; margin: 0 0 12px; font-weight: 600; }
  p { color: ${palette.muted}; line-height: 1.55; margin: 0 0 28px; font-size: 15px; }
  p b { color: ${palette.text}; font-weight: 500; }
  .cta {
    display: inline-block;
    background: ${palette.accent}; color: #fff; text-decoration: none;
    padding: 12px 22px; border-radius: 10px; font-weight: 500; font-size: 15px;
    transition: opacity .15s;
  }
  .cta:hover { opacity: 0.9; }
  .footer { margin-top: 24px; font-size: 12px; color: ${palette.muted}; }
  .footer a { color: ${palette.muted}; text-decoration: underline; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">${BRAND}</div>
    <div class="icon">${v.icon}</div>
    <h1>${v.title}</h1>
    <p>${v.desc}</p>
    <a class="cta" href="${v.ctaHref}">${v.cta}</a>
    <div class="footer"><a href="${APP_HOME}">${APP_HOME.replace(/^https?:\/\//, '')}</a></div>
  </div>
</body>
</html>`
}

function htmlResponse(status: Status, email?: string): Response {
  return new Response(renderPage(status, email), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function processToken(token: string): Promise<{ status: Status; email?: string }> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return { status: 'invalid' }
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: row, error } = await supabaseAdmin
    .from('email_verification_tokens')
    .select('token, user_id, email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('token lookup failed', error)
    return { status: 'error' }
  }
  if (!row) return { status: 'not_found' }
  if (row.used_at) return { status: 'already_used', email: row.email }
  if (new Date(row.expires_at).getTime() < Date.now()) return { status: 'expired', email: row.email }

  const { error: profErr } = await supabaseAdmin
    .from('profiles')
    .update({ email_verified: true })
    .eq('id', row.user_id)
  if (profErr) {
    console.error('profile update failed', profErr)
    return { status: 'error' }
  }

  await supabaseAdmin
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  return { status: 'success', email: row.email }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // GET: ссылка из письма — отдаём HTML-страницу
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const token = (url.searchParams.get('token') || '').trim()
      const result = await processToken(token)
      return htmlResponse(result.status, result.email)
    }

    // POST: обратная совместимость с SPA-страницей
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const token: string = (body?.token || '').toString().trim()
      const result = await processToken(token)

      if (result.status === 'success') {
        return jsonResponse({ success: true, email: result.email })
      }
      const httpStatus =
        result.status === 'invalid' ? 400 :
        result.status === 'not_found' ? 404 :
        result.status === 'already_used' || result.status === 'expired' ? 410 : 500
      return jsonResponse({ error: result.status, email: result.email }, httpStatus)
    }

    return jsonResponse({ error: 'method_not_allowed' }, 405)
  } catch (error: any) {
    console.error('confirm-email-token error', error)
    if (req.method === 'GET') return htmlResponse('error')
    return jsonResponse({ error: error?.message || 'Unknown' }, 500)
  }
})
