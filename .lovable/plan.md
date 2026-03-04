

## Redesign: "Почему чекапы не работают" — compact and elegant

**Problem**: 5 vertical cards take too much vertical space. The section feels heavy and repetitive.

**Solution**: Compact horizontal layout — icon + short title only, no descriptions. One tight row of 5 items on desktop (2+3 or scrollable on mobile). Think "icon chips" or a single visual strip.

**Design approach**:
- Replace vertical list with a **horizontal grid** (5 columns on desktop, 2-3 on tablet, single column scroll on mobile)
- Each item: icon + bold title only (drop descriptions — the titles are self-explanatory)
- Below the grid, one short summary sentence reinforcing the message
- Reduce section padding from `py-24 md:py-32` to `py-16 md:py-24`
- Keep the same header but tighten margins
- Items styled as compact pills/chips with icon + text, not full cards

**Layout**:
```text
┌─────────────────────────────────────────────────┐
│    Почему обычные чекапы не работают             │
│    subtitle                                      │
│                                                  │
│  [📷 Один снимок] [📄 Непонятные цифры]         │
│  [👤 Сдал и забыл] [🔗 Нет связи] [🔍 Не всё]  │
└─────────────────────────────────────────────────┘
```

On desktop: single row of 5 compact items. On mobile: 2-col grid with last item centered.

**File changes**: Only `src/components/landing/WhyCheckupsFail.tsx` — rewrite to compact chip/pill layout.

