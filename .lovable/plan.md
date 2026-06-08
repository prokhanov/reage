## Цель

Каждое уведомление по записи на анализы (SMS/Email/Telegram) должно иметь свой текст под статус. Шаблоны редактируются в **существующих** админ-разделах:
- `/admin/sms-settings` → вкладка «Шаблоны»
- `/admin/email-settings` → вкладки шаблонов
- `/admin/telegram-settings` → новая подсекция «Шаблоны по статусам»

Отправка — только вручную из карточки записи; шаблон выбирается по текущему статусу записи, либо вручную через сплит-кнопку.

## 4 ключевых статуса и ключи шаблонов

| Статус записи | SMS `name` | Email `template_type` | TG `template_key` |
|---|---|---|---|
| `scheduled` (Назначен) | `booking_scheduled` | `booking_scheduled` | `booking_scheduled` |
| `received` (Получен) | `booking_received` | `booking_received` | `booking_received` |
| `collected` (Обрабатывается) | `booking_collected` | `booking_collected` | `booking_collected` |
| `uploaded` (Загружен) | `booking_uploaded` | `booking_uploaded` | `booking_uploaded` |

Старые `appointment_reminder` (SMS) и `analysis_booking` (Email) остаются как алиасы для совместимости (используются как fallback, если шаблон под статус не найден).

## Изменения по разделам

### 1. SMS — `/admin/sms-settings` (вкладка «Шаблоны»)

Уже работает универсально: тянет все строки из `sms_templates` и рендерит редактор каждой. Добавляем:
- В `TYPE_LABELS` 4 новые метки: `booking_scheduled`, `booking_received`, `booking_collected`, `booking_uploaded`.
- Миграция/insert: 4 новых строки в `sms_templates` с дефолтными текстами и переменными `{{date}} {{time}} {{address}} {{name}} {{url}}`.
- Группировка в UI: добавить визуальную секцию «Запись на анализы» поверх списка шаблонов (просто сортировка/заголовок над booking_*).

### 2. Email — `/admin/email-settings`

В `TEMPLATE_TABS` добавляем 4 новые вкладки: «Запись назначена», «Биоматериал получен», «Анализ в работе», «Отчёт готов». Существующая вкладка `analysis_booking` остаётся как «Подтверждение записи» (универсальный fallback).
- Insert 4 строк в `email_templates` с subject/heading/body_text/button_label/footer_text.
- Тест-отправка уже работает универсально (`template_type` параметризован).

### 3. Telegram — `/admin/telegram-settings`

В таблице `telegram_notification_settings` уже есть `enabled_events`. Добавляем новое поле `booking_templates jsonb` (миграция) со структурой:
```json
{
  "booking_scheduled": "🗓 Запись назначена...\n{patient}\n{date} {time}\n{address}",
  "booking_received": "...",
  "booking_collected": "...",
  "booking_uploaded": "..."
}
```
В UI `TelegramSettings.tsx` добавляем секцию «Шаблоны уведомлений по статусам» — 4 textarea с подсказкой по плейсхолдерам (`{patient}`, `{date}`, `{time}`, `{address}`, `{url}`). Сохранение — update этой колонки.

## Edge-функции

### `send-booking-sms`
- Принимает `template_name?: string` в body. Если не передан — маппинг `status → template_name` по таблице выше с fallback на `appointment_reminder`.
- Загружает шаблон по `name`, рендерит с `{{date}} {{time}} {{address}} {{name}} {{url}}` (`url` = `https://reage.life/profile`).

### `send-analysis-booking-email`
- Принимает `template_type?: string` (сейчас хардкод `analysis_booking`). Дефолт = маппинг по статусу с fallback на `analysis_booking`.
- Логика тест-отправки сохраняется.

### `send-booking-telegram`
- Принимает `template_key?: string`. Дефолт — маппинг по статусу.
- Читает текст из `telegram_notification_settings.booking_templates[template_key]`, подставляет плейсхолдеры. Если ключа нет — использует текущий формат.
- В payload `telegram-notify` уже передаём `booking_id` (важно для истории).

## UI карточки записи (`PatientBookingsCard.tsx`)

Каждая из трёх кнопок-действий («Отправить SMS», «Отправить Email», «Отправить в Telegram») превращается в **split-button** (shadcn `DropdownMenu` рядом с основной кнопкой):
- Основное нажатие → отправка шаблона по текущему статусу. Если статус не из 4 ключевых — основная кнопка отключена с тултипом «Шаблон не настроен для статуса "Не назначен"». Dropdown остаётся активным.
- Dropdown → 4 пункта: «Напоминание о визите», «Биоматериал получен», «Анализ в работе», «Отчёт готов» — отправка с явно выбранным `template_name/template_type/template_key`.

Мутации `sendSms`, `sendEmail`, `sendTg` принимают дополнительный параметр `templateKey?: string` и пробрасывают в `invoke`.

## Что НЕ меняется

- Автоотправок при смене статуса не добавляем.
- Старые шаблоны и существующие записи `sms_send_log/email_send_log` не трогаем.
- SMS Aero webhook без изменений.
- Структура раздела «История уведомлений» не меняется.

## Файлы

**Миграция (schema):**
- `supabase/migrations/...` — `ALTER TABLE telegram_notification_settings ADD COLUMN booking_templates jsonb DEFAULT '{}'::jsonb`.

**Insert (data):**
- 4 строки `sms_templates`, 4 строки `email_templates`, дефолтный JSON `booking_templates` в `telegram_notification_settings`.

**Frontend:**
- `src/pages/admin/SmsSettings.tsx` — `TYPE_LABELS` + порядок.
- `src/pages/admin/EmailSettings.tsx` — `TEMPLATE_TABS` + `TEST_NOTES`.
- `src/pages/admin/TelegramSettings.tsx` — секция «Шаблоны по статусам».
- `src/components/admin/PatientBookingsCard.tsx` — split-кнопки и проброс шаблона.

**Backend:**
- `supabase/functions/send-booking-sms/index.ts` — поддержка `template_name` + маппинг.
- `supabase/functions/send-analysis-booking-email/index.ts` — поддержка `template_type` + маппинг.
- `supabase/functions/send-booking-telegram/index.ts` — поддержка `template_key` + чтение `booking_templates`.