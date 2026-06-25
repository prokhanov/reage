## Цель
Заменить старый Hero на главной странице (`/`) на портретный Hero из `/landing-v2`, сделав его независимым компонентом, чтобы дальнейшие правки тестового лендинга не влияли на главную и наоборот.

## Шаги

1. **Создать новый компонент** `src/components/landing/HeroPortrait.tsx` — копия `src/components/landing/v2/HeroBlockPortrait.tsx`, но:
   - без пропа `editMode` и без всей логики drag-and-drop редактора (`EditArtboard`, экспорт в localStorage, чтение `?layoutEdit=1`);
   - остаётся только `StaticArtboard` с захардкоженными координатами `DEFAULT_LAYOUTS` (desktop / tablet / mobile);
   - переключатель темы, бейдж "Москва и Санкт-Петербург", заголовок, виджеты (Bio Age / Biomarkers / Recommendations / Systems), фото пары — всё сохраняется как сейчас на v2;
   - **не переносится** ни «Блок N», ни кнопки Edit/Copy layouts (они живут только в `LandingV2.tsx`).

2. **Подключить на главной** `src/pages/Index.tsx`:
   - заменить `import { HeroSection } from "@/components/landing/HeroSection"` на `import { HeroPortrait } from "@/components/landing/HeroPortrait"`;
   - в JSX заменить `<HeroSection />` на `<HeroPortrait />`.

3. **Старый `HeroSection.tsx` не трогать** — оставляем в репозитории как есть (на случай отката). Если хочется его удалить — скажите отдельно.

4. **Landing v2 (`/landing-v2`) остаётся без изменений** — продолжает использовать `HeroBlockPortrait` с edit-режимом.

## Технические детали
- Ассет `src/assets/landing-v2/hero-couple-v2.png.asset.json` переиспользуется как есть (общий CDN-указатель, дублировать не нужно).
- Координаты `DEFAULT_LAYOUTS` копируются «как есть» на момент создания. Дальнейшая синхронизация ручная: если поправите v2 — отдельной просьбой перенесём в main, и наоборот.
- Theme toggle (`top-4 right-4`) сохраняется в новом компоненте — он уже есть и на главной не конфликтует.
