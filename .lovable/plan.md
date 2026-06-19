
## Цель
Полноценное управление промокодами в админке (только для superadmin), с возможностью массовой генерации партиями, гибкими скидками, лимитами, привязкой к тарифам/пользователям и применением в чекауте.

## База данных (Lovable Cloud)

### `promo_code_batches` (партии/кампании)
- `name` — название кампании (для группировки)
- `description`, `created_by`

### `promo_codes`
- `code` (uniq, upper) — сам код
- `batch_id` → batches (nullable)
- `discount_type`: `percent` | `fixed` | `free_period`
- `discount_value` numeric (% или ₽ или кол-во месяцев)
- `applies_to`: `all_plans` | `specific` — если specific, привязка через `promo_code_plans` (plan_id + опционально pricing_id)
- `bound_user_id` uuid nullable — персональный код
- `max_uses` int nullable — общий лимит активаций (NULL = ∞)
- `used_count` int default 0
- `one_per_user` bool — каждый юзер применяет максимум 1 раз
- `starts_at`, `expires_at` timestamptz nullable
- `is_active` bool
- `created_at`, `created_by`

### `promo_code_plans`
- `promo_code_id`, `plan_id`, `pricing_id` (nullable)

### `promo_code_redemptions`
- `promo_code_id`, `user_id`, `subscription_id`, `order_id`, `discount_applied`, `redeemed_at`
- уникальный (promo_code_id, user_id) если `one_per_user`

Все таблицы — RLS:
- SELECT/INSERT/UPDATE/DELETE — `has_role(auth.uid(),'superadmin')`
- `promo_code_redemptions`: пользователь видит свои строки
- Применение кода идёт через SECURITY DEFINER функцию `apply_promo_code(code text, plan_id, pricing_id)` — возвращает рассчитанную скидку и записывает redemption атомарно (проверяет активность, даты, лимиты, привязку к юзеру/тарифу).

## Edge function `generate-promo-codes`
- Вход: `{ prefix, count, length, batch_name, discount_type, discount_value, applies_to, plan_ids?, pricing_ids?, max_uses?, one_per_user, starts_at?, expires_at?, bound_user_id? }`
- Генерирует уникальные коды формата `PREFIX-XXXXXX` (без похожих символов 0/O/1/I), вставляет батч и коды одной транзакцией, возвращает массив для CSV-экспорта.
- Защита от коллизий: retry на unique violation.

## Раздел в админке: `/admin/promo-codes`

Шаблон страницы — как в `SubscriptionPlans.tsx` / `EmailSettings.tsx`:
- `container mx-auto px-4 py-8 max-w-7xl space-y-6`
- Заголовок `h1 text-3xl font-bold` + подзаголовок
- Кнопки действий справа
- `AdminCenterLoader` для загрузки
- `Tabs` со вкладками

### Вкладки
1. **Промокоды** — таблица всех кодов с фильтрами (партия, статус, тариф, поиск). Колонки: код, скидка, область, использовано/лимит, срок, статус, действия (копировать, выкл/вкл, удалить). Массовое выделение → массовое удаление/деактивация.
2. **Партии** — список кампаний, кол-во кодов, суммарные активации, экспорт CSV партии, удаление партии (каскадом).
3. **Активации** — лог `promo_code_redemptions` с фильтром по коду/пользователю.

### Диалоги
- `CreatePromoCodeDialog` — одиночный код (ручной ввод кода либо автогенерация).
- `GeneratePromoBatchDialog` — массовая генерация: префикс (шаблон), кол-во, длина суффикса, все параметры скидки и лимитов, имя партии. После создания — модалка с превью + кнопка «Скачать CSV».
- `EditPromoCodeDialog` — редактирование одного кода.
- Подтверждения удаления через `AlertDialog`.

Все спиннеры — `ButtonSpinner` / `AdminCenterLoader`, тосты — `useToast`, стили — semantic tokens (без хардкода цветов).

## Интеграция с оплатой
- На странице оплаты/чекауте добавить поле «Промокод» + кнопку «Применить» (вызов `apply_promo_code` RPC, показ скидки, пересчёт суммы).
- При создании `payment_orders` / `subscriptions` сохранять `promo_code_id`, рассчитанная скидка передаётся в Robokassa (итоговая сумма).
- Запись `promo_code_redemptions` фиксируется в edge function payment-callback после успешной оплаты.
- `free_period` — после успеха увеличивает `end_date` подписки на N месяцев без оплаты (для 100% бесплатного периода — `skipPayment`-ветка с активной подпиской сразу).

## Навигация и доступ
- В `src/components/AppSidebar.tsx` добавить пункт `{ to: "/admin/promo-codes", label: "Промокоды", icon: Ticket, requiresSuperAdmin: true }` рядом с «Тарифы».
- В `src/App.tsx` — маршрут с `AdminModuleRoute` (новый enum `promo_codes` в `admin_module` через миграцию).
- Создать `src/pages/admin/PromoCodes.tsx` и хуки в `src/hooks/usePromoCodes.ts` (React Query).

## Технические детали
- Все имена/тексты на русском (правило проекта).
- Темная тема, semantic tokens.
- Таблицы — горизонтальный скролл (правило `Responsive Table Scroll`).
- Все мутации через React Query c `invalidateQueries(['promo-codes'])`.
- CSV-экспорт на клиенте (`Blob` + `URL.createObjectURL`).
- Поле «Привязка к пользователю» — поиск по email через `profiles`.

## Этапы реализации
1. Миграция: таблицы + RLS + GRANT + RPC `apply_promo_code` + расширение enum `admin_module`.
2. Edge function `generate-promo-codes`.
3. Хуки `usePromoCodes`, `usePromoBatches`, `usePromoRedemptions`.
4. Страница `PromoCodes.tsx` с вкладками и диалогами.
5. Подключение в `AppSidebar` и `App.tsx`.
6. Интеграция в чекаут (поле «Промокод» + пересчёт суммы) и payment-callback (фиксация redemption).
