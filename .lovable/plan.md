# Починка PDF: перевести всё на reage.life

## Причина ошибки

Fly-логи показывают:
```
pageUrl:  https://test.reage.life/internal/report-preview?token=...
console:  "404: маршрут не найден"
```

`render-report-pdf` минтит URL с `PREVIEW_BASE_URL=https://reage.lovable.app`, а тот редиректит на `test.reage.life` (там висит старая сборка без маршрута `/internal/report-preview`). Основной домен — `reage.life`, туда и надо ходить.

## Что делаю

1. Меняю секрет `PREVIEW_BASE_URL` (используется в `render-report-pdf` и `mint-preview-token`) на **`https://reage.life`** через `update_secret`. Никаких test.reage / lovable.app в цепочке рендера PDF больше не будет.
2. Больше в коде edge-функций и фронта менять нечего — `/internal/report-preview` уже зарегистрирован в `src/App.tsx`, `mint-preview-token` и `render-report-pdf` берут базу из env.

## Что делает пользователь после моих изменений

1. **Publish → Update** — чтобы на `reage.life` уехала свежая сборка с маршрутом `/internal/report-preview` и с обновлённым `ReportPreview.tsx` (без этого будет тот же 404, но уже на reage.life).
2. Убедиться, что `reage.life` в Project Settings → Domains стоит как **Primary** (иначе Lovable снова начнёт редиректить на другой домен).
3. Открыть `/admin/report-visuals` → «Скачать PDF».

## Если снова упадёт

Панель «Диагностика PDF» на странице теперь показывает полный ответ Fly (pageUrl, reportState, consoleTail, pageErrors). Присылаете JSON — точечно чиним.

## Что НЕ трогаю

- Код `render-report-pdf`, `mint-preview-token`, `ReportPreview.tsx`, `deploy/report-renderer/server.js` — они уже корректные.
- Fly-секреты (`AUTH_TOKEN`, `REPORT_RENDERER_URL`) — они не при чём.
- `test.reage.life` — оставляю в покое, отвязывать домен не буду без вашей команды.
