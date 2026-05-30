## Проблема
Серверные логи (оркестратор) пишутся в edge function logs, а в браузерной консоли — пусто. Пользователь хочет видеть прогресс генерации прямо в DevTools.

## Что добавить — только клиентский логгинг

### `src/pages/AnalysisDetail.tsx`

В обоих местах, где идёт polling `report_jobs` (новая генерация `handleAnalyze` и реконнект `attachToRunningJob`):

- Запрашивать также `attempts`, `error`, `mode` из `report_jobs`.
- При каждом тике polling логировать в консоль одной строкой, например:
  ```
  [report job <jobId>] step 3/8 "category:Гормоны" · попытка 1/3 · status=running · mode=deep
  ```
- При смене `current_step` — отдельный лог `▶ NEW STEP …`.
- При терминальном статусе (`done` / `failed`) — лог `✅ DONE` или `❌ FAILED: <error>`.
- При старте генерации — `🚀 START analyze (mode=…)` и `jobId` после ответа `invokeAnalyzeBiomarkers`.
- При отмене — `🛑 CANCEL requested`.

Сравнение делать по локальному `prevStep`/`prevAttempts`, чтобы не спамить одинаковыми строками 2 раза в секунду — только при изменении.

## Что не трогаем
- Сервер (orchestrator) уже логирует подробно — оставляем как есть.
- Поведение polling, диалога, retry — без изменений.

## Файлы
- `src/pages/AnalysisDetail.tsx`
