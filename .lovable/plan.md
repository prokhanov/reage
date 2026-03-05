

## Plan: Show Calculated Optimal Zone in Edit Biomarker Dialog

Currently line 1309-1312 shows a static label "🟢 Оптимальная зона" with text "Значения между optimal_min и optimal_max". Need to replace this with a dynamic display showing the actual entered values.

### Change: `src/pages/admin/DataManagement.tsx` (lines 1309-1312)

Replace the static label with a computed display that reads the current form values for optimal_min/optimal_max (general, male, female) and shows:

```text
🟢 Оптимальная зона
Общий: 3.5 — 5.2  |  Муж: 4.0 — 5.5  |  Жен: 3.2 — 4.8
```

This requires converting the edit dialog from uncontrolled inputs (defaultValue) to controlled state, OR reading values from the form via refs/state. Since the dialog already uses `editingBiomarker` state, the simplest approach is to use controlled inputs with state for the optimal_min/max fields, updating the display in real-time as the admin types.

Alternatively, since all inputs use `name` attributes and are submitted via FormData, we can add a small piece of reactive state just for the optimal zone display, updating it on input change events.

**Implementation**: Add `onChange` handlers to the 6 optimal boundary inputs (optimal_min, optimal_max for general/male/female) that update a local display state, then render those values in the green zone block with formatted ranges.

