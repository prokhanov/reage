## Идея

Повторяем рабочую схему «Подтвердите email»:
- свой токен в нашей таблице;
- ссылка в письме идёт на **корневой** URL `https://reage.life/?password_reset_token=...`, **не** через `api.reage.life/auth/v1/verify` (где Fly-прокси ломает gzip-редирект);
- на главной хэндлер ловит токен и показывает диалог «Введите новый пароль» (по аналогии с `VerifyEmailTokenHandler`).

Это соответствует памятке по инфре: «корневой URL менее чувствителен к ошибкам маршрутизации». Никакого `auth.resetPasswordForEmail`, никакого magic-link через прокси.

## Изменения

### 1. БД — таблица токенов
Новая таблица `public.password_reset_tokens`:
- `id`, `token uuid unique`, `user_id uuid → auth.users`, `email text`, `expires_at timestamptz` (TTL 30 мин), `used_at timestamptz`, `created_at`.
- RLS: только service_role читает/пишет (как `email_verification_tokens`).
- Триггер обновления `updated_at` не нужен.

### 2. Edge-функция `send-password-reset`
По образцу `send-verification-email`:
- вход: `{ email }`
- проверяет, что пользователь существует (admin API), берёт `user.id`;
- удаляет старые активные токены этого user_id, создаёт новый;
- формирует `resetUrl = ${APP_URL}/?password_reset_token=${token}`;
- ставит письмо в очередь через `send-transactional-email` с шаблоном `recovery` и `confirmationUrl = resetUrl`;
- `APP_URL` берём из `Deno.env.get('APP_URL')` — без хардкода (требование памятки).
- Возвращает `{ success: true }` без раскрытия, существует ли email.

### 3. Edge-функция `confirm-password-reset-token`
Два режима:
- `mode: 'verify'` — принимает token, проверяет (`not_found / expired / already_used / ok`), возвращает `{ ok, email }`. Токен не помечается использованным.
- `mode: 'apply'` — принимает `{ token, password }`, повторно проверяет, и через `supabase.auth.admin.updateUserById(user_id, { password })` ставит новый пароль, помечает токен `used_at = now()`. Возвращает `{ ok: true }`.

Валидация пароля: ≥6 символов, ≤72 (лимит bcrypt).

### 4. Auth.tsx — форма «Забыл пароль»
Заменить вызов `supabase.auth.resetPasswordForEmail(...)` на:
```ts
await supabase.functions.invoke('send-password-reset', { body: { email: forgotEmail } })
```
Текст тоста: «Если адрес зарегистрирован — мы отправили ссылку для сброса».

### 5. Новый компонент `PasswordResetTokenHandler.tsx`
Полный аналог `VerifyEmailTokenHandler`, но:
- читает `password_reset_token` из query;
- при наличии — сразу очищает URL (`history.replaceState`);
- вызывает `confirm-password-reset-token` с `mode: 'verify'`;
- при `ok` — показывает диалог с двумя `PasswordInput` («Новый пароль» / «Повторите»), кнопкой «Сохранить»;
- на submit — вызывает `mode: 'apply'`. Успех → CheckCircle + кнопка «Войти» (`/auth`). Ошибка → понятный текст + кнопка «Запросить новую ссылку» (`/auth`).
- Подключаем в `src/App.tsx` рядом с `VerifyEmailTokenHandler` (один раз, в корневом лейауте).

### 6. Шаблон `recovery.tsx`
Менять не нужно — он уже принимает `confirmationUrl`. Просто наш `send-password-reset` подставит туда наш корневой URL вместо supabase-verify-URL.

### 7. Старая страница `/reset-password`
Оставляем как есть для совместимости со старыми ссылками (вдруг кто-то откроет из старого письма). Дополнительно в `ResetPassword.tsx` обработаем случай `?password_reset_token=...` (редирект на `/?password_reset_token=...`), чтобы старая логика тоже работала.

### 8. Nginx / прокси / Telegram — не трогаем
- `/` уже в whitelist.
- `api.reage.life` остаётся как есть для штатных POST-запросов SDK.
- Никакого хардкода `reage.life` в коде edge-функции — только `APP_URL` из env (на test = `https://test.reage.life`, на prod = `https://reage.life`).

## Проверка
1. Test-стенд: «забыл пароль» → письмо с ссылкой `https://test.reage.life/?password_reset_token=...`.
2. Клик → главная открывается, диалог «Введите новый пароль».
3. Сохранить → успех → войти со старого/нового пароля — работает только новый.
4. Повторный клик по той же ссылке → «Ссылка уже использована».
5. Ссылка старше 30 мин → «Срок действия истёк».
6. Прод: то же самое, но домен `reage.life`.