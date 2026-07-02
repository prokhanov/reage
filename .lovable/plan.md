## Правило
Если сотруднику дан доступ к разделу (через роль или персональный `admin_permissions`), внутри этого раздела он должен видеть и мочь делать **всё то же, что суперадмин**. Единственное исключение — защита самого суперадмина как цели действий (нельзя удалить/понизить суперадмина, менять его роли и т.п.).

## Что нашёл (нарушения)

### 1. Сайдбар скрывает половину админ‑разделов от всех, кроме суперадмина
`src/components/AppSidebar.tsx` (строки 36–52, 322–323): у пунктов **Тарифы, Платёжный шлюз, Промокоды, Тест отчёта, Email, SMS, Telegram, Лаборатории** стоит `requiresSuperAdmin: true`, и меню фильтруется по нему. Даже если у сотрудника выдан модуль `promo_codes` / `email_settings` / `sms_settings` / `telegram_settings` / `lab_locations` / `subscription_plans` / `payment_gateway` / `report_visuals` — он их **не увидит**. При этом сами роуты защищены только `AdminModuleRoute`, т.е. по прямой ссылке иногда открылось бы, а через UI — нет.
Фикс: убрать `requiresSuperAdmin` и показывать пункт, если у пользователя есть доступ к соответствующему модулю (`has_admin_permission`), либо он суперадмин.

### 2. `useUserRole.hasAdminAccess` не учитывает персональные права
`src/hooks/useUserRole.ts` считает `hasAdminAccess` только по `role_permissions`. Если сотруднику доступ выдан индивидуально через `admin_permissions` (без роли или сверх роли), `hasAdminAccess=false` → сайдбар вообще не покажет админ‑блок.
Фикс: считать `hasAdminAccess = superadmin || есть хоть один enabled в role_permissions || есть хоть один enabled в admin_permissions`. Плюс возвращать из хука **множество доступных модулей** (`allowedModules: Set<AdminModule>`), чтобы сайдбар фильтровал корректно и без лишних запросов.

### 3. Дифф между суперадмином и staff внутри карточки пациента
`src/components/admin/PatientInfoDialog.tsx` (строки 427 и 651): кнопка **«Подарить подписку»** и весь `GiftSubscriptionDialog` показываются только `isSuperAdmin`. У staff с доступом к `patients` кнопки нет.
Фикс: показывать всем, у кого есть доступ к модулю `patients` (проверка по `has_admin_permission`).

### 4. Пересчёт био‑возраста / стратегии в режиме просмотра пациента — только суперадмину
`src/pages/Dashboard.tsx` (стр. 69): `canRecalculate = isSuperAdmin && isViewMode`. То же самое отсутствует в `HealthStrategy.tsx` (кнопки нет вовсе, а раньше подразумевалась для суперадмина).
Фикс: разрешать пересчёт/предпросмотр всем staff с доступом к модулю `patients` и в режиме просмотра пациента. И вернуть аналогичный контрол на `HealthStrategy.tsx` для staff в view‑as‑patient.

### 5. Ревизия RLS/GRANT для всех таблиц, которые открывает staff
Правило «staff видит как суперадмин» держится только если БД реально пускает staff. Прошлые фиксы прошли по `analyses`/`recommendations`, но по остальным таблицам нужен сквозной аудит:
- Модуль **patients** — доступ staff к: `profiles`, `analyses`, `analysis_values`, `recommendations`, `prescriptions`, `prescription_adherence`, `medical_history`, `complaints`, `user_symptoms`, `subscriptions`, `subscription_history`, `weight_history`, `chat_conversations`/`chat_messages`, `risk_zone_analyses`, `health_strategy_snapshots`, `patient_interactions`, `task_completions`, `report_jobs`, `analysis_bookings`.
- Модуль **analysis_bookings** — `analysis_bookings`, `availability_slots`, `default_slot_settings`, `lab_locations` (read), `profiles` (read).
- Модуль **user_management** — `profiles`, `user_roles`, `custom_roles`, `admin_permissions`, `role_permissions`, `invite_tokens`.
- Модуль **data_management** — `biomarkers`, `biomarker_categories`, `symptom_templates`, `symptom_categories`, `medical_conditions_templates`, `medical_condition_categories`, `plan_biomarkers`, `bioage_population_norms`, `health_model_settings`, `demo_data_templates`.
- Модуль **ai_settings** — `ai_prompt_settings`.
- Модуль **subscription_plans** — `subscription_plans`, `subscription_pricing`.
- Модуль **payment_gateway** — `payment_gateway_settings`, `payment_orders`, `payment_callback_log`.
- Модуль **promo_codes** — `promo_codes`, `promo_code_plans`, `promo_code_redemptions`, `promo_code_batches`, `promo_code_settings`.
- Модуль **email_settings** — `email_templates`, `email_sender_settings`, `email_send_log`, `email_drip_series`/`_steps`/`_schedule`, `email_send_state`, `suppressed_emails`, `test_email_overrides`, `confirmation_reminder_settings`/`_log`, `email_unsubscribes`.
- Модуль **sms_settings** — `sms_templates`, `sms_sender_settings`, `sms_send_log`.
- Модуль **telegram_settings** — `telegram_notification_settings`, `telegram_notification_log`.
- Модуль **lab_locations** — `lab_locations`, `lab_map_contexts`.
- Модуль **report_visuals / scale_preview** — read `biomarkers`, `biomarker_categories`.
- Модуль **my_assignments** — `patient_interactions` + read пациентских таблиц (см. patients).

