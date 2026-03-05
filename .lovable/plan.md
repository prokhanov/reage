

## Plan: Biomarker Range Validation (No Overlaps)

### Problem
Currently there's no validation that the 7-segment boundary values are ordered correctly. An admin could accidentally set `critical_min > normal_min` or `optimal_max > normal_max`, creating nonsensical overlapping zones.

### Validation Rule
For each column group (general, male, female), when fields are filled, the order must be:

```text
critical_min ≤ normal_min ≤ optimal_min ≤ optimal_max ≤ normal_max ≤ critical_max
```

Empty (null) fields are allowed and simply skipped in the chain. Validation only checks pairs where both values are present.

Same rule applies to each age range row in "age" mode.

### Implementation

**File: `src/pages/admin/DataManagement.tsx`**

1. Add a validation function `validateBiomarkerRanges(biomarker)` that:
   - For each group (general, male, female): collects non-null values in order `[critical_min, normal_min, optimal_min, optimal_max, normal_max, critical_max]`
   - For each adjacent pair where both are non-null, checks `left ≤ right`
   - Returns array of error strings (empty = valid)

2. For age ranges: same logic per row — `[critical_min, min, optimal_min, optimal_max, max, critical_max]`

3. In `handleSaveBiomarker`: call validation before `saveBiomarker.mutate()`. If errors, show `toast.error()` with the first error and return early.

4. No database changes needed — purely client-side validation.

### Error Messages
Russian, specific: e.g. "Общие: Критич. низ (X) не может быть больше Нормы низ (Y)" or "Возрастной диапазон Муж 18-45: Норма низ (X) > Оптимум низ (Y)".

