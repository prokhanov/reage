## Проблема

В админке диалог «Редактировать подписку» (`EditSubscriptionDialog`) шлёт `UPDATE`/`INSERT` в `public.subscriptions` напрямую от клиента. На таблице есть только эти политики записи:

- `INSERT`: `auth.uid() = user_id AND status = 'pending'`
- `UPDATE`: `auth.uid() = user_id AND status = 'pending'`

Суперадмин не является владельцем подписки пациента → RLS блокирует и `UPDATE`, и `INSERT`. Ошибка PostgREST приходит и показывается в toast как «не удалось сохранить», но визуально это выглядит как «ничего не происходит».

## Что меняем

### 1. Миграция RLS на `public.subscriptions`
Добавить три политики для суперадмина (без ограничений по статусу — тестировщику нужно менять всё, включая `active`, даты, сумму):

```sql
CREATE POLICY "Superadmins can insert any subscription"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update any subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete any subscription"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));
```

Существующие пользовательские политики не трогаем.

### 2. `EditSubscriptionDialog.tsx`
- Сделать поля действительно произвольными для теста: убрать автоперезапись `endDate`/`amount` каждый раз при смене `pricing_id`, если поле уже было отредактировано вручную. Достаточно простого флага «pristine» либо: автоподстановка срабатывает только при смене `selectedPricingId` (не при смене `startDate`). Сейчас `useEffect` зависит ещё и от `startDate` и `availablePricing` — это перезатирает руками введённые значения.
- Сохранять `start_date`/`end_date` как полноценные ISO timestamps (`new Date(value).toISOString()`), чтобы дата экспирации совпадала с тем, что использует фронт (`end_date timestamptz`), а не как обрезанная `yyyy-MM-dd`-строка.
- Добавить поле `payment_method` (текст) — для тестов админу полезно явно менять способ оплаты (`robokassa`, `manual`, и т.п.).
- Текст ошибки из Supabase прокидывать в toast как есть (уже есть `error.message`), плюс добавить `console.error` с полным объектом — уже есть.

### 3. Проверка после миграции
Сразу после миграции из админки открыть диалог редактирования подписки конкретного пациента, сменить статус/даты/сумму, сохранить — запись должна обновиться, в `subscription_history` появится `updated`-запись.

## Что НЕ делаем
- Не открываем запись подписок для обычных пользователей шире, чем сейчас.
- Не трогаем `subscription_history` RLS (там `INSERT WITH CHECK (true)` уже работает).
- Не меняем триггер `notify_telegram_subscription_paid` (он сработает только если админ сам выставит status=active на ранее не-active записи — это допустимо для теста).

## Файлы
- Миграция: `subscriptions` RLS (3 политики для superadmin).
- `src/components/admin/EditSubscriptionDialog.tsx`: убрать перетирание полей, поддержать timestamptz, добавить `payment_method`.