По каждой таблице надо убедиться, что политика написана через `has_admin_permission(auth.uid(), '<module>'::admin_module)` (или `has_role(..., 'superadmin')`), а не через жёсткий `has_role(..., 'superadmin')` только. Где нужно — переписать политики и добить `GRANT`.

### 6. Edge Functions
Все админ‑функции (компенсирующие пересчёты, `compute-health-strategy`, `report-orchestrator`, `admin-change-user-email`, `gift-subscription`, `send-invite`, `admin-delete-user` и т.п.) должны проверять `has_admin_permission` вместо `has_role(..., 'superadmin')`. Нужен обход и правка тех, где стоит суперадмин‑жёсткий гейт.

## План реализации

1. **`useUserRole`**: считать `hasAdminAccess` с учётом персональных прав; добавить `allowedModules: AdminModule[]` (одним запросом на роль + персональные).
2. **`AppSidebar`**: убрать флаг `requiresSuperAdmin`, оставить одну проверку — `isSuperAdmin || allowedModules.includes(item.module)`. Каждому пункту прописать поле `module: AdminModule`.
3. **`PatientInfoDialog`**: заменить `isSuperAdmin` на `hasPatientsAccess = isSuperAdmin || allowedModules.includes('patients')` для кнопки «Подарить подписку» и `GiftSubscriptionDialog`.
4. **`Dashboard.tsx` и `HealthStrategy.tsx`**: `canRecalculate = isViewMode && hasPatientsAccess`. В `HealthStrategy.tsx` вернуть UI‑кнопку «Пересчитать стратегию» тем же гейтом.
5. **Прогон по остальным `admin/*` страницам** (`AISettings`, `DataManagement`, `Patients`, `PatientProfile`, `UserManagement`, `AnalysisBookings`, `MyAssignments`, `SubscriptionPlans`, `PaymentGatewaySettings`, `PromoCodes`, `EmailSettings`, `SmsSettings`, `TelegramSettings`, `LabLocations`, `ReportVisualsTest`, `ScaleLabelsPreview`) — grep по `isSuperAdmin`/`useSuperAdminCheck`. Все нецелевые (не «защита суперадмина как объекта действий») заменить на модульную проверку.
6. **RLS/GRANT‑аудит** по списку в п.5 предыдущего блока: одной миграцией привести политики к схеме «superadmin OR has_admin_permission(auth.uid(),'<module>')» + `GRANT` на нужные роли. Отдельная секция миграции — по каждому модулю.
7. **Edge Functions‑аудит**: grep по `superadmin`, заменить проверки на `has_admin_permission` с ожидаемым модулем.
8. **Smoke‑проверка ролью «doctor»**: логин под staff с выданным доступом только к `patients` — проверить, что: сайдбар показывает «Пациенты/Записи/Назначены мне/…», карточка пациента открывается, отчёты/анализы/назначения/стратегия/чат/AI‑ассистент/визуализации грузятся, кнопки «Подарить подписку», «Пересчитать био‑возраст», «Активировать подписку» работают. Затем — staff с доступом к `email_settings`: раздел виден в меню, шаблоны/логи открываются и редактируются.

## Что оставляем без изменений (осознанно)
- Проверки `user.role === 'superadmin'` в `UserManagement` и `RoleManagementCard`, которые запрещают удалять / понижать самого суперадмина — это защита цели действия, не смотрящего.
- `SuperAdminRoute` остаётся только для страниц, которые действительно строго суперадминские (если такие ещё нужны; после ревизии, скорее всего, все админ‑страницы уйдут под `AdminModuleRoute`).
