## Цель

Сделать так, чтобы диалог `StrategyPreviewDialog` показывал одинаковый набор вкладок и полей в обоих режимах (`mode="preview"` и `mode="edit"`). Сейчас «Изменить» загружает только то, что лежит в `health_strategy_snapshots`, и часть блоков остаётся пустой/невидимой. Берём данные только из снапшота (без вызова edge-функции).

## Что отличается сейчас

После «Пересчитать» в `data` есть:
- `explanation` (текст «Что повлияло на расчёт» / drivers / формула)
- `rationale.bio_age_calc`, `rationale.health_index`, `rationale.system_ratings`, `rationale.drivers`
- `adherence_pct`

После «Изменить» (`openStrategyEdit` в `src/pages/Dashboard.tsx`) эти поля либо `null`, либо берутся только из `snap.rationale`. Из-за этого ряд блоков на вкладке «Моё здоровье» не рендерится, а вкладки/секции выглядят по-разному.

## Изменения

### 1. `src/pages/Dashboard.tsx` — `openStrategyEdit`

Расширить маппинг снапшота → `previewData`, чтобы он давал ту же структуру, что возвращает edge-функция в preview-режиме:

```ts
setPreviewData({
  analysis_id: snap.analysis_id,
  current_bio_age: Number(snap.current_bio_age),
  chronological_age: Number(snap.chronological_age),
  target_bio_age: Number(snap.target_bio_age),
  health_index: snap.health_index,
  rationale: snap.rationale ?? {},          // bio_age_calc / health_index / system_ratings / drivers — как есть из БД
  system_goals: snap.system_goals || [],
  action_map: snap.action_map || [],
  cohort_percentile: snap.cohort_percentile,
  cohort_label: snap.cohort_label,
  trajectory: snap.trajectory,
  roadmap: snap.roadmap || [],
  key_biomarkers: snap.key_biomarkers ?? null,
  expectations: snap.expectations || [],
  analyses_per_year: snap.analyses_per_year,
  adherence_pct: null,
  explanation: (snap.rationale as any)?.explanation ?? null,
});
```

Источник данных строго один — сохранённый снапшот. Если поле пустое, блок просто отрисуется пустым (как и договорились).

### 2. `src/components/health-strategy/StrategyPreviewDialog.tsx` — единый рендер

Сейчас часть секций условно скрывается (например `data.explanation && ...`, `rationale?.bio_age_calc && ...`). Заменить на единый набор секций, общий для обоих режимов:

- Вкладка **«Моё здоровье»**: всегда показывать «Ключевые цифры здоровья» (bio/chrono/HI/target) и «Что повлияло на расчёт» (drivers из `rationale.drivers` или пустое сообщение «нет данных в сохранённом снапшоте»).
- Вкладка **«Стратегия здоровья»**: всегда показывать «Системные рейтинги», «Цели по системам», «Дорожная карта», «Ожидания по срокам», «Ключевые биомаркеры», «План действий», независимо от `mode`.
- Поля редактирования (input/textarea/JSON-редакторы) остаются доступны и в `edit`, и в `preview` для суперадмина — как сейчас.
- Где данных нет — выводить placeholder «—» вместо скрытия блока, чтобы структура вкладок не «прыгала».

### 3. Никаких изменений в edge-функции и схеме БД

Edge-функция `compute-health-strategy` уже сохраняет `rationale` целиком (включая `bio_age_calc`, `health_index`, `system_ratings`, `drivers`). Достаточно правильно прочитать его в `openStrategyEdit` и не «обнулять» поля.

## Технические детали

- Файлы: `src/pages/Dashboard.tsx` (функция `openStrategyEdit`), `src/components/health-strategy/StrategyPreviewDialog.tsx`.
- Логика публикации (`publishStrategy`) не меняется — формат `edited` уже совпадает.
- Кнопка «Опубликовать» в `edit`-режиме продолжит сохранять snapshot и синхронизировать `analyses.biological_age` / `health_index`.

## Что НЕ делаем

- Не дёргаем edge-функцию из «Изменить» (по решению пользователя — данные только из БД).
- Не добавляем новые колонки в `health_strategy_snapshots`.
- Не меняем формулу био-возраста.
