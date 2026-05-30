# Единый бюджет ретраев для всех шагов отчёта

## Что меняем

В `supabase/functions/report-orchestrator/index.ts`:

1. Убираем разделение `MAX_ATTEMPTS_DEFAULT=2 / MAX_ATTEMPTS_CATEGORY=3` и функцию `maxAttemptsFor`.
2. Возвращаем одну константу `MAX_ATTEMPTS = 3` — применяется ко **всем** kind: `category`, `prescriptions`, `finalize`.
3. Категории по-прежнему грузятся динамически из `biomarker_categories` (`SELECT name ORDER BY display_order`) — никакой привязки к числу/именам категорий в коде нет. Если категорий станет 4 или 9 — orchestrator автоматически построит соответствующее количество шагов и каждый получит свои 3 попытки.
4. В `stepError` при детекте 504 / `aborted` / `Idle timeout` пишем маркер `idle_timeout` в начало строки + console.warn — чтобы в логах было видно какой именно шаг и сколько раз спотыкался.

## Что НЕ трогаем

- Динамический список категорий — остаётся как есть.
- Таймауты `fetchWithTimeout` (380 с / 145 с) — без изменений.
- Идемпотентный `handleStart`, UI, стриминг.

## Файлы

- `supabase/functions/report-orchestrator/index.ts`

## Эффект

Любой шаг отчёта (сколько бы их ни было — зависит от того, сколько систем настроено в БД) получает до 3 попыток. Случайный 504 IDLE_TIMEOUT на любом этапе переживается ретраем.
