## Контекст

Подтверждено: на страницах админки активно используется Supabase Realtime —
`src/pages/admin/Patients.tsx` (5 каналов), `src/pages/admin/PatientProfile.tsx` (5 каналов), `MyAssignments`, `AnalysisBookings`, `PatientInfoDialog`. Все они стартуют WebSocket к `/supabase/realtime/v1/websocket`.

Гипотеза (поддержанная типовыми отчётами): Safari через nginx reverse-proxy в режиме HTTP/2 нестабильно держит WS-апгрейд и стриминг — REST возвращает 200, а часть UI остаётся пустой, потому что подвисает event loop / suspense / повторные подписки.

## План: идти от дешёвых тестов к глубоким

Применяем по очереди, каждый шаг — отдельный commit + деплой, чтобы изолировать причину.

### Шаг A. Поправить nginx (без правки кода)

Файл `nginx.conf`, блок `location /supabase/`:
- Полностью отключить любую compression-логику для прокси: `proxy_set_header Accept-Encoding "";` и `gzip off;` внутри location.
- Подтвердить уже стоящие: `proxy_buffering off; proxy_request_buffering off; proxy_cache off; chunked_transfer_encoding off;` (сейчас стоит `on` — поменяем на `off`, т.к. PostgREST сам отдаёт нормальный Content-Length, а Safari иногда плохо ест chunked через прокси).

Блок `location /supabase/realtime/` оставляем как есть (там WS-апгрейд корректный).

Глобально (server-level) на Coolify/nginx-фронте, который терминирует TLS:
- Проверить директиву `listen 443 ssl http2;` — если есть, временно убрать `http2`, чтобы исключить Safari+HTTP/2+WS-issue. Этот файл, скорее всего, генерится Coolify — отметим в плане, что менять нужно через Coolify-конфиг.

### Шаг B. Заглушить Realtime под фичефлагом (если шаг A не помог)

Не вырываем подписки совсем — заворачиваем все `supabase.channel(...)` вызовы в проверку env-флага `VITE_DISABLE_REALTIME`:

```ts
if (import.meta.env.VITE_DISABLE_REALTIME !== "true") {
  const channel = supabase.channel(...).on(...).subscribe();
  // cleanup
}
```

Места правки:
- `src/pages/admin/Patients.tsx`
- `src/pages/admin/PatientProfile.tsx`
- `src/pages/admin/MyAssignments.tsx`
- `src/pages/admin/AnalysisBookings.tsx`
- `src/components/admin/PatientInfoDialog.tsx`

На test-окружении задать `VITE_DISABLE_REALTIME=true` в Coolify env и передеплоить. Если страница «Персональные отчёты» начинает грузиться в Safari без VPN → причина 100% в WS-канале.

### Шаг C. Если виноват WS — пофиксить нормально, не отключая

Варианты, по убыванию приоритета:
1. На странице **«Персональные отчёты»** (`Recommendations.tsx`) realtime не используется. Но при заходе в `/admin/patients/:id` (откуда обычно открывают отчёты) стартуют 5 каналов из `PatientProfile.tsx`. Уменьшить до 1 объединённого канала с фильтром по `user_id`.
2. Объединить 5 каналов `Patients.tsx` в 1 (по таблицам admin-list).
3. Добавить debounce/idle-init: подписку запускать через `requestIdleCallback` после первого рендера, чтобы Safari не блокировал WS-апгрейдом первичный paint.

### Шаг D. Диагностика, если ничего не помогло

- В `src/integrations/supabase/client.ts` мы менять не можем (запрет), но можем добавить runtime override через `localStorage.setItem('debug-no-realtime','1')` и читать его в обёртке-хелпере `safeChannel()`.
- Логирование статуса канала: в каждой подписке логировать `subscribe((status, err) => console.log('[rt]', topic, status, err))` — на test-окружении сразу увидим, висит ли `JOINING`.

## Файлы, которые тронем (по шагам)

- **Шаг A**: `nginx.conf` (+ инструкция по http2 на Coolify-уровне).
- **Шаг B**: 5 файлов из списка выше + добавить запись `VITE_DISABLE_REALTIME` в `.env.example`.
- **Шаг C**: те же файлы, но рефактор объединения каналов.
- **Шаг D**: создать `src/lib/realtime.ts` с обёрткой `safeChannel`.

## Что НЕ трогаем

- `src/integrations/supabase/client.ts`.
- Realtime блок в `nginx.conf` (он уже корректный).
- Прод (reage.life) — фикс касается только test-инсталляции.

## Открытые вопросы

1. Идём по шагам A → B → C, или хочешь сразу пакетно A+B (фичефлаг)? Я бы предложил **A+B одним коммитом** — флаг по умолчанию `false`, ты на test ставишь `VITE_DISABLE_REALTIME=true`, тестируешь без realtime; если работает — едем в C.
2. Есть ли у тебя доступ к Coolify-конфигу nginx для проверки `http2`? Если нет — пропустим этот пункт и сосредоточимся на A (compression off) + B (фичефлаг).
