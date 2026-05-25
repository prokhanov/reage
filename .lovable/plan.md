## Контекст

- На **test.reage.life** (доступен без VPN через nginx reverse-proxy `/supabase/` → `ilxgodhosirhhkffqryw.supabase.co`) страница **«Персональные отчёты»** в режиме `/admin/patients` view-as-patient остаётся пустой.
- На **reage.life** (прод, прямой URL Supabase, доступен только с VPN) — всё работает.
- Все XHR возвращают **200**, висящий ранее запрос — это «тяжёлый» `recommendations` с `text + content_json` (~**811 КБ**, ~1 с): `/supabase/rest/v1/recommendations?select=id,type,text,content_json,...&analysis_id=eq.<uuid>`.

Это значит, что проблема не в сетевом fail, а в одном из двух:
1. nginx возвращает 200, но **режет/искажает большое тело ответа** (gzip / буферизация / chunked) → supabase-js падает в `JSON.parse`/пустой массив без видимой ошибки.
2. На рендере `view-as-patient` есть JS-исключение, проглатываемое try/catch, → диалог открывается пустым.

## Что сделаем (две части)

### 1. Починить nginx-прокси для больших ответов

В `nginx.conf` в блоке `location /supabase/` сейчас:
```
proxy_buffering off;
proxy_cache off;
```
…но **нет**: `proxy_set_header Accept-Encoding`, `gzip_proxied`, `chunked_transfer_encoding`. На больших JSON-ответах от PostgREST (>500 КБ) это даёт нестабильное поведение: тело может приходить пустым / обрезанным некоторыми middlebox'ами (а у пользователя без VPN это особенно вероятно).

Изменения в `nginx.conf` в блок `location /supabase/`:
- Добавить проброс заголовков: `Accept-Encoding`, `Accept`, `Range`, `If-None-Match`, `Prefer`, `Prefer-Headers`, `x-client-info`.
- Включить корректный chunked-ответ: `chunked_transfer_encoding on;`, `proxy_request_buffering off;`.
- Расширить лимиты: `client_max_body_size 50m;`, `proxy_buffers 16 64k;`, `proxy_busy_buffers_size 128k;` (на случай если буферизация частично включится).
- Не трогать realtime-блок (он уже корректный).

### 2. Уменьшить вес «тяжёлого» запроса recommendations

Сейчас `RECOMMENDATIONS_DETAIL_SELECT` в `src/pages/Recommendations.tsx` (стр. 90-98) тянет одной пачкой `text + content_json` по **всем рекомендациям анализа** → ~800 КБ. Это:
- основная нагрузка на проксированный канал;
- основной кандидат на «обрезку» вне VPN.

Сделаем стандартный приём:
- В detail-select оставить только метаданные + `content_json` (структурированные данные нужны для UI).
- `text` (длинный markdown) грузить **отдельным запросом по `id` каждой рекомендации только при раскрытии конкретного блока** в диалоге — большинство пользователей открывает 1–2 раздела.
- Альтернативно: оставить `text`, но добавить `?limit=100` и явный `Accept: application/json` (на проксе явно фиксируем тип).

### 3. Диагностика «empty page» (на случай если #1+#2 не помогут)

Добавить временный fallback-обработчик в `Recommendations.tsx` `handleView`:
- В `catch` логировать `error.message`, `error.cause`, `error.stack` через `console.error('[Recommendations][detail] failed', err)`.
- В блок рендера диалога добавить fallback-UI «Не удалось загрузить отчёт» вместо пустого окна.

Это позволит, если проблема всё-таки в рендере / парсинге, увидеть конкретную ошибку в консоли и не показывать пустую страницу.

## Файлы, которые тронем

- `nginx.conf` — расширить блок `location /supabase/`.
- `src/pages/Recommendations.tsx` — разделить detail-select на лёгкий + ленивая подгрузка `text`; добавить fallback UI и подробное логирование ошибок.

## Что НЕ трогаем

- `src/integrations/supabase/client.ts` (запрещено).
- Realtime-прокси-блок в `nginx.conf`.
- Логику админ-режима view-as-patient.

## Открытые вопросы (можно ответить до старта или после первой итерации)

1. После раскатки фикса `nginx.conf` нужно ли мне дополнительно проверить через `browser` тулу страницу на test-окружении? (Тест-окружение у тебя задеплоено отдельно — Lovable preview туда не задеплоит, нужен твой деплой.)
2. Если после правки nginx + уменьшения payload страница всё ещё пустая — оставить детальное логирование в коде или убрать?
