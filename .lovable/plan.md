

## Аудит: привязка данных биомаркеров ко всем системам приложения

### Обзор проверенных компонентов

Проверено **10 точек** использования логики нормальных/оптимальных/критических диапазонов с учётом `range_mode`, возраста и пола:

#### Frontend (клиентская часть) — через `lib/biomarkerNorms.ts`
| Компонент | `range_mode` | Возраст | Пол | Оптимум | Критич. | Статус |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| `Biomarkers.tsx` (таблица) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `AnalysisDetail.tsx` (детали анализа) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Trends.tsx` (графики трендов) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `BiomarkerRangeBar.tsx` (7-сегм. бар) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `BodyHeatmap.tsx` (тепловая карта) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `AnalysisStep2.tsx` (создание анализа) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Все клиентские компоненты используют единую библиотеку `biomarkerNorms.ts`, которая корректно проверяет `range_mode === 'age'` перед использованием возрастных диапазонов.

#### Backend (Edge Functions) — собственная логика
| Функция | `range_mode` | Возраст | Пол | Оптимум | Критич. | Проблемы |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| `analyze-biomarkers` (отчет) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Баг в fallback |
| `analyze-biomarkers` (health_index) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Баг в fallback |
| `analyze-biomarkers` (назначения) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Баг в fallback |
| `analyze-risk-zones` (зоны риска) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️⚠️ Баг в fallback |
| `health-assistant` (AI-чат) | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️⚠️⚠️ Два бага |

---

### Найденные баги

#### BUG 1 (КРИТИЧЕСКИЙ): `health-assistant/index.ts` — НЕ проверяет `range_mode`

**Строка 172**: `if (patientAge && patientGender && biomarker.age_ranges)` — проверяет только наличие `age_ranges`, но НЕ проверяет `biomarker.range_mode === 'age'`.

Если биомаркер имеет `range_mode: 'general'`, но в базе сохранены данные `age_ranges` (что происходит всегда — оба режима сохраняются параллельно), AI-ассистент будет использовать **возрастные диапазоны вместо общих**, давая неверные оценки.

**Исправление**: добавить `biomarker.range_mode === 'age' &&` в условие.

#### BUG 2 (СРЕДНИЙ): `health-assistant/index.ts` и `analyze-risk-zones/index.ts` — Gender fallback ПЕРЕЗАПИСЫВАЕТ возрастные диапазоны

**Строки 187-196** в health-assistant, **строки 117-126** в analyze-risk-zones:

```javascript
// После age-dependent (если найден, normalMin уже установлен):
if (patientGender === 'male') {
  if (biomarker.normal_min_male != null) { normalMin = biomarker.normal_min_male; ... }
}
```

Проблема: gender fallback **безусловно перезаписывает** значения, даже если они уже были корректно установлены из возрастных диапазонов. В `analyze-biomarkers` этот баг исправлен — там есть проверка `if (normalMin === null && ...)`.

**Исправление**: добавить проверку `normalMin === null` перед gender fallback, как в `analyze-biomarkers`.

#### BUG 3 (СРЕДНИЙ): `analyze-biomarkers/index.ts` — Health index normal fallback тоже перезаписывает

**Строки 1109-1115** и **1184-1185**: в функции `calculateHealthIndex` и подсчёте `markerCount` gender fallback для **normal** диапазона безусловно перезаписывает значения из age-ranges. Для **optimal** и **critical** — всё корректно (есть `=== null` проверка), но для normal — нет.

**Исправление**: добавить `normalMin === null &&` перед gender fallback для normal в health_index расчёте.

---

### Что работает корректно

- **Dashboard** (`SystemRatingsCard`, `BioAgeTrendChart`, `HealthIndexTrendChart`) — отображает сохранённые `health_index` и `biological_age` из таблицы `analyses`, которые рассчитываются edge function при генерации отчёта. Сами не делают расчёты на клиенте.
- **Назначения** (`prescriptions`) — фильтрация аномалий использует правильный каскад с `range_mode`.
- **Все клиентские компоненты** — единая библиотека, единая логика.
- **Demo mode** — использует `calculateAge` из `biomarkerNorms.ts`, сами значения — статика из шаблонов.

### План исправлений

**Файл 1**: `supabase/functions/health-assistant/index.ts`
- Строка 172: добавить проверку `biomarker.range_mode === 'age' &&`
- Строки 188-196: обернуть gender fallback в `if (normalMin === biomarker.normal_min)` или проще — добавить условие `normalMin === null`-style как в analyze-biomarkers

**Файл 2**: `supabase/functions/analyze-risk-zones/index.ts`
- Строки 118-126: обернуть gender fallback в проверку `normalMin === null` (аналогично analyze-biomarkers)

**Файл 3**: `supabase/functions/analyze-biomarkers/index.ts`
- Строки 1109-1115: добавить `normalMin === null &&` перед gender fallback в health_index
- Строки 1184-1185: аналогичная проверка в markerCount
- Строки 1253-1254: аналогичная проверка в biomarkersForAI

