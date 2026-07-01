# План: письмо об успешной оплате подписки

## Что делаем
После успешного callback от Робокассы отправляем пользователю письмо с подтверждением оплаты, описанием тарифа и условий. Шаблон редактируется в суперадминке (раздел Email → Технические — там уже видны шаблоны `feedback-notification` и `password-changed`, добавится `subscription-activated`).

## 1. Новый email-шаблон
Файл: `supabase/functions/_shared/transactional-email-templates/subscription-activated.tsx`

Props:
- `name` — имя пользователя
- `planName` — название тарифа (из `subscription_plans.name`)
- `planType` — период (`annual` и т.п.), рендерим как «Годовая подписка»
- `amount` — итоговая сумма
- `originalAmount`, `discountAmount`, `promoCode` — если был промокод (опционально)
- `startDate`, `endDate` — период действия (форматируем `ru-RU`)
- `invId` — номер счёта
- `siteName`, `dashboardUrl`

Структура письма (в стиле `password-changed.tsx`, белый фон, брендовые токены):
1. Заголовок «Оплата прошла. Подписка активирована».
2. Приветствие по имени.
3. Блок «Ваш тариф»: название, период, дата начала/окончания, сумма (с расшифровкой скидки, если была), номер счёта.
4. Блок «Что входит в подписку» — короткое саммари условий (годовой мониторинг, отчёты, ИИ-ассистент, чек-апы) как статический текст в шаблоне; редактируется через Технические шаблоны.
5. CTA-текстовая ссылка на Контрольную панель.
6. Служебный футер (юр. лицо, поддержка `team@reage.life`). Отписку/юник-токены не трогаем — их добавит инфраструктура.

Регистрируем шаблон в `supabase/functions/_shared/transactional-email-templates/registry.ts` под ключом `subscription-activated`, `subject: 'Подписка ReAge активирована'`, добавляем `previewData` для превью в админке.

## 2. Триггер отправки в `robokassa-result`
Файл: `supabase/functions/robokassa-result/index.ts` — единственная точка, где мы гарантированно знаем, что оплата подтверждена подписью и подписка создана.

После успешного `insert` в `subscriptions` (перед финальным `payment_callback_log` insert):

- Пропускаем отправку, если `isAdminTest` (там подписка не создаётся — уже есть `return` выше, ок).
- Подтягиваем данные для письма одним батчем:
  - `profiles` → `email`, `first_name`, `name`
  - `subscription_plans` → `name` по `order.plan_id`
  - используем уже загруженные `pricing` (period/duration) и `promoInfo`
- Формируем ссылку `dashboardUrl = https://reage.life/dashboard` (SITE_URL уже есть в проекте — берём через `Deno.env.get('SITE_URL')` с фолбэком на `https://reage.life`).
- Вызов:
  ```ts
  await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'subscription-activated',
      recipientEmail: profile.email,
      idempotencyKey: `sub-activated-${order.id}`,
      templateData: { name, planName, planType, amount, originalAmount, discountAmount, promoCode, startDate, endDate, invId, siteName: 'ReAge', dashboardUrl },
    },
  });
  ```
- Оборачиваем в `try/catch` с `console.error` — отказ отправки письма не должен ломать ответ `OK{invId}` Робокассе (иначе будут ретраи и «двойная» активация).
- Идемпотентность обеспечивает `idempotencyKey = sub-activated-${order.id}`: повторный callback (или ретрай Робокассы) не создаст второе письмо.

Ветка `if (order.status === "paid")` в начале — там письмо не шлём (первичная отправка уже была; повторную защищает idempotencyKey всё равно).

## 3. Тестовые/боевые платежи
- `is_test = true` (тестовый режим шлюза) — подписка создаётся, письмо шлём: удобно для проверки. Если не хотим спамить в тесте — добавляем `if (!isTest)` перед invoke. По умолчанию **шлём в обоих режимах**, т.к. это единственный способ отладить письмо end-to-end.
- `admin_test = true` — уже отсекается ранним `return`, письмо не уйдёт.

## 4. Деплой
После правок обязательно деплоим:
- `send-transactional-email` (обновится registry с новым шаблоном)
- `robokassa-result`

## 5. Проверка
1. В суперадминке → Email → Технические: убедиться, что появился шаблон `subscription-activated`, превью рендерится.
2. В админке → Платёжный шлюз → «Тест оплаты» (или тестовая карта в sandbox) провести оплату на реальный email пользователя.
3. Проверить `email_send_log`: одна запись `sub-activated-<orderId>`, статус `sent`.
4. Повторить callback (Робокасса шлёт несколько раз) — второго письма быть не должно (idempotency).

## Что НЕ трогаем
- `handle_new_user` (там insert `subscriptions` без оплаты) — там письма нет, это правильно: письмо только по факту оплаты через шлюз.
- Регистрационный триггер drip (`trg_drip_on_subscription_active`) — оставляем как есть, письмо об активации это отдельный транзакционный канал, не marketing drip.
- Клиентскую страницу `/subscription/success` — она только опрашивает статус, письмо шлётся серверно.
