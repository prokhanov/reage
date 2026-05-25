# Ревизия: «ничего не грузится» после логина — это HAProxy, а не фронт

## Диагноз

Симптом «запросы на `api-test.reage.life` висят/таймаутят» при здоровом Supabase = классический баг конфигурации HAProxy:

1. **Нет `resolvers` блока.** В текущем `haproxy.cfg` бэкенд `supabase` объявлен как `server supabase ilxgodhosirhhkffqryw.supabase.co:443 ssl ...`. HAProxy резолвит этот DNS **один раз при старте** и кэширует навсегда. Supabase сидит за Cloudflare, IP-адреса ротируются — через какое-то время кэш указывает на «мёртвые» IP → TCP открывается, но висит до `timeout server 300s`. Это ровно то, что ты описываешь.
2. **`http-request del-header Accept-Encoding`** — лишнее. Supabase отлично жмёт ответы, удаление заголовка увеличивает payload и иногда триггерит странности у Cloudflare. Убрать.
3. **Нет `option httpchk`/health-check на бэкенде** — HAProxy не знает, что апстрим мёртв, и продолжает на него слать.
4. **Нет `http-reuse`/`option http-server-close`** — для HTTPS-апстрима через Cloudflare надёжнее `http-reuse safe` и явный close, иначе keep-alive застревает.
5. **Нет проброса `X-Forwarded-For` / `X-Forwarded-Proto`** — некритично для работы, но полезно для логов.

Доп. мысль: после правки HAProxy фронт-код всё равно стоит подстраховать — гварды ролей (`PatientRoute`, `StaffRoute`, `SuperAdminRoute`, `AdminModuleRoute`) сейчас вызывают `supabase.auth.getUser()` и select из `user_roles` **без таймаута**. Если в будущем апстрим снова моргнёт — экран опять будет вечным спиннером. Это вторая, маленькая правка.

## Что меняем

### 1) `haproxy.cfg` — основное

Полностью переписываем с учётом найденного:

```haproxy
global
    log stdout format raw local0
    maxconn 4096

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option forwardfor
    option http-server-close
    http-reuse safe

    timeout connect 10s
    timeout client  60s
    timeout server  60s
    timeout http-request  15s
    timeout http-keep-alive 30s
    timeout tunnel 1h          # для websocket/realtime

# Публичный DNS, чтобы HAProxy переcпрашивал IP Supabase
resolvers public_dns
    nameserver cf1 1.1.1.1:53
    nameserver cf2 1.0.0.1:53
    nameserver g1  8.8.8.8:53
    resolve_retries 3
    timeout resolve 2s
    timeout retry   1s
    hold valid     30s          # перерезолв каждые 30с
    hold other     10s
    hold refused   10s
    hold nx        10s
    hold timeout   5s

frontend http_in
    bind *:80
    http-request set-header X-Forwarded-Proto https if { ssl_fc }

    acl host_api hdr(host) -i api-test.reage.life
    use_backend supabase_backend if host_api

    default_backend react_frontend

backend react_frontend
    server frontend 127.0.0.1:8080 check inter 5s

backend supabase_backend
    # Apex Supabase ждёт правильный SNI/Host
    http-request set-header Host ilxgodhosirhhkffqryw.supabase.co

    # лёгкий health-check на корень — Supabase отвечает 200/401, что HAProxy считает «жив»
    option httpchk GET /
    http-check send hdr Host ilxgodhosirhhkffqryw.supabase.co

    server supabase ilxgodhosirhhkffqryw.supabase.co:443 \
        ssl sni str(ilxgodhosirhhkffqryw.supabase.co) verify none \
        resolvers public_dns init-addr none \
        check inter 10s fall 3 rise 2
```

Ключевое:
- `resolvers public_dns` + `init-addr none` на server-строке → HAProxy сам перезапрашивает A-записи Supabase каждые 30с, проблема с устаревшим IP уходит.
- `option httpchk` + `check` → если апстрим мёртв, HAProxy быстро это видит и возвращает 503 (а не висит 5 минут).
- `timeout server 60s` вместо 300s → клиенту быстрее становится понятно, что что-то не так.
- `timeout tunnel 1h` → realtime/websocket не будут рваться.
- Удалили `del-header Accept-Encoding`.

### 2) Фронт-страховка от вечного спиннера (минимальные правки)

Чтобы при будущих сбоях прокси не было белого экрана:

- **`src/lib/authTimeout.ts`** — добавить универсальный хелпер `withTimeout(promise, ms)`.
- **`src/components/PatientRoute.tsx`, `StaffRoute.tsx`, `SuperAdminRoute.tsx`, `AdminModuleRoute.tsx`** — обернуть запросы ролей в `withTimeout(5000)`. При таймауте — показать видимую плашку «Не удалось загрузить данные. Повторить?» вместо вечного спиннера. Не редиректить молча в `/profile` по сетевой ошибке.
- **`src/pages/Index.tsx`** — `redirectByRole()` тоже в `withTimeout(3000)`; при таймауте fallback → `/dashboard`.

Логика ролей и RLS не меняются. Это чистая UX-страховка.

## Что НЕ трогаем

- `Dockerfile`, `nginx-mini.conf`, `supabase/client.ts`, `.env` — не нужны.
- Coolify-переменные — у тебя там всё правильно.
- Caddyfile (если остался в репо) — отдельная задача почистить.

## Технические заметки

- HAProxy нужно **перезапустить** (не reload без `-W`), чтобы перечитать `resolvers`. В Coolify — пересоздать контейнер прокси.
- `verify none` оставлен, потому что Cloudflare-серт всё равно валиден, но цепочку HAProxy без `ca-file` может не подтвердить. Если хочешь жёстко — добавь `ca-file /etc/ssl/certs/ca-certificates.crt verify required`.
- После применения проверь `echo "show servers state" | socat - /var/run/haproxy.sock` (если включён admin socket) — увидишь, что `supabase` периодически перерезолвится.

## Как проверить, что починилось

1. Открыть `https://test.reage.life`, залогиниться → `/dashboard` грузится за ≤ 2с.
2. DevTools → Network: запросы на `api-test.reage.life/auth/v1/user`, `/rest/v1/user_roles` отдают 200, time < 500мс.
3. Перезапустить HAProxy → проверить, что после рестарта всё продолжает работать, и через 30+ минут (когда раньше IP «протухал») — тоже.
4. Если что-то всё-таки моргнёт — фронт покажет плашку с «Повторить», а не белый экран.