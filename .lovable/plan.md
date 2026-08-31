# Аудит production-архитектуры AI в ReAge (read-only)

Ничего не изменялось, секреты не создавались и не показывались.

## 1. Топология production

```text
Браузер (reage.life)
   │  статика SPA
   ▼
nginx в Docker на Coolify/VDS   (deploy/nginx/default.conf, Dockerfile)
   │  никакого backend-кода, только whitelist SPA-роутов
   │
   │  все API-вызовы фронта идут не в nginx, а на:
   ▼
api.reage.life  = reverse proxy (deploy/fly-proxy/server.js, Fastify+undici)
   │  прозрачно пробрасывает любой путь в бэкенд Lovable Cloud
   ▼
Lovable Cloud (Supabase): Auth, Postgres, Storage, Edge Functions (Deno)
   │  только здесь исполняется серверный код и живут секреты
   ▼
https://ai.gateway.lovable.dev/v1/chat/completions   (Lovable AI)
```

- Frontend: собранная Vite-статика, отдаётся nginx на VDS через Coolify. Nitro/SSR нет.
- Серверные маршруты: их нет на VDS вообще. Вся серверная логика — Supabase Edge Functions в Lovable Cloud (63 функции в `supabase/functions/`).
- DB / Auth / Storage: Lovable Cloud.
- `reage.life` — Coolify/nginx; `api.reage.life` — отдельный reverse proxy (обход блокировок РКН), апстрим — бэкенд-хост Lovable Cloud.
- Непосредственно в Lovable Cloud выполняются: Edge Functions, БД, авторизация, хранилище и все вызовы AI.

## 2. Точные цепочки

### A. AI-ассистент
1. Пользователь → `/health-assistant`, файл `src/pages/HealthAssistant.tsx`.
2. Фронт делает `fetch(edgeFunctionUrl("health-assistant"))` (`src/lib/supabaseUrl.ts`) → URL вида `https://api.reage.life/functions/v1/health-assistant`, с anon-ключом и JWT пользователя.
3. Proxy (`deploy/fly-proxy/server.js`) пробрасывает запрос в Lovable Cloud.
4. Edge Function `supabase/functions/health-assistant/index.ts`: читает `Deno.env.get("LOVABLE_API_KEY")` и делает `fetch("https://ai.gateway.lovable.dev/v1/chat/completions")`, модель `google/gemini-2.5-flash`, стрим обратно клиенту.
5. Окружение серверного кода: Deno-runtime Edge Functions в Lovable Cloud.

### B. Формирование отчёта
1. Пользователь/админ жмёт генерацию → `src/lib/analyzeBiomarkers.ts`.
2. `POST {api.reage.life}/functions/v1/report-orchestrator` (`action: start`), далее поллинг таблицы `report_jobs`.
3. Оркестратор (`supabase/functions/report-orchestrator/index.ts`) шагами вызывает `analyze-biomarkers`, `report-qa`, `finalize-analysis`, `compute-health-strategy`, `analyze-risk-zones`.
4. Каждая из них берёт `LOVABLE_API_KEY` из env и идёт через общий модуль `supabase/functions/_shared/ai-call-with-retry.ts` → `https://ai.gateway.lovable.dev/v1/chat/completions` (retry по 429, деградация reasoning, cap 65 536 output-токенов).
5. Результат пишется в Postgres (`report_documents`, `prescriptions`, `report_jobs`), PDF рендерится отдельным сервисом (`REPORT_RENDERER_URL`).

## 3. Где что упоминается

