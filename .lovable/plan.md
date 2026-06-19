## Что чиним

1. Письмо «Подтвердите email» не приходит — `auto_confirm_email=true`, Supabase сам confirm-письмо не шлёт и `auth-email-hook` не дёргает.
2. Welcome идёт до 5 минут — сидит в drip-кроне `*/5 минут`.

`auto_confirm_email` оставляем `true` (модель: сессия активна, email ещё не подтверждён — это ок).

Шаблоны/админка/таблицы НЕ трогаем. Никаких миграций.

---

## 1. Отправляем «Подтвердите email» сами через admin API

Идея: после регистрации руками просим Supabase сгенерить magiclink на этот email и отправляем письмо через тот же `auth-email-hook`, что уже есть. Токен генерит Supabase (его же auth.flow_state), своя таблица не нужна. Используем существующий настраиваемый шаблон `template_type='signup'`.

### Edge function `send-email-verification` (новая)

- Проверяет JWT (own email) или service_role-вызов с `user_id/email`.
- Через `supabase.auth.admin.generateLink({ type: 'magiclink', email })` получает `action_link` (ссылка содержит безопасный токен Supabase, валидируется самим Supabase).
- Кладёт письмо в очередь `transactional_emails` через `enqueue_email` с payload:
  ```json
  {
    "template_type": "signup",
    "recipient": "...",
    "vars": { "confirmationUrl": "<action_link>", "siteName": "ReAge", "siteUrl": "..." }
  }
  ```
- Письмо рендерится тем же `_shared/email-templates/signup.tsx`, что и сейчас (его текст уже берётся из БД-шаблона админки).

Альтернатива (если проще): `process-email-queue` уже умеет рендерить templates по `template_type` — повторно используем его, добавив для transactional очереди ветку «type=signup из админ-шаблона». Если эта ветка уже есть в коде — просто дёргаем её. Если нет — отдельный путь рендера прямо в `send-email-verification` (импорт того же шаблона из `_shared/email-templates/signup.tsx`).

### Триггеры вызова

- `src/pages/Register.tsx`: после успешного `supabase.auth.signUp` → `supabase.functions.invoke('send-email-verification')`. Без ожидания (fire-and-forget с `.catch(log)`). Идёт через 5-сек очередь → у юзера в инбоксе ~10 сек.
- `src/pages/Profile.tsx` (кнопка «Отправить ещё раз», если есть UI): тот же invoke.
- `resend-confirmation` упрощаем: внутри вызывает `send-email-verification` (single source of truth, чтобы не плодить дубли).

### Подтверждение

Когда юзер кликает magiclink → Supabase сам валидирует токен и логинит. `useEmailVerificationHandler` уже умеет на SIGNED_IN + `type=signup|magiclink` в hash проставить `profiles.email_verified = true` — оставляем как есть.

Если хочется, чтобы письмо называлось «Подтвердите email», а не «Войти» — admin-шаблон `signup` уже именно так и сконфигурирован, его и используем (не `magiclink`).

---

## 2. Welcome быстрее

Welcome — это реакция на конкретное событие «регистрация», а не drip. Уносим из drip-цепочки:

- В БД (через insert-tool, без миграции): `UPDATE email_drip_steps SET is_active=false WHERE series_id='f68e21a2-…' AND order_index=1` (это нынешний welcome).
- В `src/pages/Register.tsx` после `signUp` добавляем второй invoke: `send-transactional-email` с `templateName='welcome'`, `idempotencyKey='welcome-'+userId`.
- Остальные шаги drip-серии (отложенные) остаются — для них 5-минутный крон не критичен.

---

## Что НЕ трогаем

- `auto_confirm_email` = `true`.
- `email_templates` (админ-шаблоны), `email_sender_settings`.
- `auth-email-hook`, его шаблоны и роутинг.
- Drip-инфраструктура, кроме одного шага welcome.
- `process-email-queue` schedule (и так 5 сек).
- Никаких новых таблиц.

## Технические заметки

- В `email_send_log` пойдёт новый `template_name='email-verification'` (или мы сохраним `signup` для консистентности с auth-email-hook — финально решим при имплементации). Фильтры в /admin/email-settings подхватятся автоматически.
- Если `admin.generateLink` упадёт с ошибкой «user already confirmed» — фолбэк на `type: 'magiclink'` (тот же поток, но с шаблоном `signup` по нашему выбору рендера).
- Никаких новых secret-ов — `SUPABASE_SERVICE_ROLE_KEY` уже доступен в edge functions.
