## Минимальный фикс

После успешного `supabase.auth.signUp` в `src/pages/Register.tsx` (шаг 1 регистрации) — вызвать существующую edge function `resend-confirmation` для только что созданного email. Внутри она уже умеет: пробует `auth.resend({type:'signup'})`, при auto_confirm падает → фолбэк на `admin.generateLink({type:'magiclink'})` → дальше `auth-email-hook` рендерит письмо по настраиваемому шаблону из админки.

Fire-and-forget с `.catch(console.error)`, чтобы не блокировать переход к шагу 2.

## Welcome быстрее

Один UPDATE через insert-tool: `email_drip_steps.is_active=false` для шага `order_index=1` (id `13fce58f-...`) серии онбординга. Это убирает 5-минутную задержку welcome. Остальные шаги серии (через 2–3 дня) не трогаем.

Если нужно, чтобы welcome всё же приходил сразу — вторым шагом после signUp вызвать `send-transactional-email` с `templateName='welcome'`. Можно сделать в той же правке `Register.tsx`. Скажи, если нужно.

## Что НЕ трогаем

Никаких новых таблиц, функций, шаблонов, миграций. `auto_confirm_email` остаётся `true`.