- `LOVABLE_API_KEY` — только в Edge Functions (13 файлов): `analyze-biomarkers`, `analyze-risk-zones`, `compute-health-strategy`, `finalize-analysis`, `health-assistant`, `parse-analysis-pdf`, `report-qa`, `resolve-medications`, `test-prompt`, `auth-email-hook`, `preview-transactional-email`, `process-email-queue`, `handle-email-suppression`. Всегда через `Deno.env.get`.
- `ai.gateway.lovable.dev` — `_shared/ai-call-with-retry.ts` и 7 функций напрямую.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_PROVIDER` — в проекте отсутствуют полностью.
- В `src/`, `Dockerfile`, `deploy/`, `.env`, `.env.example`, `vite.config.ts`, `index.html` упоминаний ключей и шлюза нет ни одного.
- Отдельного «AI proxy» нет: `api.reage.life` — универсальный прокси к бэкенду, не к AI.

## 4. Прямые ответы

- `LOVABLE_API_KEY` в коде — нет; в окружении Edge Functions — да, как managed-секрет проекта.
- Вручную мы его не создавали: он помечен как managed (редактируется только ротацией платформы).
- Да, Lovable выдаёт доступ автоматически и инжектит ключ в рантайм функций.
- AI-код выполняется на Lovable-hosted backend (Edge Functions), не на VDS.
- VDS в Lovable Gateway напрямую не ходит — вообще не имеет ключа.
- Промежуточный proxy есть, но он транспортный (`api.reage.life`), к AI отношения не имеет.
- Да, каждый AI-запрос проходит через Lovable Cloud (Edge Function).
- Поэтому в Coolify не нужны AI-переменные: там только статика и три публичные `VITE_*` переменные.

## 5. Фактическая проверка

- Кодовые пути и hostname подтверждены чтением исходников (см. выше) — единственный AI-hostname в проекте `ai.gateway.lovable.dev`.
- Логи AI Gateway за последние 7 суток: 0 записей — за окно отчётности production-генераций не было; исторический учёт использования ведётся на стороне Lovable AI Gateway (credits workspace), не в БД проекта.
- Живые тесты ассистента/генерации отчёта не выполнялись: они создают постоянные данные (`chat_conversations`, `report_jobs`, списание кредитов) и запрещены режимом read-only. Готов выполнить точечный безопасный вызов после вашего явного разрешения.

## 6. Deployment-конфигурация

- `Dockerfile`: node:22-alpine → `npm install`, `tsx scripts/generate-sitemap.ts`, `npm run build` → nginx:alpine со статикой + `deploy/nginx/default.conf`. Никакого server runtime.
- Coolify собирает этот Dockerfile из GitHub; наследуются только `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_APP_URL`, `VITE_NOINDEX`.
- Reverse proxy: `deploy/fly-proxy` (Fastify, таймаут 180 с, bodyLimit 80 МБ) — из-за блокировок РКН.
- Custom domain `reage.life` / `test.reage.life` указывает на VDS; Lovable Publish используется как отдельный превью-контур.
- Edge Functions деплоятся платформой Lovable, отдельно от Docker-сборки — поэтому обновления backend-логики и AI не зависят от Coolify.

## 7. Перенос в Consilium

Что переносимо один-в-один:
- Схема «статика где угодно + вся серверная логика в Edge Functions Lovable Cloud».
- Модуль-обёртка вызова AI (аналог `_shared/ai-call-with-retry.ts`): единая точка, retry на 429/5xx, ограничение выходных токенов, деградация reasoning.
- Оркестратор длинных задач: таблица job'ов + пошаговые тики, чтобы обходить лимит времени одного вызова функции.
- Централизованный helper URL-ов функций на фронте (аналог `src/lib/supabaseUrl.ts`) — позволяет позже вставить reverse proxy без правок кода.

Ограничения и риски:
- Ключ AI существует только внутри Lovable Cloud конкретного проекта: перенести его в Consilium нельзя и не нужно — у Consilium будет собственный managed-ключ.
- Если серверную логику вынести на VDS, автоматический доступ к AI пропадёт — придётся хранить ключ вручную.
- Кредиты AI списываются с workspace; лимиты/402/403 нужно обрабатывать как терминальные и показывать в UI.
- Reverse proxy добавляет точку отказа и таймауты — актуален только при региональных блокировках.

Минимальный план повторения в Consilium (без внешнего AI и без ручной передачи ключа):
1. Включить Lovable Cloud в Consilium — managed `LOVABLE_API_KEY` появляется автоматически.
2. Создать `supabase/functions/_shared/ai-call.ts` — единственное место, знающее про gateway и ключ.
3. Сделать одну функцию-чат (стриминг) и одну функцию-задачу (job-таблица + шаги) по образцу ReAge.
4. На фронте — только вызовы функций через централизованный helper URL, ключей во фронте нет.
5. Хостинг фронта — Lovable Publish или Docker/Coolify: на архитектуру AI это не влияет.
6. Reverse proxy добавлять только при необходимости обхода блокировок.
