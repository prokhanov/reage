

## Plan: App-like metrics marquee in Hero section

### What
Create a single-row horizontal marquee of compact "app widget" cards placed **above the heading** in the Hero section. The cards look like mini UI elements from the app — with progress bars, scale indicators, status badges. One row only, no vertical float animation, just smooth horizontal scroll.

### Widgets (mock data, app-like)
1. **Биовозраст** — circular mini gauge showing "32 года" with "−3 от паспортного"
2. **Темп старения** — small bar with value "0.85x", label "замедлен", green indicator
3. **Индекс здоровья** — progress bar at 87%, green
4. **Витамин D** — mini scale with zones (норма/оптимум/отклонение), marker at "оптимум"
5. **Ферритин** — mini scale with marker in "норма" zone
6. **Гомоцистеин** — mini scale with marker in "отклонение" zone (warning)
7. **Рекомендации** — "12 персональных", small list icon
8. **Системы** — 5 mini dots (4 green, 1 yellow), "4/5 в норме"

### Design
- Cards: compact ~140-160px wide, ~70-80px tall (much shorter than current marquee cards)
- Single row with `animate-marquee-right`, gradient edge masks
- `bg-card/30 backdrop-blur border border-border/30 rounded-xl`
- No vertical float animation
- Mini progress bars / colored zone indicators inside cards
- Muted, glassy look — serves as decorative social proof, not primary content

### Files
1. **`src/components/landing/HeroMetricsMarquee.tsx`** — new component with the marquee and widget cards
2. **`src/components/landing/HeroSection.tsx`** — import and place `<HeroMetricsMarquee />` above the badge/heading, inside the content div after pt-28 padding area

