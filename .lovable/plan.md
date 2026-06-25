Быстрый фикс hero на reage.life — без компрессии, просто переношу картинку из Lovable-CDN в обычные `src/assets`, чтобы Vite её забандлил в `/assets/*` (этот префикс уже разрешён в nginx).

## Шаги

1. Скачать оригинал hero с Lovable CDN:
   `curl -o src/assets/landing-v2/hero-couple-v2.png https://id-preview--86f3da23-8817-4756-ac7c-4097287e8ee5.lovable.app/__l5e/assets-v1/8997c026-4f1c-4c07-824a-7c3587fa9ff6/hero-couple-v2.png`
2. В `src/components/landing/HeroPortrait.tsx` заменить:
   - `import heroCoupleAsset from "@/assets/landing-v2/hero-couple-v2.png.asset.json";`
   - `const heroMan = heroCoupleAsset.url;`
   на обычный импорт:
   - `import heroMan from "@/assets/landing-v2/hero-couple-v2.png";`
3. Удалить `src/assets/landing-v2/hero-couple-v2.png.asset.json`.

После публикации фронта картинка поедет с `/assets/hero-couple-v2-<hash>.png` и nginx её отдаст без проблем. Компрессию сделаем отдельно, когда скажешь.
