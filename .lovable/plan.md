# Починить ссылку подтверждения email

## Причина проблемы

Сейчас письмо ведёт на `https://api.reage.life/functions/v1/confirm-email-token?token=...`. Это прокси РКН-обхода Supabase, и он, судя по скриншоту, отдаёт HTML-ответ функции с неверным `Content-Type` (без `text/html; charset=utf-8`):

- браузер показывает **исходный HTML как текст** (значит content-type не `text/html`);
- кириллица превратилась в `РїРѕРґС‚РІРµСЂР¶РґС‘РЅ` (UTF-8, прочитанный как windows-1251) — `charset` не дошёл.

Сама edge-функция возвращает корректные заголовки, но nginx-прокси `api.reage.life` настроен под JSON-API Supabase и перебивает/нормализует заголовки. Чинить чужой nginx мы не можем, и трогать прокси, через который ходит всё приложение, рискованно.

## Решение

Использовать уже существующую SPA-страницу `/verify-email` на `reage.life` (роут есть в `App.tsx`, компонент `src/pages/VerifyEmail.tsx` уже умеет читать `?token=` и вызывать `confirm-email-token` через `supabase.functions.invoke` — это обычный JSON-вызов, прокси такие отдаёт правильно).

## Изменения

1. **`supabase/functions/send-verification-email/index.ts`**
   - Заменить формирование ссылки:
     ```ts
     const verifyUrl = `${APP_URL}/verify-email?token=${tokenRow.token}`
     ```
   - Убрать `FUNCTIONS_BASE` и `PUBLIC_FUNCTIONS_URL` — не нужны.

2. **`supabase/functions/confirm-email-token/index.ts`** — оставить как есть (POST-ветка для SPA уже работает; GET-ветка с HTML остаётся как fallback, но из писем дёргаться не будет).

3. **Деплой** `send-verification-email`.

## Итоговая ссылка в письме

`https://reage.life/verify-email?token=<uuid>` → SPA → POST к `api.reage.life/functions/v1/confirm-email-token` (JSON) → брендированный экран успеха/ошибки на самом сайте.

## Проверка

Запросить новое письмо → кликнуть → должна открыться страница `/verify-email` с зелёной галкой; в БД `profiles.email_verified = true`, `email_verification_tokens.used_at` заполнен.
