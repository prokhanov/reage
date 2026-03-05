

## Plan: Preserve Both Range Modes, Use Selected for Evaluation

### Problem
Currently, switching to "age" mode and saving nullifies all general range fields (and vice versa). The user wants both datasets to be preserved in the database — the toggle only determines which mode is used for biomarker evaluation.

### Solution

#### 1. Add `range_mode` column to `biomarkers` table
- **Migration**: `ALTER TABLE biomarkers ADD COLUMN range_mode text NOT NULL DEFAULT 'general';`
- Stores `'general'` or `'age'` — indicates which mode is active for evaluation

#### 2. Update save logic in `DataManagement.tsx` (lines 414-443)
- Remove all `isAgeMode ? null :` conditionals — always save both general fields and age_ranges as provided by the form
- Add `range_mode: rangeMode` to the saved biomarker object
- Both datasets persist regardless of which mode is selected

#### 3. Update evaluation logic in `biomarkerNorms.ts`
- `getNormalRangeForAge`, `getOptimalRangeForAge`, `getCriticalRangeForAge`: check `biomarker.range_mode`
  - If `range_mode === 'age'` → use current logic (age_ranges first, then gender fallback, then general)
  - If `range_mode === 'general'` (or undefined for backward compat) → skip age_ranges, go straight to gender-specific → general

#### 4. Update edge functions
- `analyze-biomarkers/index.ts` and `analyze-risk-zones/index.ts`: same logic — respect `range_mode` when resolving boundaries

#### 5. UI: Initialize `rangeMode` from `biomarker.range_mode` on edit

### Files
- **Migration**: add `range_mode` column
- `src/pages/admin/DataManagement.tsx` — save logic + init
- `src/lib/biomarkerNorms.ts` — respect `range_mode`
- `supabase/functions/analyze-biomarkers/index.ts` — respect `range_mode`
- `supabase/functions/analyze-risk-zones/index.ts` — respect `range_mode`

