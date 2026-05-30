## Что делаем

1. **Крестик в диалоге прогресса** — пользователь может прервать генерацию.
2. **Авто-восстановление диалога** — если закрыть вкладку и вернуться на страницу анализа, диалог снова появится (генерация и так идёт в фоне на сервере).

## Изменения

### `supabase/functions/report-orchestrator/index.ts`
- Добавить новый `action: "cancel"` (`POST { action: "cancel", jobId | analysisId }`):
  - находит активный `running/queued` job по `analysisId` (или по `jobId`),
  - ставит `status = 'failed'`, `error = 'canceled_by_user'`, `finished_at = now()`.
- В `handleTick`: если на старте тика `job.status === 'failed'` (включая отмену) — просто выходит (in-flight шаг доработает в холостую, новых тиков не будет).
- Логи: `[job X] 🛑 CANCELED by user`.

### `src/pages/AnalysisDetail.tsx`

**Диалог прогресса (строки 702–723):**
- Добавить кнопку-крестик (`X` из `lucide-react`) в правом верхнем углу карточки.
- По клику → `confirm("Прервать генерацию отчёта?")` → вызов `supabase.functions.invoke('report-orchestrator', { body: { action: 'cancel', analysisId: id } })` → остановить polling, `setAnalyzing(false)`, тост «Генерация отменена».
- Сделать кнопку дизейбленой во время самого запроса отмены.

**Восстановление при возврате (строки 96–118):**
- Текущий хук уже находит активный job и вызывает `handleAnalyze("standard")`. Проблема: режим может быть `deep`, и повторный вход в `handleAnalyze` запускает свой `generationStartedAt`, что искажает `gte(updated_at)` для polling.
- Заменить на отдельную функцию `attachToRunningJob(job)`:
  - читает `job.mode`, `job.steps_total`,
  - сразу ставит `setAnalyzing(true)` и стартует тот же polling (по `report_jobs`), плюс single `waitForAnalysisCompletion` для финального открытия редактора,
  - **не** вызывает `invokeAnalyzeBiomarkers` повторно (оркестратор и так сам тикает).
- Окно «свежести» расширить с 2 мин до 10 мин (deep-режим может между тиками молчать дольше при ретраях с backoff).

## Технические детали

- Отмена — мягкая: оркестратор просто перестаёт планировать следующие шаги. Текущий in-flight HTTP-вызов к `analyze-biomarkers`/`finalize-analysis` доработает, но его результат не сохранится дальше (тик увидит `status='failed'` и выйдет до `update steps_done`).
- На клиенте при отмене НЕ дёргаем `loadData()` — частичный отчёт остаётся как есть, пользователь сам решит, перегенерировать или нет.
- Чек на восстановление работает только на `AnalysisDetail` (как и сейчас) — глобальный баннер вне scope.

## Файлы

- `supabase/functions/report-orchestrator/index.ts`
- `src/pages/AnalysisDetail.tsx`

Стрим, промпты, пайплайн — не трогаем.
