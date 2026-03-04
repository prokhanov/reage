

## Plan: Redesign WhyCheckupsFail — compact 2x2 grid with descriptions

### File: `src/components/landing/WhyCheckupsFail.tsx` — full rewrite

**Layout**: 2x2 grid on desktop, stacked on mobile. Each card has:
- Small icon (Camera, FileQuestion, Clock, Shield)
- Bold title
- 1-2 line description text
- Left accent border (primary gradient)

**4 cards with full text**:
1. **Это разовая фотография здоровья** — Чекап показывает состояние организма только в один момент времени. Без повторений невозможно понять, улучшается здоровье или ухудшается.
2. **Цифры без объяснений** — После чекапа человек получает таблицу анализов, но не понимает, что на самом деле происходит и на что обращать внимание.
3. **Редко и слишком поздно** — Чекапы делают раз в год, а изменения в организме происходят постоянно. Ранние сигналы проблем часто пропускаются.
4. **Они ищут болезни, а не управляют здоровьем** — Чекапы диагностируют уже возникшие проблемы, но почти не помогают понять, как предотвратить их заранее.

**Styling**: Clean background with subtle gradient, no heavy orbs. Heading with `bg-gradient-hero`. Cards use `bg-card/50 backdrop-blur-sm border-l-2 border-l-primary`.

