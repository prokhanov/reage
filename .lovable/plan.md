

## Plan: Move System Rating Bars into Biomarkers Accordion Headers

### What changes

Move each category's score and progress bar from `SystemRatingsCard` into the corresponding category header in the Biomarkers accordion. Each accordion trigger will show: emoji + category name + badge count + **score (X/100) with colored progress bar**.

### Implementation

1. **`src/pages/Biomarkers.tsx`** — Accept a new optional prop `categoryScores` (the same object passed to `SystemRatingsCard`). In each `AccordionTrigger`, after the badge, render:
   - Score number colored by status (optimal/acceptable/risk/critical)
   - A thin progress bar (same style as `SystemRatingsCard`) showing score out of 100
   - Replace the generic `Activity` icon with the category emoji from `biomarker_categories`

2. **`src/pages/Dashboard.tsx`** — Pass `displayCategoryScores` as a prop to the `<Biomarkers />` component embedded in the tabs section.

3. **`src/components/dashboard/SystemRatingsCard.tsx`** — Remove the progress bars per category (keep the card for overall trend display with period selector). Alternatively, remove the entire card if all its info is now in the Biomarkers section.

### Files to modify
- `src/pages/Biomarkers.tsx` — add `categoryScores` prop, render score + bar in accordion headers, load category emoji
- `src/pages/Dashboard.tsx` — pass `displayCategoryScores` to `<Biomarkers />`
- `src/components/dashboard/SystemRatingsCard.tsx` — evaluate removal or simplification

