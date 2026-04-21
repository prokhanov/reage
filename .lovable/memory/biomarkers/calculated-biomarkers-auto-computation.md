---
name: Calculated biomarkers auto-computation
description: HOMA-IR, Caro, LDL, VLDL, AI, MCV, MCH, MCHC are derived via formulas, not entered manually
type: feature
---
Расчётные (производные) биомаркеры в системе вычисляются автоматически по формулам в `src/lib/calculatedBiomarkers.ts`. Их 8:

- **HOMA-IR** = (GLU × INS) / 22.5
- **Caro** = GLU / INS
- **VLDL** = TG / 2.2
- **LDL** (Friedewald) = TC − HDL − TG/2.2 (только при TG ≤ 4.5 ммоль/л)
- **AI** (атерогенность) = (TC − HDL) / HDL
- **MCV** = (HCT × 10) / RBC
- **MCH** = HGB / RBC
- **MCHC** = (HGB / HCT) × 10

Применяется в двух местах:
1. **Мок-генератор** (`AnalysisStep1.tsx`) — расчётные пропускаются в основном цикле, затем дозаполняются из формул. Это гарантирует, что `(GLU × INS)/22.5` всегда равно сгенерированному HOMA-IR.
2. **Ручной ввод** (`AnalysisStep2.tsx`) — поля расчётных биомаркеров `readOnly + disabled` с пометкой «Расчётный» и подсказкой формулы. `useEffect` пересчитывает их при изменении любого входного значения.

Единицы СИ проекта: GLU ммоль/л, INS мкМЕ/мл, липиды ммоль/л, HGB г/л, RBC ×10¹²/л, HCT %.

**Why:** До этого мок-генератор присваивал HOMA-IR случайные значения, не соответствующие сгенерированным GLU и INS, что приводило к клинически некорректным анализам (например, у пациентки Алина Дарбинян).
