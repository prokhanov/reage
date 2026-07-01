## Демо-данные для страницы «Стратегия здоровья»

Сейчас страница `HealthStrategy.tsx` игнорирует `demoMode` и всегда идёт в реальную БД `health_strategy_snapshots`, поэтому демо-аккаунт видит либо пустой экран, либо бесконечную загрузку. Добавим курируемый статичный мок в `demoTemplate.json` и ветку рендера в самой странице.

### Персона (согласовано)

Успешная траектория с ноткой реализма: **биовозраст −3.5 года за 12 месяцев**, но два маркера остаются в риске к 12 месяцу (тестостерон подтягивается только частично, гомоцистеин — «долгий» показатель). Данные завязаны на существующие демо-анализы: LDL 0.72, HbA1c 5.05, D 74, TEST 0.16, DHEA-S 89.7, HCY 9.79, ALB 32.1, NEUT 79%.

Мужской и женский сценарии — разные акценты:

- **Мужской**: тестостерон, DHEA-S, воспаление (NEUT/hs-CRP), ЛПНП/липиды, сон.
- **Женский**: ферритин/железо, витамин D, щитовидка (TSH/T4), кожа/волосы, кортизол/стресс.

### Что появится на странице (в демо)

1. **Rejuvenation Trajectory** — 13 точек (0…12 мес), плавное снижение bio_age с 34.5 → 31.0. Chrono age берётся из реального профиля.
2. **Rationale** — 2–3 абзаца связного текста «почему такая траектория реалистична».
3. **Roadmap (год)** — 6 milestone: старт, контроль-1 (мес 3), микро-цель по системе (мес 4-5), контроль-2 (мес 6), микро-цель (мес 9), финал (мес 12). Каждый с 3–4 буллетами и focus-бейджем.
4. **Expectations Timeline** — 10 ожиданий, распределённых по 12 месяцам: wellbeing (энергия, сон), biomarker (с `biomarker_target` from→to), system, milestone. Смешаны `confidence: high/medium/low`.
5. **Action Map** — 6 действий на основе демо-prescriptions (магний, B6, Омега-3, кверцетин, аминокислоты, бетаин) с системами и biomarker_codes.
6. **Cohort percentile** — «Лучше 62% сверстников» (male) / «Лучше 68% сверстников» (female).
7. **Adherence** — 78% (реалистично, не идеально).

### Технические детали

**Файл `src/data/demoTemplate.json`** — добавить в оба блока (`male_data` / `female_data`) новую секцию `health_strategy`, содержащую полный snapshot по интерфейсу из `HealthStrategy.tsx:17-30`:

```jsonc
"health_strategy": {
  "current_bio_age": 34.5,
  "target_bio_age": 31.0,
  "health_index": 91,
  "cohort_percentile": 62,          // 68 для female
  "cohort_label": "Лучше 62% сверстников вашего пола и возраста",
  "rationale": "...",
  "trajectory": [{ "month": 0, "bio_age": 34.5 }, ... { "month": 12, "bio_age": 31.0 }],
  "roadmap": [ /* 6 milestone: start | analysis | milestone | analysis | milestone | summary */ ],
  "expectations": [ /* 10 записей по типам wellbeing/biomarker/system/milestone */ ],
  "key_biomarkers": [ /* 4-5 систем со списком кодов */ ],
  "action_map": [ /* 6 объектов по prescription_name + systems + biomarker_codes */ ],
  "system_goals": [],
  "analyses_per_year": 4,
  "adherence_pct": 78
}
```

Мужской и женский варианты различаются:
- `key_biomarkers` (мужской: TEST/DHEA-S/hs-CRP; женский: FERR/25-OH D/TSH/HCY)
- `roadmap[].focus` и `bullets` (акценты на разные системы)
- `expectations[].biomarker_target` (мужской добивается TEST 0.16 → 12.5 нмоль/л к мес 9; женский — FERR 45 → 80 нг/мл к мес 6)
- `action_map[].expected_effect` и `biomarker_codes`
- `rationale` (разный текст-рассказ)

**Значения `bio_age` в trajectory адаптируются** к реальному возрасту профиля по той же формуле, что уже применяется в `DemoModeContext.tsx:54-70` — сдвиг относительно шаблонного возраста.

**Файл `src/contexts/DemoModeContext.tsx`** — добавить `health_strategy` в интерфейс `DemoData` и передать в контекст, с адаптацией дат:
- `roadmap[].date_iso` пересчитать от `startDate = today`
- `expectations[].date_iso` пересчитать по `day_from_start`
- `trajectory` — оставить как есть (относительные месяцы)

**Файл `src/pages/HealthStrategy.tsx`** — в `load()` добавить ветку в самом начале:

```ts
if (demoMode && demoData?.health_strategy) {
  // адаптируем bio_age к реальному возрасту профиля так же,
  // как это делается для анализов в DemoModeContext
  setSnapshot(adaptedSnapshot);
  setNextCheckup(addMonths(today, 3));
  setLoading(false);
  return;
}
```

Никаких запросов к `health_strategy_snapshots` и `compute-health-strategy` в демо-режиме больше не делаем. Кнопка «Пересчитать» в демо-режиме будет либо скрыта, либо показывать toast «Недоступно в демо-режиме».

### Что не входит

- Не трогаем real-pipeline (edge function `compute-health-strategy`, таблицу `health_strategy_snapshots`) — только клиентский мок для демо.
- Не создаём реальную запись в БД для демо-пользователя — данные живут в JSON-фикстуре.
- `system_goals` остаётся пустым массивом, так как компонент, потребляющий его, отсутствует.

### Файлы

- `src/data/demoTemplate.json` — добавить секцию `health_strategy` в `male_data` и `female_data`.
- `src/contexts/DemoModeContext.tsx` — расширить `DemoData`, прокинуть поле, добавить адаптацию дат и возраста.
- `src/pages/HealthStrategy.tsx` — ветка `if (demoMode && demoData?.health_strategy)` в `load()`; заглушить «Пересчитать» в демо.
