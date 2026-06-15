## Проблема

1. Колбэк по `InvId=1000007` упал: `robokassa-result` ставит несуществующий статус `test_paid` (CHECK допускает `pending|paid|failed`). Заказ остаётся `pending` → success-страница крутит «Подтверждаем оплату…».
2. Текущий флаг `payment_orders.is_test` смешивает два разных понятия: «шлюз в test-режиме» и «админ нажал Оплатить как клиент». Нужно их развести.

## Принципы

- **Тестовый режим шлюза** (`payment_gateway_settings.test_mode=true`): обычный поток, подписка активируется как в бою. Это просто площадка Робокассы.
- **Админская тест-оплата «Оплатить как клиент»**: никогда не активирует подписку, чей бы аккаунт ни использовался.
- Решение принимается по новому флагу на заказе, выставляемому только из админского тестера.

## Что меняем

### 1. БД — миграция
- Добавить колонку `payment_orders.admin_test boolean NOT NULL DEFAULT false`.
- Колонку `payment_orders.is_test` оставить как есть (она отражает test-режим шлюза для отладки логов).

### 2. Edge-функция `robokassa-create-payment`
- Принимать опциональный параметр `admin_test: boolean`.
- Разрешать его выставлять **только** если вызывающий пользователь — superadmin (проверка через `has_role(auth.uid(),'superadmin')`).
- Сохранять `admin_test` в создаваемый `payment_orders`.

### 3. Edge-функция `robokassa-result`
- Убрать статус `test_paid` полностью.
- Логика после валидации подписи и суммы:
  - Обновить заказ: `status='paid'`, `paid_amount`, `paid_at`, `robokassa_signature`, `raw_callback`.
  - Если `order.admin_test === true` → подписку **не** создавать, активные не трогать, в `payment_callback_log` записать `signature_valid=true`, `error=null`, плюс `console.log("admin test: subscription NOT activated")`.
  - Иначе (обычный платёж, включая test-режим шлюза) → текущая ветка активации подписки.
- Идемпотентность по `status==='paid'`.

### 4. Фронт `AdminPaymentTester`
- При вызове `supabase.functions.invoke("robokassa-create-payment", { body: { planId, pricingId, admin_test: true } })`.
- Видимая подпись на форме: «Это админская тест-оплата. Деньги в test-режиме шлюза не списываются. Подписка пользователя НЕ будет активирована.»

### 5. Фронт `SubscriptionSuccess.tsx`
- Если по заказу пришёл `status='paid'` и `admin_test=true`:
  - остановить ожидание подписки,
  - показать сообщение «Тестовый платёж проведён. Подписка намеренно не активирована (админский тест)» + кнопка «Назад в админку».
- Обычные платежи (включая `is_test=true` от шлюза) — без изменений: ждём подписку и редиректим.

### 6. Логи оплат в админке
- В таблице «Заказы» добавить колонку «Источник»: бейдж «админ-тест» (если `admin_test=true`), иначе «обычный».
- Колонка «Режим» (test/live шлюз) остаётся.
- В колбэках в детальном диалоге показывать `admin_test` связанного заказа.

## Что НЕ делаем

- Не чиним вручную заказ `1000007`.
- Не меняем CHECK на `payment_orders.status`.
- Триггер `notify_telegram_subscription_paid` не трогаем — для админ-тестов подписка не создаётся, уведомление и так не уйдёт.

## Файлы
- Миграция: `payment_orders.admin_test`.
- `supabase/functions/robokassa-create-payment/index.ts`
- `supabase/functions/robokassa-result/index.ts`
- `src/components/admin/pricing/AdminPaymentTester.tsx`
- `src/pages/SubscriptionSuccess.tsx`
- `src/components/admin/pricing/AdminPaymentLogs.tsx` (колонка «Источник»)