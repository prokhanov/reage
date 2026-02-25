

## Problem

The SmartPriorities component has two issues:

### 1. Data format mismatch
Demo data uses a different structure than what the component expects:

**Demo data (predicted_improvements):**
```json
{"metric": "HbA1c", "from": 6.1, "to": 5.7, "unit": "%"}
{"metric": "Энергия", "improvement": "+25%"}
```

**Component expects:**
```json
{"metric": "HbA1c", "change": "...", "timeline_days": 14, "confidence": 90}
```

Similarly, demo task predictions lack `id`, `timeline`, `metric`, `improvement` fields. This causes "0%", "0 мг/л", missing data throughout.

Real AI-generated data does match the schema (as confirmed by the actual `risk_zone_analyses` query), but demo data does not.

### 2. Confusing UI
Even with correct data, the display shows raw numbers without context:
- "14д, 90%" — what does 14 days mean? 90% of what?
- "0% уверенности" — unclear and alarming
- Too many numbers crammed together

## Solution

### A. Redesign SmartPriorities UI (component rewrite)

**Predicted improvements section** — show clearly:
- Metric name on the left
- Expected change as a clear badge (e.g., "HbA1c 6.1→5.7%" or "↓15-20%")
- Timeline as readable text: "за 2 нед." instead of "14д"
- Remove confidence percentage from improvements (clutters UI, low user value)

**Task cards** — simplify:
- Show action + reason (keep as-is)
- Show prediction effect as a single clear line
- Remove "% уверенности" — this number is meaningless to users
- Show timeline from the task itself ("2 недели", "4-6 недель")

### B. Handle both data formats (demo + AI)

Make the component gracefully handle both the demo data format (`from/to/unit`, `improvement`) and the AI schema format (`change`, `timeline_days`, `confidence`). Normalize data before rendering:

- If `from` and `to` exist: display as "from → to unit"
- If `change` exists: display as-is
- If `improvement` exists: display as-is
- If `timeline_days` exists: convert to readable ("14д" → "2 нед.")
- If task has no `id`/`timeline`/prediction fields: handle gracefully with fallbacks

### C. Update demo data in database

Update the `demo_data_templates` to use the correct schema format matching the AI output, so demo data renders identically to real data. This is a migration to fix `smart_priorities` in both `male_data` and `female_data`.

## Files to change

1. **`src/components/risk-zones/SmartPriorities.tsx`** — redesign UI, handle both data formats
2. **New migration** — fix demo `smart_priorities` data to match AI schema

