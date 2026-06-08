## Что меняется

В `/admin/patients/:userId` блок «Следующий анализ» (одна строка с датой) превращается в полноценную карточку **«Записи на анализы»** со списком всех bookings пациента и полным набором действий — как на странице `/admin/analysis-bookings`, но в рамках одного пациента.

## UI

Карточка `PatientBookingsCard` под информацией о пациенте, выше Tabs:

- Заголовок «Записи на анализы» + кнопка «Создать запись» (переиспользуем `CreateBookingDialog`, предзаполняем `user_id`).
- Таблица всех записей пациента (сортировка по `booking_date desc`), колонки:
  - Дата/время — кликабельно, открывает `EditBookingDialog` (дата + время + адрес).
  - Адрес — тот же диалог.
  - Статус — `Badge` + dropdown переключения (все 7 статусов: `waiting_call`, `no_answer`, `not_scheduled`, `scheduled`, `collected`, `received`, `uploaded`).
  - Назначенный сотрудник — кликабельно, открывает `AssignStaffDialog`.
  - Следующий анализ (`next_analysis_date`) — кликабельно, открывает текущий `EditNextAnalysisDialog`.
  - **Уведомления** — два мини-бейджа `Email` / `SMS`: серый «не отправлено», зелёный «✓ отправлено DD.MM HH:MM», красный «✗ ошибка» (tooltip с текстом ошибки). Берём последний релевантный лог по `recipient_email`/`phone` из `email_send_log` и `sms_send_log` для этой записи (фильтр по `metadata.booking_id`).
  - Действия (`⋮`): «Отправить email подтверждение», «Отправить SMS-напоминание», «Уведомить админов в Telegram», «Удалить запись» (с `AlertDialog`).

Старая мини-карточка «Следующий анализ» удаляется (её функция теперь внутри строки таблицы).

## Уведомления (ручные кнопки, без авто-отправки при смене статуса)

### Email
- Используем существующую edge-функцию `send-analysis-booking-email` и шаблон `analysis_booking`. Передаём `metadata: { booking_id }`, чтобы потом подтянуть статус из `email_send_log`. Toast об успехе/ошибке.

### SMS
- Новая edge-функция `send-booking-sms` (по аналогии с `sms-send-test`): тянет шаблон `appointment_reminder` из `sms_templates`, подставляет `{date} {time} {address}`, шлёт через `sendSms` из `_shared/smsaero.ts` на телефон из `profiles.phone`. Логируем в `sms_send_log` с `metadata.booking_id`.
- Кнопка дизейблится, если у пациента нет телефона.

### Telegram админу
- Добавляем новый event `booking_status_changed` в `telegram_notification_settings.enabled_events` (значение по умолчанию `true`).
- Кнопка зовёт edge-функцию `telegram-notify` с payload пациента + текущим статусом и датой.

## Индикация статусов отправки

`useBookingNotifications(bookingId)` — хук, который одним запросом подтягивает последние записи из `email_send_log` и `sms_send_log` по `metadata->>'booking_id' = bookingId`. На основе `status` (`sent`/`failed`/`dlq`/`pending`) и `created_at` рисуем бейджи. После клика по «Отправить» инвалидируем queryKey, чтобы бейдж сразу обновился.

## Файлы

Новые:
- `src/components/admin/PatientBookingsCard.tsx` — карточка со списком/действиями.
- `src/components/admin/BookingNotificationBadges.tsx` — два бейджа Email/SMS со статусом.
- `src/components/admin/BookingActionsMenu.tsx` — dropdown с тремя кнопками отправки + удаление.
- `src/hooks/useBookingNotifications.ts` — выборка последних логов отправки по `booking_id`.
- `supabase/functions/send-booking-sms/index.ts` — отправка SMS-напоминания, пишет в `sms_send_log` с `metadata.booking_id`.

Изменяются:
- `src/pages/admin/PatientProfile.tsx` — убираем старую карточку «Следующий анализ», вставляем `<PatientBookingsCard userId={userId} patient={profile} />`.
- `supabase/functions/send-analysis-booking-email/index.ts` — принимать опциональный `booking_id` и класть его в `metadata` при записи в `email_send_log`.
- `supabase/functions/telegram-notify/index.ts` — поддержка нового event `booking_status_changed`.

БД (data-update через insert-tool):
- `UPDATE telegram_notification_settings SET enabled_events = enabled_events || '{"booking_status_changed": true}'::jsonb`.

## Что НЕ делается

- Не трогаем `/admin/analysis-bookings` и `MyAssignments`.
- Никаких авто-отправок при смене статуса — только ручные кнопки.
- Шаблоны email/SMS уже существуют — новые не создаём.
