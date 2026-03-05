

## Исправление: `getOptimalRangeForAge` и `getCriticalRangeForAge` игнорируют открытые возрастные диапазоны

### Проблема

В `src/lib/biomarkerNorms.ts`:

- **Строка 135**: `if (ageRange && ageRange.optimal_min !== undefined && ageRange.optimal_max !== undefined)` — требует оба поля. Для B12 (optimal_min=400, optimal_max отсутствует) условие false, функция падает на fallback к общим колонкам.
- **Строка 170**: Аналогичная проблема для critical ranges.

Данные в БД корректные. Визуализация в `BiomarkerRangeBar.tsx` тоже корректная. Баг только в этих двух условиях.

### Исправление

**Файл**: `src/lib/biomarkerNorms.ts`

1. Строка 135: заменить `&&` на `||`:
```typescript
if (ageRange && (ageRange.optimal_min !== undefined || ageRange.optimal_max !== undefined)) {
  return { min: ageRange.optimal_min ?? null, max: ageRange.optimal_max ?? null };
}
```

2. Строка 170: аналогично:
```typescript
if (ageRange && (ageRange.critical_min !== undefined || ageRange.critical_max !== undefined)) {
  return { min: ageRange.critical_min ?? null, max: ageRange.critical_max ?? null };
}
```

Одно изменение в одном файле, две строки.

