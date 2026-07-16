# План ускорения лендинга (только код)

Цель: улучшить PageSpeed (LCP, TBT, размер бандла) **без** правок сервера, nginx, БД, edge-функций и без изменения внешнего вида/логики. Каждый шаг — независимый коммит, легко откатывается через git revert.

## Проверка безопасности изменений

Перепроверил после первичного анализа:

- `vite.config.ts` — уже есть `dedupe`/`optimizeDeps`. Добавление `manualChunks` в `build.rollupOptions.output` не ломает dev, влияет только на прод-бандл. **Безопасно, откатываемо.**
- `index.html` — блокирующий Google Fonts CSS + синхронная Яндекс.Метрика в `<head>`. Метрика поддерживает отложенную инициализацию через `ym.a` очередь (мы уже так вызываем `ym(id,'init',...)`), так что перенос загрузки `tag.js` в `requestIdleCallback` **не потеряет события** — они буферизуются в очереди и обработаются при загрузке скрипта. `webvisor:true` и `clickmap` начнут работать чуть позже (~1-2 сек), это допустимо.
- `<noscript>` пиксель Метрики сейчас в `<body>` ✅ (правило соблюдено).
- Тяжёлые PNG (`hero-couple-v7.png` 924KB, `hero-couple-v4.png` 856KB, `dashboard-mock-light-v9.png` 554KB, `report-page-13.png` 352KB) — все импортируются через `@/assets/...` → пойдут через Vite, никаких `.asset.json`/CDN путей. Правило "медиа через Vite" соблюдено.
- Никаких изменений в `src/integrations/supabase/*`, `.env`, auth, роутах, edge-функциях, квизах, письмах, Telegram.
- Никаких хардкодов `reage.life` / `*.supabase.co`.

## Шаги (в порядке приоритета)

### 1. Оптимизация изображений (самый большой выигрыш, ~1.5–2 MB)

- Установить `vite-imagetools` (dev-dep, только билд-тайм).
- Для 4 тяжёлых PNG на лендинге (`hero-couple-v7`, `hero-couple-v4`, `dashboard-mock-light-v9`, `report-page-13`, а также `report-page-01`, `report-page-61`) заменить импорты на формат-специфичные:
  ```ts
  import heroAvif from "@/assets/landing-v2/hero-couple-v7.png?format=avif&quality=70";
  import heroWebp from "@/assets/landing-v2/hero-couple-v7.png?format=webp&quality=78";
  import heroPng  from "@/assets/landing-v2/hero-couple-v7.png?w=1600";
  ```
- Обернуть `<img>` в `<picture>` с `<source type="image/avif">`, `<source type="image/webp">` и fallback `<img>`.
- Проставить `width`/`height` (реальные из файлов) — устраняет CLS, PageSpeed требует.
- LCP-кандидату (первое изображение hero) — `fetchpriority="high"` + `<link rel="preload" as="image" imagesrcset=... imagetype="image/avif">` в `index.html`.
- Всем остальным изображениям ниже сгиба — `loading="lazy" decoding="async"`.
- Визуально: пиксель в пиксель, отличий не будет. Откат: `git revert` одного коммита + `bun remove vite-imagetools`.

### 2. Google Fonts — non-blocking

Заменить в `index.html`:
```html
<link rel="preload" href="…css2?family=Inter…" as="style" onload="this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="…css2?family=Inter…"></noscript>
```
Плюс уже есть `&display=swap` — FOUT минимален. Визуально почти незаметно. Откат: 1 строка.

### 3. Яндекс.Метрика — отложенная загрузка

- Оставить `ym(id,'init',...)` синхронно (создаёт очередь).
- Загрузку `tag.js` перенести в `requestIdleCallback` (fallback `setTimeout(…, 2000)`).
- События из очереди `ym.a` подхватятся автоматически, `webvisor` начнёт запись после загрузки скрипта.
- Никакой потери трафика/данных: hit фиксируется через init.

### 4. Code-splitting лендинга

- `React.lazy` + `Suspense` (с fallback = пустой div высотой ~секции) для тяжёлых секций ниже первого экрана:
  `HowItWorksBlock`, `CycleInfographicBlock`, `ReportCollageBlock`, `ReportShowcaseSection`, `ComparisonSection`, `FAQSection`, `TestimonialsSection`, `PricingSection`, `PersonasSection`.
- Модалки квизов уже редко открываются — тоже в `lazy`: `HealthRiskQuizModal`, `LifestyleQuizModal`, `FeedbackDialog`, `BiomarkerComparisonDialog`.
- В `vite.config.ts` добавить `build.rollupOptions.output.manualChunks`:
  ```ts
  { 'vendor-motion': ['framer-motion'],
    'vendor-charts': ['recharts'],
    'vendor-query':  ['@tanstack/react-query'] }
  ```
- Ничего в UI/логике не меняется. Откат: revert.

### 5. Мелочи

- `will-change: transform` на анимируемых marquee/портрете (уменьшает layout thrash).
- Удалить `console.log` из прод-сборки через `esbuild.drop: ['console','debugger']` в `vite.config.ts` для `mode==='production'`.
- Убедиться, что все `<img>` на лендинге имеют `width`/`height`/`alt`.

## Что НЕ трогаем

- ❌ nginx / REG.RU / `deploy/nginx/default.conf` (согласовано, шаг 5 из прошлого плана исключён).
- ❌ Supabase client, `.env`, edge-функции, миграции.
- ❌ Логика квизов, авторизации, писем, Telegram, отчётов.
- ❌ Роутинг, дизайн-токены, темы.

## Ожидаемый эффект

- LCP: −40…55% (AVIF hero + preload).
- TBT: −30…50% (code-split + отложенная Метрика).
- Total bundle: −400…600 KB gzip на первом заходе.
- Repeat-visit кеш без nginx-TTL — эффект слабее, но 304 от If-Modified-Since всё равно работает.

## Порядок коммитов (для лёгкого отката)

1. `perf(images): AVIF/WebP + <picture> + dims for landing heroes`
2. `perf(fonts): non-blocking Google Fonts`
3. `perf(metrika): defer tag.js via requestIdleCallback`
4. `perf(build): lazy load landing sections + manualChunks`
5. `perf(build): drop console/debugger in prod`

Каждый коммит самодостаточен — можно откатить любой независимо.
