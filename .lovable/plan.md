

## Design Consistency Audit & Fix Plan

### Issues Found

After reviewing all 11 landing sections, here are the inconsistencies:

**1. Heading gradient (CRITICAL)**
- Most sections: `bg-gradient-hero bg-clip-text text-transparent` (proper purple-to-pink gradient)
- **BiomarkersDeepDive**: `bg-gradient-to-r from-primary to-primary/60` (fades to transparent pink)
- **ReportShowcase**: `bg-gradient-to-r from-primary via-primary/80 to-primary` (solid pink, no gradient)
- **AppFeatures**: `bg-gradient-to-r from-primary via-primary/80 to-primary` (same solid pink)

**2. Heading font sizes**
- Standard (most sections): `text-3xl sm:text-4xl md:text-5xl`
- **BiomarkersDeepDive**: `text-4xl md:text-6xl` (too large)
- **ReportShowcase**: `text-4xl md:text-5xl lg:text-6xl` (too large)
- **AppFeatures**: `text-4xl md:text-5xl` (missing `sm:text-4xl`, missing `text-3xl` base)

**3. Section padding**
- Standard: `py-20 md:py-28`
- **BiomarkersDeepDive**: `py-20 md:py-32` (4rem more bottom)

**4. Header-to-content margin**
- Standard: `mb-16 md:mb-20`
- **WhyCheckupsFail**: `mb-12 md:mb-16` (smaller)
- **BiomarkersDeepDive**: `mb-16` (no responsive step)
- **PreventiveMedicine**: `mb-16` (no responsive step)

**5. Subtitle text size**
- Standard: `text-lg md:text-xl`
- **ReportShowcase**: `text-xl` (no responsive, slightly bigger on mobile)
- **AppFeatures**: `text-xl` (same)

**6. Badge pill presence** — Some sections lack the top pill badge that most others have. Not all need one, but for consistency the sections with a natural label should have it. Missing on: WhyCheckupsFail, BiomarkersDeepDive, ComparisonSection.

### Plan

Fix all 5 inconsistent files to match the standard pattern:

| Property | Standard Value |
|---|---|
| Section padding | `py-20 md:py-28` |
| Header margin | `mb-16 md:mb-20` |
| h2 size | `text-3xl sm:text-4xl md:text-5xl` |
| Gradient text | `bg-gradient-hero bg-clip-text text-transparent` |
| Subtitle size | `text-lg md:text-xl` |

**Files to edit:**
1. `BiomarkersDeepDiveSection.tsx` — fix heading gradient, h2 size, section padding, header margin
2. `ReportShowcaseSection.tsx` — fix heading gradient, h2 size, subtitle size
3. `AppFeaturesSection.tsx` — fix heading gradient, h2 size, subtitle size
4. `WhyCheckupsFail.tsx` — fix header margin
5. `PreventiveMedicineSection.tsx` — fix header margin

No structural or content changes. Pure formatting alignment across all sections.

