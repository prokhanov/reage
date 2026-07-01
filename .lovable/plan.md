
## Итоговая цепочка статусов `analysis_bookings.status`

```
waiting_call     → Ожидает звонка
no_answer        → Не дозвонились
not_scheduled    → Не назначен
scheduled        → Назначен
collected        → Анализ в работе (биоматериал сдан, лаба обрабатывает)
report_pending   → Отчёт в работе (лаба вернула результаты, готовим отчёт)  ← НОВЫЙ
report_ready     → Отчёт загружен (доступен пациенту)                        ← переименован из uploaded
```

Убираем `received` (сливается в `collected`).

---

## 1. Миграция БД
- `UPDATE analysis_bookings SET status='collected' WHERE status='received';`
- `UPDATE analysis_bookings SET status='report_ready' WHERE status='uploaded';`
- Обновить триггеры:
  - `disable_demo_mode_on_booking_uploaded` → срабатывать на `report_ready`.
  - `notify_telegram_booking_status_changed` — расширить `CASE`: убрать `received`, добавить `report_pending`, переименовать `uploaded` → `report_ready` с новыми `template_key` (`booking_report_pending`, `booking_report_ready`).
  - `create_next_analysis_booking` — оставить триггер на `collected` (сдача биоматериала = начало нового цикла).
- Перекопировать/переименовать записи в `sms_templates`, `email_templates`:
  - `booking_received` → удалить (было продублировано `collected`).
  - `booking_uploaded` → `booking_report_ready` (сохранить текст, поправить смысл на «Ваш персональный отчёт готов»).
  - `booking_collected` — уточнить текст «Анализ в работе».
  - Добавить `booking_report_pending` («Мы получили результаты, формируем ваш персональный отчёт»).
- Аналогично обновить дефолты `telegram_notification_settings.enabled_events` (добавить `booking_report_pending`, переименовать ключ `booking_uploaded`).

## 2. Единый словарь
Создать `src/lib/bookingStatusLabels.ts`:
- `BookingStatus` union
- `bookingStatusLabels` (RU)
- `bookingStatusColors`
Использовать везде вместо локальных карт.

## 3. Фронтенд
Пройтись по всем найденным местам:
- `src/pages/admin/AnalysisBookings.tsx`
- `src/pages/admin/MyAssignments.tsx`
- `src/pages/admin/TelegramSettings.tsx`
- `src/pages/admin/SmsSettings.tsx`
- `src/pages/admin/EmailSettings.tsx`
- `src/components/AnalysisBookingBanner.tsx` (терминальный статус → `report_ready`, hasUploaded → hasReportReady)
- `src/components/admin/PatientBookingsCard.tsx`
- `src/components/admin/CreateBookingDialog.tsx`
- `src/components/admin/BookingModeSettings.tsx`
- `src/pages/Profile.tsx` (фильтр `.eq("status","collected")` оставляем — смысл тот же)

Заменить `received/uploaded` → `collected/report_ready`, добавить в селекты «Отчёт в работе».

## 4. Edge-функции
Обновить маппинги ключей шаблонов:
- `supabase/functions/send-booking-telegram/index.ts`
- `supabase/functions/send-booking-sms/index.ts`
- `supabase/functions/send-analysis-booking-email/index.ts`

Убрать ветку `received`, добавить `report_pending`, переименовать `uploaded` → `report_ready`.

## 5. Автопереход `collected → report_pending → report_ready`
- В `report-orchestrator` (или в момент загрузки PDF/старта пайплайна) переводить booking `collected → report_pending`.
- В `finalize-analysis` по успешному завершению — `report_pending → report_ready`.

## 6. React Email шаблон `subscription-activated`
Не затрагивается. Отдельного React-шаблона для booking-статусов сейчас нет — тексты берутся из БД `email_templates`, шаг 1 их обновляет.

## 7. QA-чек
- Ручной прогон: waiting_call → scheduled → collected → report_pending → report_ready.
- Проверить бейджи в админке, баннер в ЛК, отправку Telegram/SMS/Email на каждом переходе (тестовый режим).
- Убедиться, что старые записи в БД корректно отображаются после миграции.

## Порядок
1. Миграция БД (данные + триггеры + шаблоны).
2. Словарь `bookingStatusLabels.ts`.
3. Обновление фронтенда и edge-функций.
4. Деплой затронутых edge-функций.
5. Проверка сценариев.

Подтверди — стартую с миграции.
