

## Plan: Create a Biomarker Range Bar Component

The user wants a visual colored range bar (like in the screenshot) that shows distinct colored segments for each zone (🔴 critical → 🟠 risk → 🟡 acceptable → 🟢 optimal → 🟡 acceptable → 🟠 risk → 🔴 critical) with a marker showing the current value position.

Currently, `Biomarkers.tsx` (line 370-435) has an inline gradient-based bar. This needs to be replaced with a proper segmented bar that uses the actual configured ranges to calculate segment widths proportionally.

### Changes

**1. New component: `src/components/BiomarkerRangeBar.tsx`**

A reusable component that takes biomarker data, value, age, and gender, then renders a segmented colored bar:

- Calculates segment widths proportionally based on actual optimal/normal/critical range values
- Renders 7 segments: 🔴 low critical | 🟠 low risk | 🟡 low acceptable | 🟢 optimal | 🟡 high acceptable | 🟠 high risk | 🔴 high critical
- Each segment is a colored rounded div (matching the screenshot style — solid colors, not gradients)
- A dark vertical marker shows the current value position
- Colors: red (`--status-critical`), orange (`--status-risk`), yellow (`--status-acceptable`), green (`--status-optimal`)
- Gracefully handles missing ranges (e.g., no optimal → normal becomes green)

**2. Update `src/pages/Biomarkers.tsx`**

Replace the inline gradient bar (lines 370-435) with the new `<BiomarkerRangeBar>` component, passing in the biomarker object, value, age, and gender.

**3. Reuse potential**

The component can later be used in AnalysisStep2, AnalysisDetail, MyState, and other pages that display biomarker values.

