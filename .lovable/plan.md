

## Plan: Merge Biomarkers + Trends into Dashboard

### What changes

1. **Dashboard (`src/pages/Dashboard.tsx`)** — Add two new tabs below existing content:
   - **"Маркеры"** tab — embed the biomarkers table (Accordion + Table from `Biomarkers.tsx`), reusing the same data-fetching logic and components (`BiomarkerRangeBar`, status colors, tooltips)
   - **"Тренды"** tab — embed the trends chart UI (biomarker selector, period picker, chart from `Trends.tsx`)
   - Wrap both in a `Tabs` component at the bottom of the dashboard, after `WeightTracker`

2. **Remove standalone pages from navigation** (`src/components/AppSidebar.tsx`):
   - Remove `{ to: "/biomarkers", ... }` and `{ to: "/trends", ... }` from `navItems`

3. **Keep routes alive** (`src/App.tsx`):
   - Keep `/biomarkers` and `/trends` routes (redirect to `/dashboard` or keep as-is for backward compatibility)

4. **Admin view** (`src/components/admin/PatientViewDialog.tsx`):
   - Remove `/biomarkers` and `/trends` cases from `SimulatedContent` (they'll be visible within Dashboard)

### Implementation approach

- Extract biomarkers table rendering into a section within Dashboard (inline, not a separate component — keeps it simple since it's a one-time embed)
- Import the full `Trends` logic (biomarker list loading, trend chart, period selector) into Dashboard
- Both sections will use `useViewAsUser` and `useDemoMode` already present in Dashboard
- The new tabs block will be a separate `<Card>` with `<Tabs>` containing "Маркеры" and "Тренды" tabs

### Files to modify
- `src/pages/Dashboard.tsx` — add biomarkers table + trends as tabs at bottom
- `src/components/AppSidebar.tsx` — remove 2 nav items
- `src/components/admin/PatientViewDialog.tsx` — clean up removed routes
- `src/App.tsx` — redirect `/biomarkers` and `/trends` to `/dashboard`

