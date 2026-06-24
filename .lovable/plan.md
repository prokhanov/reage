## Что произошло (диагноз)

У пациента «Алина Дарбинян» (id `d8d632d4-…`) в БД сейчас:

- `auth.users.email` = `alina@mail.ru` — реальный логин, не менялся.
- `profiles.email`   = `prokhanov@gmail.com` — это email суперадмина (`Антон Проханов`).

То есть «двойного аккаунта» нет, утечки сессии нет, логин по-прежнему работает по `alina@mail.ru`. Сломан только один столбец `profiles.email`, а админка показывает именно его — отсюда «каша».

## Откуда туда попал email суперадмина

Виновник — `src/components/admin/PatientBookingsCard.tsx`, компонент `SendRemindersDialog` (строки ~714–803). Логика отправки напоминаний делает так:

1. Поля «email» и «телефон» в диалоге это обычные `<Input>` без `autoComplete="off"`, предзаполненные `patient.email`.
2. Перед отправкой код сравнивает значение поля с исходным и, если отличается, тихо пишет его в профиль пациента:

```ts
if (emailOn && emailNorm && emailNorm !== initialEmail.trim().toLowerCase()) {
  patch.email = emailNorm;
}
…
await supabase.from("profiles").update(patch).eq("id", userId);
```

Достаточно браузерного autofill (Chrome подставляет сохранённый email суперадмина в любое поле `type=email`) или ручной правки «отправлю себе на тест» — и `profiles.email` пациента перезаписывается на админский. `auth.users.email` при этом не трогается, поэтому логин остаётся прежним, а в таблице пациентов появляется чужой email.

В CRM (`patient_interactions`) запись об этом не пишется — изменение проходит молча.

Дополнительно: edge-функция `resend-confirmation` (стр. 70–83) обновляет `profiles.email` только если `isOwnEmail`, поэтому она к этому случаю отношения не имеет; легальный путь смены email админом (`admin-change-user-email`) корректно меняет и auth, и профиль и логирует событие в CRM.

## Что чиню

### 1. Закрыть вектор перезаписи email/phone из диалога напоминаний

Файл: `src/components/admin/PatientBookingsCard.tsx`

- Убрать из `SendRemindersDialog` сайд-эффект `supabase.from("profiles").update(patch)`. Диалог — это «отправить уведомление», менять контактные данные пациента он не должен.
- Поля email/phone оставить редактируемыми (для разовой отправки на другой адрес), но:
  - Добавить `autoComplete="off"`, `name="reminder-email"` / `"reminder-phone"`, `inputMode`, чтобы Chrome не подставлял профиль админа.
  - Если значение в поле отличается от `initialEmail` / `initialPhone` — показывать предупреждение «Отправить разово, контакты пациента не будут изменены».
- Менять контакты пациента — только через явный путь: «Изменить email» (уже есть `admin-change-user-email`) и редактирование телефона в `PatientInfoDialog` / профиле пациента.

### 2. Защита на стороне БД от рассинхронизации profiles.email и auth.users.email

Миграция:

- Триггер `BEFORE UPDATE OF email ON public.profiles`: если `NEW.email` отличается от `auth.users.email` того же `id` — `RAISE EXCEPTION`. Исключение для service_role (триггер игнорируется, когда `current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'`), чтобы edge-функция `admin-change-user-email` могла работать — она и так синхронно меняет оба значения.
- Этим закрываем любой будущий клиентский путь, который попытается записать в `profiles.email` что-то отличное от auth.

### 3. Разовый откат данных Алины

Через миграцию `UPDATE`:

```sql
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS DISTINCT FROM au.email;
```

Это исправит не только Алину, но и любые другие профили, где `profiles.email` разъехался с `auth.users.email`. Перед этим — `SELECT` тех же строк, покажу список, чтобы вы подтвердили перезапись.

### 4. Аудит в CRM

В `admin-change-user-email` уже пишется запись в `patient_interactions` (`kind: 'admin_email_change'`). Ничего добавлять не нужно — после фикса (1) это единственный путь смены email админом, и он логируется.

## Что НЕ трогаю

- Не меняю auth-логин Алины (он и так корректный — `alina@mail.ru`).
- Не трогаю UI таблицы пациентов, экранов подписки, диалогов подтверждения email/phone — только источник записи.
- Не меняю edge-функции `resend-confirmation` и `admin-change-user-email`.

## Порядок действий после approve

1. Показать `SELECT` всех профилей, где `profiles.email <> auth.users.email`, чтобы вы видели объём перезаписи.
2. Применить миграцию: триггер защиты + bulk-`UPDATE` починки.
3. Поправить `PatientBookingsCard.tsx` (убрать сайд-эффект, autocomplete off, предупреждение о разовой отправке).
4. Прогнать build / typecheck.
