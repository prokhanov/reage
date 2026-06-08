## Найденные дубли и несоответствия

**SMS (`/admin/settings/sms`)** — 3 пересекающихся шаблона для одних и тех же статусов:
- `booking_uploaded` «Запись на анализы — отчёт готов» ✅ актуальный
- `report_ready` «Отчёт готов» ❌ дубль (старый, до статусной модели)
- `appointment_reminder` «Напоминание о записи (старый шаблон)» ❌ дубль `booking_scheduled`

**Email (`/admin/settings/email`)** — дубль для статуса «назначена»:
- `booking_scheduled` «Запись назначена» ✅ актуальный
- `analysis_booking` «Запись (общий)» ❌ дубль (старый общий шаблон до разделения по статусам)

**Telegram** — чисто, 4 статусных шаблона без дублей.

**Несоответствия в названиях** между каналами для одного и того же статуса:
| Статус | SMS | Email | Telegram |
|---|---|---|---|
| scheduled | «Запись на анализы — назначена» | «Запись назначена» | «Запись назначена» |
| received | «… биоматериал получен» | «Биоматериал получен» | «Биоматериал получен» |
| collected | «… в работе» | «Анализ в работе» | «Анализ в работе» |
| uploaded | «… отчёт готов» | «Отчёт готов» | «Отчёт готов» |

## Что сделаем

1. **SMS (`SmsSettings.tsx`)**
   - Убрать из `TYPE_LABELS` и `TYPE_ORDER` записи `report_ready` и `appointment_reminder`.
   - Унифицировать подписи 4 booking-шаблонов: «Запись назначена / Биоматериал получен / Анализ в работе / Отчёт готов».
   - Удалить строки `report_ready` и `appointment_reminder` из таблицы `sms_templates` миграцией.
   - В `send-booking-sms` убрать fallback на `appointment_reminder` (оставить fallback на `booking_scheduled`, чтобы старые ручные отправки без статуса продолжали работать).

2. **Email (`EmailSettings.tsx`)**
   - Удалить вкладку `analysis_booking` из `TEMPLATE_TABS` и из `TAB_HINTS`.
   - Удалить строку `analysis_booking` из `email_templates` миграцией.
   - В `send-analysis-booking-email` изменить `DEFAULT_TEMPLATE_TYPE` на `booking_scheduled`.

3. **Telegram** — без изменений (уже корректно), только проверка, что подписи совпадают с Email/SMS.

## Технические детали

- Миграция: `DELETE FROM sms_templates WHERE name IN ('appointment_reminder','report_ready'); DELETE FROM email_templates WHERE template_type='analysis_booking';`
- В `PatientBookingsCard` `*_TEMPLATE_BY_KEY` уже ссылается только на `booking_*` — изменений не требуется.
- Если где-то в коде (`send-booking-sms`, edge functions) остаются ссылки на удаляемые имена, заменяем на `booking_scheduled` / `booking_uploaded`.

Итого: один шаблон на статус × 3 канала, единые названия, никаких легаси-дублей.