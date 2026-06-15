## Что добавлю в админку «Управление тарифами» (`/admin/subscription-plans`)

Две новые вкладки рядом с существующими «Тарифы» и «Цены и периоды»:

### 1. Вкладка «Тест оплаты»

Таблица: тариф × период × сумма × кнопка **«Оплатить как клиент»**.

Кнопка вызывает **ту же самую** edge-функцию `robokassa-create-payment` с `{ planId, pricingId }`, что и клиент со страницы `/subscription`, и редиректит текущего админа на страницу Робокассы. Никакой отдельной логики — поведение 1-в-1 как у клиента (включая режим тест/боевой из `payment_gateway_settings`).

Сверху — алерт, который показывает, в каком режиме сейчас платёжный шлюз (тестовый/боевой), берём из существующего хука `usePaymentGatewayTestMode`. Под кнопкой — предупреждение «оплата будет произведена от вашего админ-аккаунта, подписка активируется на него».

### 2. Вкладка «Логи оплат»

Два блока на одной странице:

**A. Заказы (`payment_orders`)** — таблица колонок:
- Дата создания
- `inv_id` (короткий ID для Робокассы)
- Пользователь (email/имя — джойн с `profiles`)
- Тариф + период (джойн с `subscription_plans`, `subscription_pricing`)
- Сумма (`out_sum`) / реально оплачено (`paid_amount`)
- Статус (`pending` / `paid` / `failed`) — цветной бейдж
- Тестовый ли (`is_test`)
- Дата оплаты (`paid_at`)
- Кнопка «Подробности» → диалог с полным `raw_callback` (JSON) и подписью.

Фильтры: статус (все/pending/paid/failed), поиск по email, последние 100 записей с пагинацией «загрузить ещё».

**B. Колбэки от Робокассы (`payment_callback_log`)** — таблица:
- Дата
- `inv_id`
- `signature_valid` ✅/❌
- `error` (если есть)
- Кнопка «Подробности» → диалог с полным `raw_body` и `headers`.

Это даст полную картину для дебага: что пришло от Робокассы, прошла ли подпись, привязалось ли к заказу.

### Технические детали

Новые файлы:
- `src/components/admin/pricing/AdminPaymentTester.tsx` — вкладка «Тест оплаты». Использует `useSubscriptionPlans({ includeInactivePlans: true, includeDisabledPricing: true })` и тот же `supabase.functions.invoke("robokassa-create-payment", ...)` + `window.location.href = data.url`.
- `src/components/admin/pricing/AdminPaymentLogs.tsx` — вкладка «Логи оплат». Два таб-секции / два списка.
- `src/components/admin/pricing/PaymentOrderDetailsDialog.tsx` — диалог с JSON-просмотром.

Правка одного файла:
- `src/pages/admin/SubscriptionPlans.tsx` — добавить два `TabsTrigger` и два `TabsContent`.

RLS на `payment_orders` и `payment_callback_log` уже позволяет суперадмину читать всё (policy «Superadmins view all payment orders», «Superadmins read callback log») — менять схему/политики не надо.

Edge-функция `robokassa-create-payment` уже умеет работать с любым авторизованным юзером (она берёт `user_id` из JWT) — никаких изменений в бэкенде не требуется.

### Проверка после реализации

1. Открываю вкладку «Тест оплаты» под суперадмином → вижу таблицу всех тарифов и периодов.
2. Жму «Оплатить как клиент» на любом → меня редиректит на Робокассу с правильной суммой.
3. После оплаты возвращаюсь во вкладку «Логи оплат» — вижу новую запись в `payment_orders` со статусом `paid` и колбэк в `payment_callback_log` с `signature_valid=true`.

Менять что-либо ещё (UI клиента, edge-функции, лендинг) не буду — задача чисто админская.