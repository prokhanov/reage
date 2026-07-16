
## Что делаем

Добавляем в жизненный цикл записи на анализ новый статус **«Заявка оформлена»** (`application_submitted`) — момент, когда админ оформил заявку в ЛабКвест и получил её номер. Пациенту уходит подтверждающее SMS/Email с инструкцией сообщить номер администратору лаборатории; в наш Telegram — уведомление админам. Без введённого номера заявки статус нельзя выставить и уведомления нельзя отправить.

## Логика флоу

Порядок статусов после изменений:

```text
waiting_call → no_answer → scheduled → application_submitted → collected → report_pending → report_ready
```

- `application_submitted` считается «активным» (входит в unique-констрейнт «одна активная запись на пациента»).
- Установить статус `application_submitted` можно только если у брони заполнено поле `labquest_request_number` (валидатор в UI + триггер в БД).
- Кнопки «Отправить SMS/Email/TG» для шаблона `booking_application_submitted` заблокированы, пока номер не заполнен.
- При редактировании существующей записи в этом статусе номер обязателен (нельзя очистить).

## Изменения БД (миграция)

1. `analysis_bookings.labquest_request_number text` (nullable, trim, до 64 символов).
2. Триггер `validate_labquest_request_number()`: если `status = 'application_submitted'`, то `labquest_request_number` обязателен и непустой.
3. Пересоздать частичный уникальный индекс `analysis_bookings_one_active_per_user`, добавив `application_submitted` в список активных статусов.
4. Обновить триггер `notify_telegram_booking_status_changed`:
   - добавить в `CASE ... status` ветку `WHEN 'application_submitted' THEN 'booking_application_submitted'`;
   - передавать в payload новое поле `request_number` = `NEW.labquest_request_number`.
   - Аналогично в `notify_telegram_booking_created` (на случай создания сразу в этом статусе — но валидатор всё равно потребует номер).
5. Добавить SMS-шаблон `booking_application_submitted` в `sms_templates`:
   `ReAge: запись на анализы подтверждена. По прибытию сообщите администратору ЛабКвест: «Номер заявки {{request_number}}, от партнёра ООО ‹Реэйдж›».`
6. Добавить Email-шаблон `booking_application_submitted` в `email_templates` (subject/heading/body с `{request_number}`, `{appointment_date}`, `{appointment_time}`, `{clinic_address}`).
7. В `telegram_notification_settings.booking_templates` дописать шаблон по ключу `booking_application_submitted` (HTML с `{request_number}`, `{date}`, `{time}`, `{address}`, `{patient}`).

## Edge Functions

- `send-booking-sms`:
  - Разрешить `template_name = booking_application_submitted` в `ALLOWED_TEMPLATES`.
  - В `renderTemplate` пробросить `request_number` из `booking.labquest_request_number`.
  - Если шаблон = `booking_application_submitted` и `labquest_request_number` пуст — 400 «Не указан номер заявки».
- `send-analysis-booking-email`: аналогично — принять новый `template_type`, добавить `request_number` в `vars`, отклонить пустой номер.
- `send-booking-telegram`: расширить `ALLOWED_TEMPLATES`, добавить в `STATUS_TO_TEMPLATE` пару `application_submitted → booking_application_submitted`, прокидывать `request_number` в payload.
- `telegram-notify` (`applyBookingVars`): добавить `request_number` в словарь переменных, добавить `application_submitted` в `STATUS_LABELS` = «Заявка оформлена».

## Изменения фронта (карточка пациента → «Записи на анализы»)

Затрагивается блок админки staff:

- `src/lib/bookingStatusLabels.ts` — новый статус `application_submitted`, лейбл «Заявка оформлена», цвет (индиго), позиция в `bookingStatusOrder` между `scheduled` и `collected`, ключ шаблона `booking_application_submitted`.
- `src/components/admin/PatientBookingsCard.tsx`:
  - расширить `BookingStatus`, `statusLabels`, `statusColors`, `TemplateKey`, `TEMPLATE_LABELS`, `SMS/EMAIL/TG_TEMPLATE_BY_KEY`, `STATUS_TO_TEMPLATE_KEY`;
  - в интерфейсе `Booking` добавить `labquest_request_number: string | null`;
  - при выборе статуса `application_submitted` в `Select`: если номер не заполнен — не менять статус, открыть диалог ввода номера, только после сохранения обновить статус;
  - в «Отправить» скрывать/дизейблить пункт «Заявка оформлена», пока номера нет (tooltip «Введите номер заявки»).
- `src/components/admin/EditBookingDialog.tsx` — добавить поле «Номер заявки ЛабКвест» (обязательное, если статус = `application_submitted`); показывать всегда, но помечать required при выборе статуса.
- `src/components/admin/CreateBookingDialog.tsx` — то же поле; в списке статусов добавить `application_submitted`; клиентская валидация.
- Список статусов в фильтрах: `src/pages/admin/AnalysisBookings.tsx`, `src/pages/admin/MyAssignments.tsx`, `src/pages/admin/Patients.tsx`, `src/hooks/useScheduledBookingsCount.ts`, `src/hooks/useMyAssignmentsCount.ts` — везде, где хардкодятся активные статусы, добавить `application_submitted`.
- В таблице показать номер заявки маленькой подписью под адресом (если заполнен).
- В `BookingNotificationsHistory` уже читает `template_name` — новый ключ отобразится автоматически, добавить только человеко-читаемое название.

## Автоуведомления при смене статуса

Существующая логика: при `UPDATE status`, DB-триггер `notify_telegram_booking_status_changed` шлёт в TG. Для `application_submitted` этот триггер также сработает — TG уйдёт автоматически.

SMS/Email клиенту автоматически **не** уходят по смене статуса ни для одного из существующих статусов — отправка ручная из карточки (как сейчас). Оставляем такую же логику: админ жмёт «Отправить SMS/Email» из карточки после установки статуса. Это соответствует текущему поведению и упомянуто в требовании «возможность его отправить клиенту».

## Проверки

- `bunx tsgo` после правок.
- Ручной прогон: создать бронь, попытаться выставить `application_submitted` без номера → блок; ввести номер → статус ставится, TG уходит с номером; SMS/Email отправляются вручную с подставленным `{{request_number}}`; попытка очистить номер в этом статусе → отклонено.
- SQL: убедиться, что unique-индекс не даёт создать вторую активную запись в `application_submitted`.

## Что не трогаем

- Логика создания следующей брони (`create_next_analysis_booking`) — она смотрит только на `collected`.
- Автозапись цепочки шаблонов drip/email — не связано.
- Ландинги и лендинговые квизы.
