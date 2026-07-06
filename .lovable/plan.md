## Диагноз

Пример ссылки из письма: `https://test.reage.life/email-unsubscribe?token=4b39b4f0-0ddd-4fef-b4c9-3191066c9d0f`.

Три независимых бага:

1. **Путь `/email-unsubscribe` не существует** — его нет в `src/App.tsx` и нет в `deploy/nginx/default.conf` (whitelist). На прод nginx отдаёт 404 (см. памятку: SPA-fallback только по whitelist). Именно это и видит пользователь.
2. **Ссылка ведёт на test-домен** — Lovable email-API берёт публичный URL из настроек Lovable-проекта (`test.reage.life`), а прод (Coolify, `reage.life`) он не знает. База Supabase у test и прод одна → очередь одна → footer генерируется единственным base URL.
3. **`src/pages/Unsubscribe.tsx` бьёт напрямую в `*.supabase.co`** и в функцию `drip-unsubscribe` (HMAC-токены). Токен из футера — UUID из таблицы `email_unsubscribe_tokens`, обрабатывается `handle-email-unsubscribe`. Прямой домен Supabase вдобавок нарушает правило памятки про `api.reage.life` (блокировки РКН).

## Что делаем

### 1. Новый универсальный роут `/email-unsubscribe`

- Добавить в `src/App.tsx` роут `/email-unsubscribe` → компонент `Unsubscribe` (тот же).
- Оставить существующий роут `/unsubscribe` как алиас (для старых drip-ссылок из уже отправленных писем — обратная совместимость).
- В `deploy/nginx/default.conf` рядом со строкой `/unsubscribe` добавить:
  ```
  location = /email-unsubscribe { try_files /index.html =404; }
  ```
- Пометить в конфиге комментарием, что это путь, который использует Lovable email-API (не переименовывать).

### 2. Универсальный `Unsubscribe.tsx`

Переписать логику так, чтобы страница работала для обоих типов токенов и **не** хардкодила `*.supabase.co`:

- Импортировать общий клиент: `import { supabase } from "@/integrations/supabase/client"` — он уже использует `VITE_SUPABASE_URL` = `https://api.reage.life` в прод-сборке (Fly-прокси, обход РКН).
- Определять тип токена по формату:
  - UUID (`^[0-9a-f-]{36}$`) → `handle-email-unsubscribe` (GET-валидация, POST-подтверждение) — футер транзакционных/auth-писем.
  - Иначе (base64.base64 через точку) → `drip-unsubscribe` — HMAC из drip-серии.
- Вызовы через `supabase.functions.invoke(...)`, а не `fetch` на прямой URL. Это автоматически подтягивает `apikey`, `Authorization: anon` и корректный base URL.
- UI-состояния (loading / ready / done / error / already_unsubscribed) сохраняем; добавить текст «вы больше не будете получать письма серии …» / «вы отписаны от всех уведомлений» в зависимости от ответа.

### 3. Кросс-доменный редирект test → прод

Даже с рабочим роутом пользователи будут падать на `test.reage.life`. Два варианта, оба реализуемые без правки Lovable:

- **Основной (в React):** в самом `Unsubscribe.tsx` при монтировании — если `window.location.hostname === "test.reage.life"`, сразу `window.location.replace("https://reage.life/email-unsubscribe" + window.location.search)` **до** любых сетевых вызовов. Токен универсальный (одна БД), обработается на прод-фронте.
- **Дублирующий (в nginx test — если используется отдельный конфиг):** `location = /email-unsubscribe { return 301 https://reage.life$request_uri; }`. Если test.reage.life хостится на Lovable без своего nginx — этот шаг пропускаем и полагаемся только на React-редирект.

Итог: любые письма Lovable-инфры (пока base URL = test) в итоге приземлятся на прод. Позже, если Lovable-настройки проекта переключим на `reage.life`, футер сразу пойдёт правильно, а редирект просто перестанет срабатывать.

### 4. Проверка после деплоя

- Прямое открытие `https://reage.life/email-unsubscribe?token=<UUID>` → страница «Подтвердить отписку» → успех.
- Прямое открытие `https://reage.life/unsubscribe?token=<HMAC>` (старая drip-ссылка) → работает как раньше.
- `https://test.reage.life/email-unsubscribe?token=…` → мгновенный 301/replace на прод.
- F5, инкогнито, переход из письма — везде без 404.
- В `Network` — запросы уходят на `api.reage.life/functions/v1/...`, а не на `*.supabase.co`.

## Что НЕ меняем

- `handle-email-unsubscribe`, `drip-unsubscribe`, `process-email-queue`, `email_unsubscribe_tokens`, `email_unsubscribes` — трогать не нужно, backend уже корректный.
- Публичный URL Lovable-проекта — не переключаем на прод, иначе сломаем превью и test-стенд. Проблему решает клиентский редирект.
- `/unsubscribe` не удаляем, оставляем ради уже разосланных drip-ссылок.

## Технические детали

Файлы:
- `src/pages/Unsubscribe.tsx` — переписать: убрать `FN_URL`, использовать `supabase.functions.invoke`, добавить определение типа токена, добавить редирект с test-домена.
- `src/App.tsx` — добавить `<Route path="/email-unsubscribe" element={<Unsubscribe />} />`.
- `deploy/nginx/default.conf` — добавить `location = /email-unsubscribe { try_files /index.html =404; }` с комментарием.

Ассеты не задействованы. Миграции БД не нужны. Edge Functions не пересобираем.

## Открытые вопросы

Ни одного блокирующего — если позже вы захотите заодно переключить Lovable-проекта на прод-URL, это сделается в интерфейсе Lovable, а не в коде, и мой редирект тогда просто перестанет срабатывать.
