

## Fix: Horizontal overflow + ReportShowcase mobile issues

### Root Problems

1. **`Index.tsx` (line 72)** — root wrapper `<div className="min-h-screen bg-background">` has no `overflow-x-hidden`, so any child overflow leaks to the entire page as horizontal scroll
2. **`PricingSection.tsx` (line 204)** — explicitly uses `overflow-visible`, allowing its large decorative orbs (`w-[500px]`, `w-[400px]`) to bleed outside the viewport on mobile

The ReportShowcase section itself renders correctly on mobile (verified via screenshots) — cards are sized at 220×300px, navigation works, features stack properly. No changes needed there.

### Plan (2 files)

1. **`src/pages/Index.tsx`** line 72 — add `overflow-x-hidden` to the root div
2. **`src/components/landing/PricingSection.tsx`** line 204 — change `overflow-visible` to `overflow-hidden`

