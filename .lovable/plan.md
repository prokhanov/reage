## Цель
В разделе «SMS рассылки → Отправитель» добавить поля для ввода email-аккаунта SMS Aero и API-токена, чтобы при смене аккаунта (новый договор, своя подпись вместо общего номера) можно было переключиться без участия разработчика.

Сейчас `SMSAERO_EMAIL` и `SMSAERO_API_KEY` зашиты в секретах Lovable Cloud и `_shared/smsaero.ts` читает только их. Через интерфейс их менять нельзя.

## Что меняем

### 1. БД: добавляем поля в `sms_sender_settings`
- `api_email text` — email-логин SMS Aero
- `api_key text` — API-ключ (хранится в открытом виде в таблице, доступ только superadmin через RLS)
- `updated_at` уже есть

Доступ к таблице: чтение/запись только у superadmin (как сейчас), service_role — полный.

### 2. Edge-функции: `supabase/functions/_shared/smsaero.ts`
`getCreds()` сначала читает из `sms_sender_settings` (через service-role клиент), при отсутствии — fallback на переменные окружения `SMSAERO_EMAIL` / `SMSAERO_API_KEY`. Это сохранит работу существующих рассылок до того, как админ заполнит поля.

Функция становится `async` — обновим вызовы в:
- `sms-check-connection`
- `sms-send-test`
- `send-booking-sms`
- `phone-otp-send`
- `phone-change-send`

### 3. UI: `src/pages/admin/SmsSettings.tsx`, вкладка «Отправитель»
Над блоком «Подпись» добавляем карточку «Аккаунт SMS Aero»:
- Поле **Email аккаунта** (`api_email`)
- Поле **API-ключ** (`api_key`) — type=password с кнопкой «показать/скрыть»; в поле подгружаются маскированные первые/последние символы, если уже сохранено
- Кнопка **Сохранить** — обновляет строку в `sms_sender_settings`
- Кнопка **Проверить подключение** уже есть — после сохранения сразу видно, работает ли новый аккаунт и баланс

Инструкция «Где взять ключи» остаётся, обновим последний пункт: «Вставьте email и API-ключ в поля выше и нажмите Сохранить».

## Технические детали
- Миграция: `ALTER TABLE public.sms_sender_settings ADD COLUMN api_email text, ADD COLUMN api_key text;` + GRANT остаются прежними.
- Edge-функции используют `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` для чтения настроек (уже импортируется в большинстве sms-функций).
- В `SmsSettings.tsx` расширяем `fetchSender()` чтобы тянуть `api_email, api_key`; добавляем `handleSaveCreds()`.
- API-ключ не логируем и не отправляем в чат/Telegram-уведомления.

## Что НЕ меняем
- `SMSAERO_WEBHOOK_SECRET` остаётся в секретах (это внутренний токен callback, не относится к аккаунту).
- Существующие шаблоны, логи, тестовая отправка — без изменений.