

## Открытые диапазоны для маркеров

### Суть
Разрешить оставлять одну границу оптимума/нормы/критической зоны пустой (NULL). Например, тестостерон: optimal_min = 15, optimal_max = NULL означает "15 и выше --- оптимально". HbA1c: optimal_min = NULL, optimal_max = 5.4 означает "5.4 и ниже --- оптимально".

### Что уже работает
- Админка (DataManagement) уже позволяет оставлять поля пустыми --- они сохраняются как NULL
- Валидация `validateBiomarkerRanges` пропускает NULL (проверяет порядок только между non-null значениями)
- Клиентская логика `getBiomarkerStatus` в `biomarkerNorms.ts` уже корректно обрабатывает NULL для optimal и critical

### Что нужно поправить

#### 1. Edge function `analyze-biomarkers/index.ts` (основное)

Строка 1127: `if (normalMin === null || normalMax === null) continue;` --- пропускает маркеры, у которых одна из границ нормы NULL. Нужно: `if (normalMin === null && normalMax === null) continue;`

Строки 1129-1130: `range = normalMax - normalMin; if (range <= 0) continue;` --- ломается при NULL. Нужно обработать односторонний range.

Строка 1140: `isOutsideNormal = av.value < normalMin || av.value > normalMax` --- нужно учесть NULL:
```typescript
const isOutsideNormal = 
  (normalMin !== null && av.value < normalMin) || 
  (normalMax !== null && av.value > normalMax);
```

Строки 1141-1143: `isInOptimal` --- аналогичная правка для NULL:
```typescript
const isInOptimal = (optimalMin !== null || optimalMax !== null)
  ? (optimalMin === null || av.value >= optimalMin) && 
    (optimalMax === null || av.value <= optimalMax)
  : !isOutsideNormal;
```

Строки 1170-1182: `markerCount` фильтр --- та же логика, заменить `||` на `&&` для пропуска, и убрать `range > 0` проверку при одностороннем диапазоне.

#### 2. Клиентский `BiomarkerRangeBar.tsx` (визуализация)

Строка 26: `if (normal.min === null && normal.max === null) return null;` --- уже корректно, пропускает только если обе null.

Строки 28-29: `optMin = optimal.min ?? normal.min; optMax = optimal.max ?? normal.max;` --- при открытом оптимуме fallback на normal.max, что неправильно для declining-маркеров. Нужно оставить NULL как есть и строить шкалу без этой границы.

#### 3. Обновить данные маркеров в БД

Через SQL update убрать верхние границы оптимума для declining-маркеров (TEST, DHEA-S, IGF-1, HDL, B12, B9 и др.) и нижние границы оптимума для increasing-маркеров (HbA1c, GLU, hs-CRP, LDL и др.). А также обновить `age_ranges` JSON для маркеров с `range_mode = 'age'`.

### Файлы
- `supabase/functions/analyze-biomarkers/index.ts` --- NULL-safe penalty logic
- `src/components/BiomarkerRangeBar.tsx` --- корректная визуализация открытых диапазонов
- Миграция БД --- обнуление optimal_max/optimal_min для ~25 маркеров
