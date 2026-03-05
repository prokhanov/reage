

## Убрать влияние confidence factor на индекс здоровья

### Проблема
Confidence factor искусственно тянет индекс к 70 при неполном покрытии. Но `avgPenalty` уже корректно считает среднее только по сданным маркерам. Двойная корректировка не нужна.

### Решение

**Файл:** `supabase/functions/analyze-biomarkers/index.ts` (строки ~1190-1203)

1. **adjusted = raw** --- убрать корректировку к 70. Confidence factor остаётся как метаданные для UI, но не влияет на score.
2. Оставить `coverage` и `confidenceFactor` в возвращаемом объекте для отображения в интерфейсе ("расчёт на основе X из Y маркеров").

```typescript
// Было:
const adjustedHealthIndex = 70 + (rawHealthIndex - 70) * confidenceFactor;

// Станет:
const adjustedHealthIndex = rawHealthIndex; // confidence is informational only
```

3. Передеплоить edge function.

### Результат
- Пациент с 10 идеальными маркерами из 25 → индекс 92 (было 87.6)
- Пациент с 25 идеальными маркерами из 25 → индекс 92 (без изменений)
- UI продолжает показывать "на основе X из Y маркеров" через metadata
- Биологический возраст тоже перестанет занижаться при неполном покрытии

### Файлы
- `supabase/functions/analyze-biomarkers/index.ts` --- одна строка

