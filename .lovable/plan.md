

## Mock Data Generator for Analysis Wizard

### What
Add a "Заполнить мок-данные" button on Step 1 of the Create Analysis Wizard. When clicked, it shows a dialog asking the health level (1-5 scale: 1=very sick, 5=perfectly healthy). Then it fetches all biomarkers from the database, generates realistic values based on the patient's age/gender/norms, and populates Step 2's values -- automatically advancing to Step 2.

### How it works

**Health level logic (client-side generation, no AI needed):**
- Level 5 (healthy): values fall within optimal range
- Level 4: mostly optimal, ~20% in acceptable zone
- Level 3: mix of optimal/acceptable/risk
- Level 2: many risk values, some critical
- Level 1 (very sick): many critical/risk values

**For each biomarker:**
1. Resolve the correct normal/optimal/critical ranges using existing `getNormalRangeForAge`, `getOptimalRangeForAge`, `getCriticalRangeForAge` from `biomarkerNorms.ts` based on patient age + gender
2. Based on health level, pick a target zone (optimal/acceptable/risk/critical) with weighted probability
3. Generate a random value within that zone
4. If no ranges defined, skip the biomarker

### Files to modify

| File | Change |
|------|--------|
| `src/components/admin/AnalysisStep1.tsx` | Add "Заполнить мок-данные" button + health level selection dialog |
| `src/components/admin/CreateAnalysisWizard.tsx` | Pass `onMockGenerate` callback from wizard to Step1 that sets step2 values and advances to step 2 |

### UI Flow
1. Step 1 shows existing date/lab fields + new button "🧪 Заполнить мок-данные"
2. Click -> small dialog with 5 buttons (1-5 scale with labels: "Критичный", "Больной", "Средний", "Здоровый", "Идеальный")
3. On selection -> fetch all biomarkers + patient profile -> generate values -> populate step2 data -> auto-advance to step 2
4. Toast: "Сгенерировано X мок-значений"

### Value generation algorithm (pseudocode)
```text
For each biomarker:
  resolve ranges (normal, optimal, critical) for patient age/gender
  if no normal range -> skip
  
  roll = random()
  based on healthLevel:
    5: 90% optimal, 10% acceptable
    4: 70% optimal, 20% acceptable, 10% risk  
    3: 30% optimal, 40% acceptable, 25% risk, 5% critical
    2: 10% optimal, 20% acceptable, 40% risk, 30% critical
    1: 5% optimal, 10% acceptable, 30% risk, 55% critical
  
  generate value in chosen zone with slight random offset
```

