## Причина 404

В `deploy/nginx/default.conf` есть жёсткий whitelist SPA-маршрутов (требование Яндекса — несуществующие пути отдают 404, а не index.html). Маршрут `/verify-email` в коде React есть, но в nginx его забыли добавить — поэтому ссылка из письма попадает в `location /` → `return 404` → кастомная `404.html`. Это та же история, что была с `/subscription/success`.

## Что делаю

1. **Чиню корень проблемы — nginx**
   В `deploy/nginx/default.conf` в блок «Whitelist SPA-маршрутов» добавляю строку:
   ```nginx
   location = /verify-email      { try_files /index.html =404; }
   ```
   Ставлю её рядом с `/reset-password`, чтобы группировка осталась логичной (auth-flow страницы).

2. **Страховка через root-link в письме**
   В `supabase/functions/send-verification-email/index.ts` меняю формирование ссылки:
   - сейчас: `${APP_URL}/verify-email?token=${tokenRow.token}`
   - станет: `${APP_URL}/?verify_email_token=${tokenRow.token}`
   Корень `/` уже в whitelist — 404 невозможен даже если nginx не передеплоят.

3. **Обработчик токена на главной**
   На странице `src/pages/Index.tsx` (или в общем listener-компоненте уровня App) при монтировании:
   - читаю `verify_email_token` из `useSearchParams`;
   - если есть — вызываю `supabase.functions.invoke("confirm-email-token", { body: { token } })`;
   - показываю результат через тот же UI, что в `VerifyEmail.tsx` (Dialog/Toast с success/expired/already_used/not_found);
   - чищу токен из адресной строки через `window.history.replaceState(null, "", "/")`, чтобы пользователь не таскал его дальше и не зашёрил случайно.

4. **Совместимость со старыми письмами**
   Маршрут `/verify-email` и страница `VerifyEmail.tsx` остаются на месте — старые письма с `?token=...` продолжат работать после деплоя nginx.

5. **Деплой**
   - Передеплоить `send-verification-email` (новый формат ссылки).
   - nginx-конфиг применяется при пересборке/перезапуске прод-контейнера (Coolify) — это вне sandbox, я просто правлю файл в репозитории, владелец передеплоит инфру отдельно.

## Проверка

- Запросить новое письмо подтверждения.
- Перейти по новой ссылке `https://reage.life/?verify_email_token=...` — должен открыться лендинг, токен исчезает из URL, появляется экран успеха.
- Перейти по старой ссылке `https://reage.life/verify-email?token=...` (после передеплоя nginx) — открывается страница `VerifyEmail` с тем же результатом.
- В БД: `profiles.email_verified = true`, `email_verification_tokens.used_at` заполнен.

## Технические детали

Файлы под изменение:
- `deploy/nginx/default.conf` — +1 строка whitelist.
- `supabase/functions/send-verification-email/index.ts` — заменить `verifyUrl`.
- `src/pages/Index.tsx` (или новый `useEmailTokenFromQuery` hook, подключённый в `App.tsx` рядом с `EmailVerificationListener`) — обработка `verify_email_token`.

Никаких изменений в DNS, домене, `test.reage.life` или схеме БД не требуется.