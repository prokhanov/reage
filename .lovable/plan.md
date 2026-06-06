## Цель
В личном профиле (страница `/profile`, общая для пациента и сотрудника) дать возможность добавить или изменить номер телефона с подтверждением через SMS-код (SMSAero).

## UX (в `Profile.tsx` + `EditProfileDialog.tsx`)

На странице профиля и в диалоге редактирования — отдельный блок «Телефон»:

- Поле ввода номера с маской и выбором страны (используем уже существующий `PhoneInput` из `src/components/ui/phone-input.tsx`).
- Справа от поля — мини-кнопка **«Подтвердить»** (компактная, иконка ✓). Активна, только если номер валиден и отличается от текущего сохранённого.
- После нажатия:
  1. Кнопка превращается в строку с 4-значным `InputOTP` + текстом «Код отправлен на …», ссылкой «Изменить номер» и таймером повторной отправки.
  2. После корректного ввода кода номер сохраняется в `profiles.phone` (нормализованный, только цифры), показывается toast «Номер подтверждён», блок сворачивается обратно с зелёной галочкой «Подтверждён».
- Рядом с уже сохранённым номером — бейдж «Подтверждён» (зелёный) либо «Не подтверждён» (серый), кнопка «Изменить».
- Если пользователь стирает поле и нажимает «Сохранить» — номер можно очистить без OTP (удаление не требует подтверждения).

Та же логика доступна и сотрудникам, т.к. страница профиля одна.

## Бэкенд

### Новые/доработанные edge-функции

1. **`phone-change-send`** (новая) — пользователь должен быть авторизован (`verify_jwt = true` через ручную проверку токена, как в остальных функциях; берём `auth.uid()` из заголовка).
   - Принимает `{ phone }`, нормализует.
   - Проверяет: номер не занят другим пользователем (через `profiles.phone`), пользователь не превысил лимит (10/сутки, 60 сек cooldown — те же правила, что в `phone-otp-send`).
   - Генерирует 4-значный код, хэширует SHA-256 и сохраняет в `phone_otp_codes` с дополнительным полем `purpose = 'change'` и `user_id` (см. миграцию ниже).
   - Отправляет SMS через существующий `_shared/smsaero.ts` (`sendSms`).
   - Возвращает `{ ok: true, resendInSec }` или `{ ok: false, error }` (200 на бизнес-ошибки).

2. **`phone-change-verify`** (новая) — авторизованный пользователь.
   - Принимает `{ phone, code }`.
   - Проверяет последний неподтверждённый код по `(user_id, phone, purpose='change')`, не истёк, не более 5 попыток, хэш совпадает.
   - При успехе: помечает `consumed_at`, обновляет `profiles.phone = <нормализованный номер>` и `profiles.phone_verified_at = now()` (новое поле).
   - Возвращает `{ ok: true }` или `{ ok: false, error }`.

### Миграция БД

- В `phone_otp_codes` добавить:
  - `purpose text NOT NULL DEFAULT 'login'` (значения: `login`, `change`).
  - `user_id uuid NULL` (для `purpose='change'` — id владельца смены).
  - индекс на `(user_id, phone, purpose)`.
- В `profiles` добавить:
  - `phone_verified_at timestamptz NULL`.

RLS для `phone_otp_codes` оставляем закрытыми (доступ только через service role в edge-функциях).

### Клиент

- В `Profile.tsx` подгружать `phone` и `phone_verified_at` из `profiles`, передавать в `EditProfileDialog` и/или показывать в отдельной карточке.
- В `EditProfileDialog.tsx` добавить компонент `PhoneChangeField` (новый, `src/components/profile/PhoneChangeField.tsx`):
  - Состояния: `idle | sending | code | verifying | verified`.
  - Использует `supabase.functions.invoke("phone-change-send" | "phone-change-verify")`.
  - При успехе вызывает `onSuccess()` родителя (перезагрузка профиля).
- Сохранение остальных полей профиля идёт отдельной кнопкой «Сохранить», как сейчас; смена телефона — независимый поток.

## Технические детали

- Все SMS-сообщения шлются через уже подключённый SMSAero (`SMSAERO_EMAIL`, `SMSAERO_API_KEY` уже в секретах).
- Текст SMS: «Ваш код подтверждения номера в ReAge: {code}. Никому не сообщайте.»
- Нормализация: digits-only, с международным префиксом (используем тот же подход, что в `phone-input.tsx` — `guessCountry` + цифры).
- Логирование send-результата идёт в существующую таблицу логов SMS, если она используется в `sendSms`.
- CORS — используем стандартные `corsHeaders` из `npm:@supabase/supabase-js@2/cors`.

## Файлы

Создать:
- `supabase/functions/phone-change-send/index.ts`
- `supabase/functions/phone-change-verify/index.ts`
- `src/components/profile/PhoneChangeField.tsx`
- миграция: добавить колонки `purpose`, `user_id` в `phone_otp_codes` и `phone_verified_at` в `profiles`.

Изменить:
- `src/pages/Profile.tsx` — загрузка/отображение телефона + статус подтверждения.
- `src/components/profile/EditProfileDialog.tsx` — встроить `PhoneChangeField`.
