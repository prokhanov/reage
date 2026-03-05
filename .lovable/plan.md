

## Plan: Restructure to Clear 7-Segment Biomarker Range System

The system already has 3 pairs of DB fields (optimal_min/max, normal_min/max, critical_min/max) that define 7 segments. The task is to make this 7-segment model visually clear and consistent everywhere.

### Current DB mapping to 7 segments:
```text
🔴 Крит.низ ← critical_min → 🟠 Риск низ ← normal_min → 🟡 Допуст.низ ← optimal_min → 🟢 Оптимально ← optimal_max → 🟡 Допуст.верх ← normal_max → 🟠 Риск верх ← critical_max → 🔴 Крит.верх
```

No DB changes needed — the 3 existing pairs define all 7 boundaries.

---

### 1. Restructure Edit Biomarker Dialog (`src/pages/admin/DataManagement.tsx`)

Replace the current 4 color-coded sections with a single visual scale showing 7 boundary points as a clear ordered list:

```text
🔴 Критично низ  ──  critical_min  (input)
🟠 Риск низ      ──  normal_min    (input)  
🟡 Допустимо низ ──  optimal_min   (input)
🟢 Оптимально    ──  (between optimal_min and optimal_max)
🟡 Допустимо верх── optimal_max    (input)
🟠 Риск верх     ──  normal_max    (input)
🔴 Критично верх ──  critical_max  (input)
```

Each boundary has: General + Male + Female fields (same as current, just reorganized). Plus a visual mini-bar preview at the top showing how the 7 segments look with current values.

The 4-tier legend stays but is updated to reference the 7 segments explicitly. Age-dependent ranges also get this 7-segment layout.

### 2. Update BiomarkerRangeBar (`src/components/BiomarkerRangeBar.tsx`)

Already largely correct. Minor fix: add labels under the bar showing boundary values (e.g., the actual numbers at each segment transition) for clarity.

### 3. Update Trends Page (`src/pages/Trends.tsx`)

Add ReferenceArea for Risk zones (between normal and critical boundaries). Currently only shows optimal and acceptable zones. Add:
- Risk low zone: `ReferenceArea` between `criticalMin` and `refMin` with `status-risk` color
- Risk high zone: `ReferenceArea` between `refMax` and `criticalMax` with `status-risk` color

### 4. Update AnalysisStep2 (`src/components/admin/AnalysisStep2.tsx`)

Already uses `getBiomarkerStatus` for 4-tier classification. Add `BiomarkerRangeBar` component next to each biomarker value input so staff can visually see where the entered value falls on the 7-segment scale in real-time.

### 5. Update AI Edge Functions

- `analyze-risk-zones/index.ts` (lines 88-152): Already has 4-tier status logic. Add explicit 7-segment context to AI prompt: describe each boundary clearly so AI understands the full scale.
- `analyze-biomarkers/index.ts`: Same — ensure AI prompt includes all 7 segment boundaries in the biomarker context.

### 6. Update AnalysisDetail Page (`src/pages/AnalysisDetail.tsx`)

Add `BiomarkerRangeBar` component to biomarker value display to show the 7-segment visual bar alongside each result.

### 7. Core Logic (`src/lib/biomarkerNorms.ts`)

Already correct — `getBiomarkerStatus` handles all 4 tiers based on 3 range pairs. No changes needed.

---

### Summary of files to change:
1. `src/pages/admin/DataManagement.tsx` — restructure edit dialog to 7-segment inputs
2. `src/components/BiomarkerRangeBar.tsx` — add boundary value labels
3. `src/pages/Trends.tsx` — add risk zone ReferenceAreas
4. `src/components/admin/AnalysisStep2.tsx` — add BiomarkerRangeBar to inputs
5. `src/pages/AnalysisDetail.tsx` — add BiomarkerRangeBar to results
6. `supabase/functions/analyze-risk-zones/index.ts` — clarify 7-segment context in AI prompt
7. `supabase/functions/analyze-biomarkers/index.ts` — clarify 7-segment context in AI prompt

