## Правило (сохраню в постоянную память проекта в build-режиме)

**НИКОГДА не включать `auto_confirm_email = true`.** При регистрации Supabase должен отправлять письмо подтверждения email через `auth-email-hook` (домен `notify.reage.life`). При этом подтверждение email **не блокирует** вход и работу в личном кабинете — пользователь полноценно пользуется приложением даже с `email_verified = false`. Если упираемся в `429 email rate limit exceeded`, чиним через активацию/передеплой `auth-email-hook` (он снимает встроенный SMTP rate limit), а не через `auto_confirm_email`.

Это правило запишу в `mem://auth/email-confirmation-policy.md` и добавлю строкой в Core блок `mem://index.md`.

## Что сделаю по текущей проблеме

1. Выключу авто-подтверждение: `supabase--configure_auth` с `auto_confirm_email: false`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true`.
2. Передеплою `auth-email-hook` — это триггерит сверку конфигурации хука в GoTrue и снимает встроенный SMTP rate limit.
3. Проверю фронт: убедиться, что после `supabase.auth.signUp` пользователь сразу залогинен и пускается в ЛК независимо от `email_confirmed_at` (никаких `if (!session.user.email_confirmed_at) redirect`). Если такая блокировка есть — уберу её, оставлю только мягкий баннер «Подтвердите email».
4. Проверю результат:
   - `auth_logs` — должно быть `user_confirmation_requested` без 429,
   - `email_send_log` — строка `template_name = signup`, статус `sent`,
   - регистрация нового юзера действительно пускает в ЛК до клика по ссылке.

## План Б, если 429 повторится

Хук не активирован на стороне Auth. Тогда:
- `email_domain--scaffold_auth_email_templates` с `confirm_overwrite: true` (брендинг шаблонов сохраню),
- `supabase--deploy_edge_functions` для `auth-email-hook`,
- перепроверю логи.

## Что НЕ трогаю

- DNS — работает.
- Шаблоны писем — не меняю (только при плане Б).
- Бизнес-логику ЛК — только проверка/снятие жёсткой блокировки по `email_confirmed_at`, если найдётся.
