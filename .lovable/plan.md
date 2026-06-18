План: пройти все разделы админки по маршрутам и привести loading-индикаторы к одному визуальному стандарту.

## Список разделов админки для проверки

1. `Пациенты` — `/admin/patients`
   - список пациентов
   - профиль пациента `/admin/patients/:userId`
   - диалоги подтверждения email/телефона, просмотра пациента, удаления

2. `Записи на анализы` — `/admin/analysis-bookings`
   - список записей
   - настройки режима записи
   - управление слотами
   - создание/редактирование записи
   - назначение сотрудника

3. `Назначены мне` — `/admin/my-assignments`

4. `Пользователи` — `/admin/user-management`
   - список пользователей
   - роли и права
   - создание приглашения
   - редактирование pending-пользователя
   - смена email

5. `Тарифы` — `/admin/subscription-plans`
   - вкладка тарифов
   - вкладка цен и периодов
   - создание/редактирование тарифа
   - редактирование цены

6. `Платёжный шлюз` — `/admin/payment-gateway`
   - настройки
   - тестирование платежей
   - логи платежей

7. `Тест отчета` — `/admin/report-visuals`

8. `Настройки AI` — `/admin/ai-settings`
   - список промптов
   - редактирование промпта

9. `Email` — `/admin/email-settings`
   - рассылки
   - технические письма
   - напоминания
   - логи и мониторинг

10. `SMS` — `/admin/sms-settings`
    - отправитель
    - шаблоны
    - тестовая отправка
    - логи

11. `Telegram` — `/admin/telegram-settings`

12. `Лаборатории` — `/admin/labs`

13. `Управление данными` — `/admin/data-management`
    - биомаркеры
    - медицинские состояния
    - симптомы
    - категории

14. Скрытый/служебный admin route — `/admin/scale-preview`

## Что унифицировать

1. **Единый page/card loading для разделов**
   - Убрать разнобой вида: большой skeleton в `Пациентах`, отдельные skeleton-блоки в `Тарифах`, локальные skeleton в `Email/SMS`, пустой экран в `Telegram`.
   - Для загрузки целого раздела или карточки использовать один стандартный `AdminCenterLoader` с одинаковым размером, отступами и текстом.

2. **Единый table/list loading**
   - Табличные разделы (`Пациенты`, `Пользователи`, `Записи`, `SMS logs`, `Email logs`, платежные логи) привести к одинаковой структуре загрузки: один и тот же паттерн внутри карточки/таблицы.
   - Не ломать горизонтальный scroll у таблиц.

3. **Единый button loading**
   - Все кнопки действий перевести на `ButtonSpinner` + нормальный текст действия.
   - Исправить места, где сейчас только текст `Создание...`, `Сохранение...`, `Удаление...` без иконки.

4. **Единый refresh loading**
   - Все кнопки обновления оставить с `RefreshCw`, но крутить иконку только во время refetch/loading и с одинаковыми классами.

5. **Единый inline/dialog loading**
   - В диалогах, badge-проверках, селекторах, настройках слотов и маленьких блоках заменить текстовые `Загрузка...` и raw `Loader2` на один компактный `AdminCenterLoader size="sm"` или `ButtonSpinner`, в зависимости от контекста.

## Конкретные проблемные места, которые нужно пройти

- `SubscriptionPlans` — заменить разные skeleton в тарифах/ценах на общий admin loading.
- `Patients` — убрать отдельный `PatientsListSkeleton` как визуально другой паттерн и привести к общему стандарту.
- `SmsSettings` и `SmsLogsDashboard` — унифицировать loading шаблонов и логов.
- `EmailSettings` и email-вкладки — унифицировать loading шаблонов, логов, рассылок, подписчиков, напоминаний.
- `TelegramSettings` — убрать `return null` во время загрузки, показать общий loader.
- `PaymentGatewaySettings` и payment-компоненты — проверить остатки `Loader2`/локальных skeleton.
- `UserManagement`, `AnalysisBookings`, `DataManagement`, `AISettings`, `LabLocations`, `ReportVisualsTest`, `MyAssignments` — сверить с общим стандартом и поправить отличия.
- Вложенные admin-компоненты: `CreatePlanDialog`, `EditPlanDialog`, `EditPricingDialog`, `CreateUserDialog`, `RoleManagementCard`, `UserPermissionsDialog`, `CreateBookingDialog`, `EditBookingDialog`, `BookingModeSettings`, `DaySlotsManager`, `BiomarkerSelector`, `CreateAnalysisDialog`, `CreatePrescriptionDialog`, `EditPrescriptionDialog`, `CreateInteractionDialog`, `PhoneConfirmationBadge`.

## Ограничения

- Только визуальная унификация loading-индикаторов.
- Не менять бизнес-логику, запросы, права, маршруты, статусы, роли, режим просмотра пациента и backend.
- Не трогать данные и миграции.
- Сохранить тёмную тему и текущий общий layout админки.

## Проверка после реализации

- Повторно запустить поиск по `Loader2`, `Skeleton`, `animate-spin`, `Загрузка...`, `Создание...`, `Сохранение...`, `Удаление...` в `src/pages/admin` и `src/components/admin`.
- Убедиться, что остатки допустимы только внутри общих компонентов (`AdminCenterLoader`, `ButtonSpinner`) или в едином refresh-паттерне.
- Визуально проверить ключевые разделы: `Пациенты`, `Тарифы`, `Email`, `SMS`, `Пользователи`, `Записи на анализы`.