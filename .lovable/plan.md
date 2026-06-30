## Цель
В режиме просмотра пациента (`/admin/patients` → «Войти как пациент») добавить суперадмину возможность пересчитать стратегию здоровья, посмотреть результат с пояснениями, при необходимости отредактировать ключевые цифры и только после этого опубликовать клиенту.

## Поведение

1. На странице «Стратегия здоровья» при просмотре под суперадмином заменяем текущее поведение кнопки «Пересчитать»:
   - Кнопка теперь видна **только** при `isSuperAdmin && isViewMode` (сейчас доступна также в обычном просмотре своего ЛК — убираем).
   - Клик запускает расчёт в режиме `preview: true` — данные **не сохраняются** в `health_strategy_snapshots`.
2. Открывается диалог «Предпросмотр стратегии перед публикацией»:
   - Шапка с пациентом и датой анализа.
   - Блок «Почему такие цифры» — объяснение от сервера: хроно‑возраст, health_index, базовая формула био‑возраста (`chrono + (85 − HI) × 0.20`), AI‑дельта в коридоре ±5, топ‑5 биомаркеров с наибольшим вкладом в штраф, доля high‑impact, покрытие панели, confidence factor.
   - Редактируемые поля: `current_bio_age`, `target_bio_age`, `health_index`, текст `rationale`, плюс возможность исключить/оставить отдельные пункты roadmap и expectations (чекбоксы).
   - Превью того, как будет выглядеть клиенту: траектория, контрольные точки, ожидания, карта действий (тот же рендер, что и на странице, в read‑only режиме).
   - Кнопки «Отменить» и «Сохранить и опубликовать клиенту».
3. По «Сохранить» — отправляем отредактированный payload на сервер, он создаёт запись в `health_strategy_snapshots` (обычный insert, как сейчас), страница обновляет данные. Тост «Стратегия опубликована клиенту».
4. По «Отменить» — диалог закрывается, ничего не сохраняется, клиент видит прежнюю стратегию.
5. Для самого суперадмина (его ЛК) и обычных пациентов поведение прежнее: автогенерация при отсутствии снапшота, без ручной кнопки.

## Технические изменения

### Edge function `supabase/functions/compute-health-strategy/index.ts`
- Принимать в body три режима:
  - `preview: true` — выполнить весь расчёт, **не** делать `insert`, вернуть payload + новое поле `explanation` со структурой:
    ```ts
    {
      formula: { anchor: 85, slope: 0.20, base_bio_age, ai_delta, ai_corridor: 5 },
      health_index: { value, coverage, confidence_factor, top_penalties: [{name, code, tier, penalty, value, optimal_range}], high_impact_count, total_markers },
      drivers: string[] // короткие текстовые тезисы для UI
    }
    ```
    Доступно только при `isSuperAdmin && isViewMode` — проверяем на сервере: вызывающий должен иметь роль `superadmin` (через `has_role`) и `userId !== caller.id`.
  - `publish: true` с объектом `edited` — пропускаем расчёт, валидируем поля (`current_bio_age`, `target_bio_age`, `health_index`, `rationale`, отфильтрованные `roadmap`/`expectations`), делаем `insert` с этими значениями. Та же проверка прав.
  - Без флагов — текущий путь (кэш/полный расчёт + insert), как сейчас.
- Вынести существующую логику расчёта `currentBio`, `health_index`, AI‑результата, `roadmap`, `expectations` в чистую функцию, чтобы её мог вызывать как preview, так и publish‑путь.
- В preview‑ответе собирать `explanation.health_index.top_penalties` из уже вычисляемого `penalties` массива в `calculateHealthIndex` (нужно вернуть его наружу — сейчас он остаётся внутри).

### Фронтенд
- `src/pages/HealthStrategy.tsx`:
  - Изменить условие кнопки: `hasAnalyses && isSuperAdmin && isViewMode`. Текст «Пересчитать и проверить».
  - Клик → вызывает `compute-health-strategy` с `preview: true`, складывает результат в локальный стейт, открывает новый диалог.
- Новый компонент `src/components/health-strategy/StrategyPreviewDialog.tsx`:
  - Принимает `previewData` (snapshot‑like + `explanation`), `patient`, `onCancel`, `onPublish(edited)`.
  - Использует существующие `RejuvenationTrajectory`, `RoadmapTimeline`, `ExpectationsTimeline`, `ActionMap` для предпросмотра.
  - Форма редактирования над предпросмотром (Inputs для чисел, Textarea для rationale, чекбоксы рядом с пунктами roadmap/expectations).
  - Блок «Объяснение расчёта» собирается из `explanation` (читабельный текст + таблица top‑5 штрафов).
  - На «Сохранить» вызывает `compute-health-strategy` с `publish: true, edited: {...}`; на успех — `onPublish`, который перезагружает страницу через существующий `load()`.

## Безопасность
- Все права (`superadmin` + `viewAsUserId !== caller`) проверяются на сервере в edge function, кнопка на фронте — UX‑слой.
- Никаких изменений схемы БД не требуется: используем существующую таблицу `health_strategy_snapshots` и текущий `insert`‑путь.
