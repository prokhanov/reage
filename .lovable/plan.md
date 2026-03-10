

## Responsive Audit: Issues & Fixes

### Critical Issues Found

**1. ComparisonSection — table unreadable on mobile**
The 4-column grid (`grid-cols-4`) forces tiny text on narrow screens. Feature names, check marks, and column headers all squeeze together. Need to convert to a card/stack layout on mobile.

**2. ReportShowcaseSection — fixed pixel card sizes**
Cards use hardcoded `width: 280px`, `height: 380px` and container `h-[450px]`. On small phones (320-375px wide), cards overflow or get cut off. Need responsive sizing.

**3. BiomarkersDeepDiveSection — tab bar overflow on mobile**
Six tabs in a single row overflow horizontally with no scroll indicator. Need horizontal scroll with visual cues, or wrap to 2 rows on mobile.

**4. HeroSection — badge text overflows on mobile**
The single-line badge with "85 биомаркеров • Анализы не выходя из дома • Результат за 5 дней • Отслеживание трендов" is too long for mobile. Logo `left-8` pushes logo off-screen edge on very small devices.

**5. PainPointsSection — inconsistent section padding**
Uses `py-24 md:py-32` instead of the standard `py-20 md:py-28`.

**6. BiomarkersDeepDiveSection — arrow buttons overlap content on mobile**
Arrows at `-left-4` / `-right-4` position over the card content on mobile. Need to move them below the card on small screens.

### Plan

**Files to edit (6):**

1. **`HeroSection.tsx`**
   - Make badge text wrap or split into 2 lines on mobile (add `text-center` and allow wrapping)
   - Change logo from `left-8` to `left-4 md:left-8`

2. **`PainPointsSection.tsx`**
   - Fix padding to `py-20 md:py-28`

3. **`ComparisonSection.tsx`**
   - Hide the 4-column table on mobile (`hidden md:block`)
   - Add a mobile-only stacked card layout showing ReAge vs others per feature

4. **`ReportShowcaseSection.tsx`**
   - Make card width/height responsive: smaller on mobile (e.g., `w-[220px] h-[300px]` on small screens, full size on `md:`)
   - Reduce container height on mobile: `h-[350px] md:h-[450px]`
   - Scale transform offsets for mobile

5. **`BiomarkersDeepDiveSection.tsx`**
   - Make tab bar horizontally scrollable on mobile with `overflow-x-auto` and hide scrollbar
   - Move arrow buttons below card on mobile (hidden on mobile, show dots-only navigation)

6. **`CTASection.tsx` (Footer)**
   - Minor: the footer grid is fine but verify contact buttons don't squish

### No structural or content changes. Pure responsive fixes.

