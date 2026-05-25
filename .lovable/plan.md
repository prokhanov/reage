# Переход с nginx на Caddy

## Что меняется

Заменяем nginx на Caddy в Docker-образе. Caddy решает текущие проблемы автоматически:
- **Keepalive к upstream** — включён по умолчанию, не нужны `upstream{}` блоки
- **DNS пересолв** — динамический, контейнер не падает если Supabase DNS моргнул на старте
- **HTTP/2 к upstream** — из коробки, меньше handshake-ов
- **TLS session reuse** — корректно работает с CloudFlare-фронтендом Supabase

Конфиг сокращается с ~60 строк nginx до ~15 строк Caddyfile.

## Файлы

### 1. `Caddyfile` (новый, в корне проекта)

```
{
    auto_https off
}

# Прокси к Supabase REST/Auth/Storage/Realtime
:80 {
    @api host api-test.reage.life
    handle @api {
        reverse_proxy https://ilxgodhosirhhkffqryw.supabase.co {
            header_up Host ilxgodhosirhhkffqryw.supabase.co
            header_up -Accept-Encoding
            transport http {
                tls
                tls_server_name ilxgodhosirhhkffqryw.supabase.co
                keepalive 60s
                keepalive_idle_conns 64
                versions h2 1.1
            }
        }
    }

    # SPA для test.reage.life и всего остального
    handle {
        root * /usr/share/caddy
        try_files {path} /index.html
        file_server
    }
}
```

Что важно:
- `auto_https off` — TLS терминирует внешний слой (CloudFlare/ingress), Caddy слушает только `:80`
- `transport http { tls ... keepalive ... }` — пул переиспользуемых TLS-соединений к Supabase, это и есть фикс 12-секундной очереди
- `header_up -Accept-Encoding` — Supabase возвращает gzip который ломает потоковую отдачу, отключаем (как в текущем nginx)
- `try_files` — SPA fallback на `index.html` для React Router

### 2. `Dockerfile` (заменить второй stage)

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsx scripts/generate-sitemap.ts && npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
```

Первый stage не трогаем — билд React остаётся как был.

### 3. `nginx.conf` — удалить

Файл больше не нужен.

## План тестирования

1. После деплоя проверить `https://test.reage.life/` — лендинг отдаётся
2. Проверить `https://api-test.reage.life/rest/v1/...` с валидным `apikey` — должен вернуть JSON
3. Открыть `/analyses/` залогиненным пользователем — список грузится <1с (вместо 12с)
4. Открыть DevTools → Network → проверить что повторные запросы к `api-test.reage.life` идут по тому же connection (Connection ID одинаковый)
5. Проверить Realtime (WebSocket) — `reverse_proxy` в Caddy поддерживает WS автоматически, отдельной location не нужно

## Откат

Если что-то ломается — вернуть старый `Dockerfile` и `nginx.conf` из git. Никаких изменений в коде приложения нет, только инфраструктура.

## Что НЕ меняется

- Код фронтенда (`src/`)
- Edge functions
- Supabase конфигурация
- DNS записи на `test.reage.life` / `api-test.reage.life`
- Внешний TLS / CloudFlare настройки
