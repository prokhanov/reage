

# Открытые диапазоны для биомаркеров — РЕАЛИЗОВАНО ✅

## Что сделано

### 1. Edge function `analyze-biomarkers/index.ts`
- Изменён skip condition: `||` → `&&` (пропускаем только если ОБА null)
- `range` при одностороннем диапазоне = 1 (не ломается)
- `isOutsideNormal` и `isInOptimal` корректно обрабатывают NULL границы
- `markerCount` фильтр обновлён аналогично

### 2. `BiomarkerRangeBar.tsx`
- Убран fallback `optimal.min ?? normal.min` / `optimal.max ?? normal.max`
- Открытый оптимум корректно визуализируется (зелёная зона до края шкалы)

### 3. Данные в БД (~25 маркеров)
**optimal_max → NULL (выше = лучше):**
TEST, DHEA-S, IGF-1, CoQ10, HDL, B12, B9, Se, Zn, fT3

**optimal_min → NULL (ниже = лучше):**
HbA1c, GLU, INS, HCY, LDL, ApoB, TG, VLDL (+ уже были NULL: HOMA-IR, hs-CRP, IL-6, TNF-α, Lp(a))

**ESR:** optimal_min_male/female → NULL

**age_ranges JSON** обновлён для всех маркеров с range_mode='age': B12, DHEA-S, IGF-1, HDL, fT3, TEST, GLU, INS, HCY, LDL, TG, ESR

### Бонусные баллы за "молодые" показатели
Реализуются через AI-промпт биологического возраста (Вариант Б), а не формулу. AI видит маркеры выше возрастного оптимума и корректирует биовозраст на -1…-3 года.
