

## Plan: Show 4-Tier System in Edit Biomarker Dialog

### Problem
The edit biomarker dialog shows 3 sections (Норма, Оптимальные, Критические), but the system has 4 tiers. The user expects to see all 4 levels visually represented: 🟢 Оптимально, 🟡 Допустимо, 🟠 Риск, 🔴 Критично.

### Key Insight
Only 3 ranges are configurable (optimal, normal, critical) because the 4th tiers are derived:
- 🟡 **Допустимо** = between optimal and normal bounds (no separate fields needed)
- 🟠 **Риск** = between normal and critical bounds (no separate fields needed)

### Changes in `src/pages/admin/DataManagement.tsx`

1. **Add a 4-tier visual legend** at the top of the ranges section explaining how the tiers work:

```text
🟢 Оптимально — значение в оптимальном диапазоне
🟡 Допустимо  — между оптимальным и нормальным
🟠 Риск       — между нормальным и критическим  
🔴 Критично   — за пределами критического
```

2. **Relabel the 3 sections** with all 4 emoji indicators to show how they relate:
   - Current "Нормальные диапазоны" → "🟡 Нормальные диапазоны (граница Допустимо ↔ Риск)"
   - Keep "🟢 Оптимальные диапазоны (граница Оптимально ↔ Допустимо)"
   - Keep "🔴 Критические диапазоны (граница Риск ↔ Критично)"

3. **Reorder sections** logically: 🟢 Оптимальные → 🟡 Нормальные → 🔴 Критические (from inner to outer range)

This makes clear that 4 tiers exist even though only 3 boundary ranges need configuration.

