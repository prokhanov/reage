
# План: перенос только прокси `api-test.reage.life` на Fly.io

## Что меняем и что НЕ трогаем

Меняем:
- `api-test.reage.life` — переезжает с VPS/Coolify на Fly.io (Frankfurt).

Не трогаем:
- `test.reage.life` (фронт) — остаётся на Coolify/VPS как сейчас.
- `reage.life` (бой) — не трогаем вообще.
- Lovable Cloud / Supabase — без изменений.
- Код фронта в Lovable — без изменений, меняется только env-переменная в Coolify.

Итоговая схема:
```text
Браузер (RU)
  ├── test.reage.life ───────► Coolify VPS (nginx + dist)  ← как сейчас
  └── api-test.reage.life ──► Fly.io (Frankfurt, Node proxy)
                                  └─► ilxgodhosirhhkffqryw.supabase.co
```

## Что я подготовлю в репо (build-режим)

Папка `deploy/fly-proxy/` со всем готовым к копированию:
- `server.js` — последняя рабочая версия (IPv4-first DNS, raw-body, `/healthz`, `/__diag`, 30s timeout, аккуратный 502 с диагностикой).
- `package.json` — fastify + undici, `"start": "node server.js"`.
- `Dockerfile` — node:22-alpine, `PORT=8080`.
- `fly.toml.example` — шаблон с `internal_port = 8080`, `force_https = true`, health-check на `/healthz`.
- `.dockerignore` — чтобы не тащить лишнее.
- `README.md` — короткая шпаргалка с командами ниже.

## Пошаговая инструкция (для тебя, на Mac)

### Шаг 1. Fly.io аккаунт (5 мин)
1. https://fly.io → Sign up через GitHub.
2. Billing → Add card (без карты deploy не пустит, hobby всё равно $0).

### Шаг 2. flyctl на Mac (3 мин)
```bash
brew install flyctl
fly auth login
```

### Шаг 3. Скопировать готовую папку (2 мин)
1. Из репо после моего деплоя скачать папку `deploy/fly-proxy/` локально (любой способ: GitHub UI «Download», git pull, или просто скопировать 4 файла).
2. В Terminal:
   ```bash
   cd ~/Downloads/fly-proxy   # или куда положил
   ```

### Шаг 4. fly launch без авто-деплоя (5 мин)
```bash
fly launch --no-deploy --name reage-test-proxy --region fra --copy-config
```
На вопросы:
- Postgres → No
- Redis → No
- Tigris/Sentry → No

`--copy-config` подхватит мой `fly.toml.example` (предварительно переименуй его в `fly.toml` или Fly сам предложит). Если Fly попросит пересоздать `fly.toml` — соглашайся, потом проверь что `internal_port = 8080`.

### Шаг 5. Первый деплой (3 мин)
```bash
fly deploy
fly status
```
Должно быть `running`. Логи: `fly logs`.

### Шаг 6. Проверка на fly.dev (2 мин)
Открыть в браузере:
- `https://reage-test-proxy.fly.dev/healthz` → `{"ok":true}`
- `https://reage-test-proxy.fly.dev/__diag` → JSON с успешным DNS и HTTPS к Supabase

Если `__diag` показывает ошибку — стоп, разбираемся, дальше не идём.

### Шаг 7. DNS в reg.ru (5 мин)
В зоне `reage.life`:
1. Удалить `A api-test → <IP VPS>`.
2. Добавить `CNAME api-test → reage-test-proxy.fly.dev`, TTL `300`.
3. Сохранить.

### Шаг 8. SSL-сертификат на Fly (5–10 мин ожидания)
**Порядок важен — сначала DNS, потом certs.**
```bash
fly certs add api-test.reage.life -a reage-test-proxy
fly certs show api-test.reage.life -a reage-test-proxy
```
Ждать пока статус станет `Ready` (обычно 1–3 минуты после распространения DNS).

### Шаг 9. Финальная проверка прокси (2 мин)
- `https://api-test.reage.life/healthz` → `{"ok":true}`
- `https://api-test.reage.life/__diag` → ok

Если ok — прокси на Fly работает.

### Шаг 10. Переключить фронт в Coolify (5 мин)
В Coolify → проект `test.reage.life` → Environment:
- Убедиться что:
  ```
  VITE_SUPABASE_URL=https://api-test.reage.life
  ```
  (без trailing slash, без `/supabase`)
- Build Variable = ON.
- Redeploy (это build-time переменная Vite, нужен полный пересбор).

### Шаг 11. Проверка end-to-end (10 мин активно + сутки наблюдения)
1. Открыть `https://test.reage.life`, DevTools → Network.
2. Залогиниться. Проверить:
   - `POST /auth/v1/token` → 200
   - `GET /auth/v1/user` → 200
   - `/rest/v1/*` → 200
   - Все запросы < 500 мс, без 502/таймаутов.
3. Покликать страницы, обновлять, выйти/войти.
4. Сутки понаблюдать.

### Шаг 12. Отключить старый прокси на VPS (после суток ok)
В Coolify остановить контейнер старого прокси `api-test.reage.life`. VPS не удалять минимум неделю.

## Откат (если что-то пойдёт не так)

В reg.ru вернуть `A api-test → <IP VPS>` (TTL 300 → через 5 минут трафик снова идёт на старый прокси). В Coolify env вернуть прежнее значение `VITE_SUPABASE_URL` если оно отличалось и пересобрать. Ничего на Lovable/Supabase менять не нужно.

## Стоимость

Hobby plan Fly: 1 машина shared-cpu-1x@256MB + 160GB трафика бесплатно. Наш прокси в это укладывается с запасом. Реально $0.

## Технические заметки

- Fly регион `fra` (Frankfurt) — короткий маршрут до AWS us-east-1 (Supabase) через магистрали EU, и Fly anycast даёт стабильный entry-point из RU.
- `server.js` слушает `process.env.PORT || 8080` — Fly прокинет свой PORT автоматически.
- Health-check в `fly.toml` на `/healthz` каждые 15с — если контейнер зависает, Fly перезапустит.
- DNS Supabase резолвится `undici` свежим lookup на каждый коннект через Fly-резолверы — баг устаревших IP, как в HAProxy, здесь воспроизвести нельзя.
- CORS в `server.js` уже настроен правильно (он же сейчас работает), отдельные правки не нужны.

## Что я делаю после approval

Создам только файлы в `deploy/fly-proxy/` (server.js, package.json, Dockerfile, fly.toml.example, .dockerignore, README.md). Никаких изменений в коде приложения, никаких миграций в БД, никаких правок Lovable env.
