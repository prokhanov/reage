

## Plan: 4-Tier Biomarker Status System

### Problem
Currently the app only tracks "normal" vs "not normal" (binary). Need to implement 4 status tiers:
- 🟢 **Оптимально** — value is in the optimal zone (inner range within normal)
- 🟡 **Допустимо** — value is within normal range but outside optimal
- 🟠 **Риск** — value is outside normal range but not critically
- 🔴 **Критично** — value is far outside normal range

### Scope of Changes

This affects almost every part of the application. Here's the full breakdown:

---

### 1. Database: Add optimal/critical range fields to `biomarkers` table

Add new columns via migration:
- `optimal_min` (double precision, nullable)
- `optimal_max` (double precision, nullable)
- `optimal_min_male` / `optimal_max_male` (double precision, nullable)
- `optimal_min_female` / `optimal_max_female` (double precision, nullable)
- `critical_min` (double precision, nullable) — below this = critical
- `critical_max` (double precision, nullable) — above this = critical
- `critical_min_male` / `critical_max_male` (double precision, nullable)
- `critical_min_female` / `critical_max_female` (double precision, nullable)

Also extend the `age_ranges` JSONB structure to support `optimal_min`, `optimal_max`, `critical_min`, `critical_max` per age band.

### 2. Core utility: `src/lib/biomarkerNorms.ts`

Add a new function `getBiomarkerStatus()` that returns one of 4 tiers:
- Checks value against optimal range (optimal_min/max) → 🟢 Оптимально
- Within normal range (normal_min/max) but outside optimal → 🟡 Допустимо
- Outside normal but within critical thresholds → 🟠 Риск
- Beyond critical thresholds → 🔴 Критично

Add `getOptimalRangeForAge()` and `getCriticalRangeForAge()` functions with same fallback logic as existing `getNormalRangeForAge()`.

### 3. CSS: Add new status color variables

In `src/index.css`, add:
- `--status-optimal` (green, same as good)
- `--status-acceptable` (yellow-green)
- `--status-risk` (orange)
- `--status-critical` (red)

### 4. UI Components to Update

**Files affected:**

| File | What changes |
|------|-------------|
| `src/pages/Biomarkers.tsx` | Replace binary `isInNormalRange` with 4-tier status. Update row colors, value colors, scale bar gradient to show 4 zones |
| `src/pages/AnalysisDetail.tsx` | Replace "В норме"/"Ниже нормы"/"Выше нормы" badges with 4-tier badges. Update gauge arc to show 4 color zones instead of 3 |
| `src/pages/Trends.tsx` | Add optimal/critical reference areas on chart (4 colored bands) |
| `src/pages/Dashboard.tsx` | Health index labels already use 4 tiers (Отлично/Хорошо/Умеренно/Внимание) — review for consistency |
| `src/components/dashboard/SystemRatingsCard.tsx` | Already has 4-tier scoring — align color names |
| `src/components/BodyHeatmap.tsx` | Replace "В норме" with appropriate 4-tier status |
| `src/components/admin/AnalysisStep2.tsx` | Show 4-tier status hint next to biomarker input (optimal/acceptable/risk/critical ranges) |
| `src/pages/admin/DataManagement.tsx` | Add optimal/critical range columns to biomarker management table, editable fields |

### 5. Edge Function: `analyze-biomarkers`

Update `calculateHealthIndex()` to use the 4-tier system for penalty calculation:
- Optimal zone: 0 penalty
- Acceptable zone: small penalty
- Risk zone: medium penalty  
- Critical zone: high penalty

### 6. Admin Panel: Data Management

Add columns to the biomarker editing UI for:
- Optimal min/max (male/female)
- Critical min/max (male/female)
- Age-dependent optimal/critical ranges in the Age Ranges tab

### 7. AI Prompts

Update the analyze-biomarkers edge function to pass 4-tier classification info to AI prompts so category analysis and recommendations reference the correct status levels.

---

### Status Label & Color Mapping

| Status | Label | Color Variable | Badge Style |
|--------|-------|---------------|-------------|
| 🟢 | Оптимально | `--status-optimal` (142 76% 45%) | `bg-status-optimal/20 text-status-optimal` |
| 🟡 | Допустимо | `--status-acceptable` (55 80% 50%) | `bg-status-acceptable/20 text-status-acceptable` |
| 🟠 | Риск | `--status-risk` (25 90% 55%) | `bg-status-risk/20 text-status-risk` |
| 🔴 | Критично | `--status-critical` (0 85% 55%) | `bg-status-critical/20 text-status-critical` |

---

### Implementation Order

1. Database migration (add columns)
2. Update `biomarkerNorms.ts` utility
3. Add CSS variables
4. Update admin DataManagement UI (so ranges can be configured)
5. Update patient-facing pages (Biomarkers, AnalysisDetail, Trends)
6. Update edge function penalty calculation
7. Update AnalysisStep2 display
8. Review BodyHeatmap and Dashboard for consistency

