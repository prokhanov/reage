

## Plan: Restructure Age-Dependent Ranges to 7-Segment Layout

Currently, each age range entry (lines 1432-1490 for male, 1502-1560 for female) uses a flat layout with "Норма Min/Max" on the first row and "Опт. Min/Max, Крит. Min/Max" on the second row. This is inconsistent with the main 7-segment boundary layout above.

### Change: `src/pages/admin/DataManagement.tsx` (lines 1432-1490 male, 1502-1560 female)

Restructure each age range entry to match the same 7-segment ordered boundary pattern as the main section:

For each age range block, after the age inputs (От/До лет) and delete button, replace the current 2-row grid with 7 ordered boundary rows:

```text
🔴 Крит. низ    → critical_min  (input)
🟠 Риск низ     → min           (input, currently "Норма Min")
🟡 Допуст. низ  → optimal_min   (input)
🟢 Оптимальная зона: {optimal_min} — {optimal_max}  (calculated display)
🟡 Допуст. верх → optimal_max   (input)
🟠 Риск верх    → max           (input, currently "Норма Max")
🔴 Крит. верх   → critical_max  (input)
```

Each boundary uses the same color-coded block style (border + bg tint) as the main section, but more compact (single input per row since these are gender-specific already). The green optimal zone row shows the calculated range dynamically, same as the main section.

The age inputs (От/До лет) stay at the top of each block with the delete button.

Apply identically for both male and female sections.

