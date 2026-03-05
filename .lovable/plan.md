

## Remaining 4-Tier Status Gaps

The core 4-tier system (🟢 Оптимально, 🟡 Допустимо, 🟠 Риск, 🔴 Критично) is already implemented in:
- `biomarkerNorms.ts` utility (core logic)
- CSS variables and Tailwind config
- `Biomarkers.tsx`, `AnalysisDetail.tsx`, `Trends.tsx` (patient UI)
- `BodyHeatmap.tsx`, `SystemRatingsCard.tsx` (dashboard)
- `AnalysisStep2.tsx` (admin input)
- `DataManagement.tsx` (admin config including age ranges)
- `analyze-biomarkers` edge function (health index + AI prompts)

**What's still using binary norm/not-norm:**

### 1. `health-assistant` edge function
Lines 160-178: Only shows `(норма: min-max)` next to biomarker values. Should add optimal/critical ranges and 4-tier status label like the analyze-biomarkers function does.

### 2. `analyze-risk-zones` edge function
Lines 93-126: Only calculates deviation from normal range. Should include optimal/critical ranges and pass 4-tier status to the AI context so risk zone analysis accounts for all tiers.

---

### Implementation

**File: `supabase/functions/health-assistant/index.ts`**
- Extend biomarker context building (lines 160-178) to resolve optimal/critical ranges with same fallback logic (age → gender → general)
- Add 4-tier status label next to each biomarker: `🟢 ОПТИМАЛЬНО`, `🟡 ДОПУСТИМО`, `🟠 РИСК`, `🔴 КРИТИЧНО`
- Show expanded range info: `(оптимум: X-Y | норма: X-Y | крит: <X / >Y)`

**File: `supabase/functions/analyze-risk-zones/index.ts`**
- Extend biomarker context building (lines 88-128) to resolve optimal/critical ranges
- Add 4-tier status label and include optimal/critical range info in the AI context
- Replace simple `[норма для возраста: X-Y]` with full range display

Both functions will use the same range resolution logic already proven in `analyze-biomarkers`.

