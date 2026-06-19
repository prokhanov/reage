## Идея (правильная, без test.reage.life и без DNS)

Делаем ссылку в письме сразу на edge function через ваш прокси:

```
https://api.reage.life/functions/v1/confirm-email-token?token=<UUID>
```

`api.reage.life` уже работает в РФ (прокси к Supabase). Edge function сама:
1. Валидирует токен.
2. Помечает `profiles.email_verified = true` и `email_verification_tokens.used_at`.
3. Возвращает **готовую самодостаточную HTML-страницу** с брендингом — успех / истекло / уже использовано / не найдено. На странице кнопка «Войти в личный кабинет» ведёт на `https://reage.life/login` (или другой нужный URL).

SPA вообще не участвует. Никаких `test.reage.life`. Никаких DNS-правок. Никаких nginx-локейшенов.

## Что меняем

### 1. `supabase/functions/confirm-email-token/index.ts` — переписать
- Принимает **GET** с `?token=...` (сейчас только POST с JSON-body).
- Сохраняем обратную совместимость: POST с body тоже работает (если где-то ещё дёргается из кода — не сломаем).
- На GET в ответ отдаёт `text/html` с инлайн-стилями (тёмная тема, логотип/название, статус, кнопка «Войти»).
- Состояния:
  - `success` → зелёная галка, «Email подтверждён», кнопка «Войти в личный кабинет» → `https://reage.life/login`.
  - `expired` → «Ссылка истекла», кнопка «Запросить новое письмо» → `https://reage.life/login` (там у вас уже есть resend).
  - `already_used` → «Email уже подтверждён ранее», кнопка «Войти».
  - `not_found` / `invalid` → «Ссылка недействительна», кнопка «На главную» → `https://reage.life`.
- Все ответы — `200` + HTML (а не 4xx/5xx), чтобы браузер показал страницу, а не дефолтный экран ошибки.

### 2. `supabase/functions/send-verification-email/index.ts` — поменять формирование ссылки
Сейчас:
```ts
const APP_URL = 'https://reage.life'
const verifyUrl = `${APP_URL}/verify-email?token=${tokenRow.token}`
```
Станет:
```ts
const FUNCTIONS_BASE =
  Deno.env.get('PUBLIC_FUNCTIONS_URL') || 'https://api.reage.life/functions/v1'
const verifyUrl = `${FUNCTIONS_BASE}/confirm-email-token?token=${tokenRow.token}`
```
Env-переменная — на будущее, если прокси переедет; по умолчанию ваш `api.reage.life`.

### 3. Деплой обеих функций
Лав-клауд сделает автоматически.

### 4. `verify_jwt = false` для `confirm-email-token`
Обязательно: ссылка из письма открывается без авторизации, JWT в URL нет. Проверю `supabase/config.toml` и при необходимости добавлю блок:
```toml
[functions.confirm-email-token]
verify_jwt = false
```

### 5. Что НЕ трогаю
- SPA-страницу `src/pages/VerifyEmail.tsx` оставляю как есть — она больше не используется ссылкой из письма, но никому не мешает. Удалить можно отдельной задачей, если захотите.
- `auth-email-hook`, drip, transactional templates — без изменений.
- Никакого test.reage.life нигде.

## Финальный вид ссылки в письме

```
https://api.reage.life/functions/v1/confirm-email-token?token=0860b714-e5e2-403c-9287-ac5496c30e48
```

Открывается мгновенно из РФ (через ваш прокси), показывает брендированную страницу-результат, ведёт пользователя в `https://reage.life/login`.

## Проверка после релиза
1. Зарегистрировать тестового пользователя → пришло письмо.
2. Кликнуть ссылку → открылась HTML-страница с зелёной галкой.
3. В БД `profiles.email_verified = true`, `email_verification_tokens.used_at` заполнен.
4. Повторный клик по той же ссылке → «уже использовано».

Подтвердите — переключайте в build mode, реализую.