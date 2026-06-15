# reage-test-proxy (Fly.io)

Обратный прокси для `api-test.reage.life` → `ilxgodhosirhhkffqryw.supabase.co`.
Живёт на Fly.io во Frankfurt. Фронт `test.reage.life` остаётся на Coolify.

## Файлы

- `server.js` — Fastify + undici, IPv4-first DNS, raw-body, 30s timeout.
- `package.json` — зависимости.
- `Dockerfile` — node:22-alpine, слушает `PORT=8080`.
- `fly.toml.example` — шаблон конфига (переименуй в `fly.toml`).
- `.dockerignore` — отсечь лишнее.

## Эндпоинты

- `GET /healthz` — `{ ok: true }`. Используется Fly health-check'ом.
- `GET /__diag` — DNS + HTTPS до Supabase, для отладки.
- `*` — прокси на upstream.

## Деплой с нуля (Mac)

```bash
# 1. CLI
brew install flyctl
fly auth login

# 2. В этой папке
cp fly.toml.example fly.toml
fly launch --no-deploy --copy-config --name reage-test-proxy --region fra
# Postgres/Redis/Sentry → No

# 3. Деплой
fly deploy
fly status
fly logs

# 4. Проверка по fly.dev
open https://reage-test-proxy.fly.dev/healthz
open https://reage-test-proxy.fly.dev/__diag
```

## Подключение домена `api-test.reage.life`

1. В reg.ru DNS-зона `reage.life`:
   - Удалить `A api-test → <IP VPS>`.
   - Добавить `CNAME api-test → reage-test-proxy.fly.dev`, TTL 300.
2. Сертификат на Fly (после распространения DNS):

```bash
fly certs add api-test.reage.life -a reage-test-proxy
fly certs show api-test.reage.life -a reage-test-proxy   # ждать Ready
```

3. Проверка:

```bash
curl -i https://api-test.reage.life/healthz
curl -s https://api-test.reage.life/__diag | jq
```

## Переключение фронта в Coolify

В env проекта `test.reage.life`:

```
VITE_SUPABASE_URL=https://api-test.reage.life
```

Build Variable = ON. Redeploy (Vite — build-time).

## Обновление прокси

После любого изменения `server.js`:

```bash
fly deploy
```

## Откат

В reg.ru вернуть `A api-test → <IP VPS>`, TTL 300 → через 5 минут трафик снова через VPS.
Fly-приложение можно оставить или удалить: `fly apps destroy reage-test-proxy`.

## Robokassa callback

Result URL в личном кабинете Robokassa (и для тестового, и для боевого магазина):

```
https://api.reage.life/functions/v1/robokassa-result
```

- Метод: **POST**
- Подпись: **MD5**
- НЕ использовать прямой URL `https://ilxgodhosirhhkffqryw.supabase.co/...` — весь внешний трафик к edge-функциям идёт через `api.reage.life` (Fly → Supabase).
- Функция `robokassa-result` задеплоена с `verify_jwt = false` (см. `supabase/config.toml`), т.к. Робокасса не присылает пользовательский JWT. Аутентификация callback'а — по MD5-подписи с `ROBOKASSA_PASSWORD_2` / `ROBOKASSA_TEST_PASSWORD_2`.
- Success/Fail URL фронта: `https://reage.life/subscription/success` и `https://reage.life/subscription/fail` (на сам прокси НЕ направлять).
