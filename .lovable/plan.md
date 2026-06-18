## План

Исправлю не отдельные места, а всю админку целиком: страницы, вложенные вкладки, диалоги и таблицы, где есть loading-индикаторы.

### 1. Ввести единый набор loading-компонентов для админки
- Оставить один стиль для кнопочных индикаторов через `ButtonSpinner`.
- Добавить/использовать единые admin-компоненты для:
  - кнопочного спиннера;
  - центрированного inline/page loader;
  - загрузки таблиц/карточек через skeleton с одинаковыми отступами.
- Убрать ручные CSS-кружки и разрозненные `Loader2` прямо в JSX.

### 2. Исправить проблемные разделы, которые сейчас явно отличаются
- `SubscriptionPlans`: заменить разные skeleton-блоки тарифов/цен на единый admin loading layout.
- `SmsSettings` и вложенный `SmsLogsDashboard`: унифицировать skeleton таблицы и кнопку обновления.
- `EmailSettings` и вложенные email-компоненты: `EmailLogsDashboard`, `ConfirmationReminders`, `ReminderLogs`, `DripLogsTab`, `SeriesSubscribersTab`, `EnrollPatientsDialog`.
- `PaymentGatewaySettings`, `AdminPaymentTester`, `AdminPaymentLogs`: убрать оставшийся `Loader2`/разные skeleton-строки, сделать единообразно.

### 3. Пройти все оставшиеся admin-компоненты со спиннерами
Заменить оставшиеся нестандартные индикаторы в:
- `AnalysisStep1`, `CreateAnalysisWizard`, `EditAnalysisWizard`;
- `AssignStaffDialog`, `ChangeUserEmailDialog`, `EditSubscriptionDialog`, `SubscriptionHistoryDialog`;
- `EmailConfirmationBadge`, `PhoneConfirmationBadge`;
- `EditReportDialog`;
- `Patients`, `LabLocations`, `UserManagement`, `ReportVisualsTest` — только loading/refresh presentation, без изменения бизнес-логики.

### 4. Скелетоны и пустые загрузочные состояния
- Привести размеры skeleton-строк таблиц к одному виду: одинаковые `p`, `space-y`, высота строк.
- Не трогать горизонтальный scroll таблиц.
- Не заменять полноценные скелетоны страниц там, где они уже структурные, но выровнять их отступы/размеры, если они отличаются от общего admin-шаблона.

### 5. Безопасность режима просмотра кабинета пациента
- Не менять маршруты, права, запросы, переключение пользователя, patient-view state или данные.
- В `PatientProfile` оставить логику как есть, заменить только визуальный loading-индикатор на общий вариант.

## Технические детали

- Все изменения будут presentation-only: классы, imports, JSX loading-блоки.
- Никаких изменений в запросах, hooks, mutations, handlers, RLS/backend.
- После правки проверю поиском, что в `src/pages/admin` и `src/components/admin` не осталось ручных `Loader2`, CSS spinner-кружков и разрозненных `animate-spin`, кроме единого компонента и допустимых иконок refresh.