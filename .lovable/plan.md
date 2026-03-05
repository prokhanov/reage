

## Plan: Toggle Between General Ranges and Age-Dependent Ranges

Currently both sections are shown simultaneously. The user wants a mutually exclusive choice: either general ranges (the 7-segment block with Общий/Муж/Жен inputs) **or** age-dependent ranges, not both.

### Change: `src/pages/admin/DataManagement.tsx`

1. **Add toggle state**: `rangeMode: 'general' | 'age'` — initialized based on whether `editingBiomarker.age_ranges` has data (if age_ranges has entries → `'age'`, otherwise → `'general'`).

2. **Add a ToggleGroup or RadioGroup** between the unit/category section and the ranges section, with two options:
   - "Общие диапазоны" (general)
   - "Возрастные диапазоны" (age-dependent)

3. **Conditionally render**: Show the 7-segment boundary blocks (lines ~1251-1390) only when `rangeMode === 'general'`. Show the age-dependent section (lines ~1424-1600+) only when `rangeMode === 'age'`.

4. **On save**: When saving with `rangeMode === 'age'`, clear general range fields (set them to null). When saving with `rangeMode === 'general'`, clear `age_ranges` (set to empty object/null). This ensures data consistency.

### Files:
- `src/pages/admin/DataManagement.tsx` — add toggle, conditional rendering, save logic cleanup

