
## 1. Приглашение показывает «Недействительное»

Причина — не инфраструктура и не nginx (`/register-staff` уже в whitelist). Политики RLS на `invite_tokens` разрешают SELECT только `authenticated`. Гость, открывающий ссылку, получает `data=null` → «Недействительное приглашение».

Фикс:
- Новая edge-функция `validate-invite-token` (service role, `verify_jwt=false`): принимает `{ token }`, возвращает `{ ok, invited_email, role_display_name, metadata, expires_at }` либо структурированную ошибку (`not_found | used | expired`).
- В `src/pages/RegisterStaff.tsx` заменить прямой `supabase.from('invite_tokens').select` на `supabase.functions.invoke('validate-invite-token')`. RLS не трогаем.
- Задеплоить функцию.

## 2. Ссылка приглашения не копируется в буфер

`navigator.clipboard.writeText` падает в iframe/некоторых браузерах (NotAllowedError, отсутствие secure context у части превью). Fallback `document.execCommand` отсутствует.

Фикс в `src/components/admin/CreateUserDialog.tsx`:
- Утилита `copyToClipboard(text)`: сначала `navigator.clipboard`, при ошибке — скрытый `<textarea>` + `execCommand('copy')`.
- После успешного создания — не закрывать диалог сразу, а показать шаг «Готово» с полем ввода `readOnly`, содержащим ссылку, и кнопкой «Скопировать» (можно скопировать вручную в любом случае). Toast сообщает результат копирования.

## 3. В ролях не все разделы админки

Enum `admin_module` содержит только 7 значений, а страниц админки больше. Плюс `ADMIN_MODULES` захардкожен в двух файлах и рассинхронизирован с enum (нет `promo_codes`).

Фикс:
- Миграция: `ALTER TYPE admin_module ADD VALUE IF NOT EXISTS ...` для недостающих разделов:
  `subscription_plans`, `payment_gateway`, `email_settings`, `sms_settings`, `telegram_settings`, `lab_locations`, `report_visuals`, `scale_preview`.
- Новый общий модуль `src/lib/adminModules.ts` — единственный источник правды: массив `{ value, label, path }` для всех разделов сайдбара суперадмина, включая уже существующие. Значения совпадают с enum.
- `RoleManagementCard.tsx` и `UserPermissionsDialog.tsx` импортируют список из `adminModules.ts` (локальные `ADMIN_MODULES` удаляются, приведение типов заменяется на `AdminModule`).
- В `AppSidebar`/`AdminModuleRoute` использовать те же `value`/`path`, чтобы новые модули автоматически защищались через `admin_permissions` / `role_permissions`.

## Технические детали

- Edge Function путь: `supabase/functions/validate-invite-token/index.ts`. CORS через `npm:@supabase/supabase-js@2/cors`. Никаких RLS-изменений, никакого anon-доступа к `invite_tokens`.
- Nginx менять не нужно — `/register-staff` в whitelist. Прокси `api.reage.life` не затрагивается (используем существующий `supabase` клиент).
- В код домены не зашиваем.

## Проверка

- Открыть invite-ссылку в инкогнито → форма регистрации, без ошибки.
- «Добавить пользователя» → ссылка копируется или доступна для ручного копирования из диалога.
- Настройки роли/пользователя показывают все ~15 разделов админки, чекбоксы сохраняются, доступ через `AdminModuleRoute` работает.
