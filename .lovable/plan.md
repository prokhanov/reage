# Ускорение мобильного лендинга (FCP/LCP 5.8s → цель ~1.5–2.5s)

## Диагноз по метрикам
TTFB 0.8s — норм. FCP = LCP = 5.8s — критично. Одинаковые FCP и LCP = браузер вообще не рисует первый пиксель до ~5.8с. Причина всегда одна: **render-blocking ресурсы в `<head>` + тяжёлый парс JS** — даже инлайновый boot-loader не может отрисоваться, пока браузер грузит блокирующий CSS.

## Что чиню (по убыванию эффекта)

### 1. Render-blocking шрифты (главная причина)
`src/main.tsx` синхронно импортирует 3 fontsource-пакета (Inter variable, Fraunces variable, JetBrains Mono 500). Они попадают в главный CSS-бандл, который блокирует рендер. На 4G это +2–3с к FCP.

Что делаю:
- Убираю fontsource-импорты из `main.tsx` (нужны только для PDF-рендера отчёта).
- Переношу их в модули отчёта (`reportFonts.ts` / `PagedReportPreview.tsx`), где они и так подгружаются перед render'ом PDF.
- На лендинге и в UI использую системный стек (уже есть в tailwind) с `font-display: swap`.

Ожидаемый эффект: −2000…3000 мс FCP/LCP.

### 2. Синхронные пиксели в `<head>` блокируют парсер
Yandex Metrika, Top.Mail.Ru и Telegram Pixel сейчас в `<head>` без `defer` и с внешним `<script src=…>` который они инжектят синхронно. Каждый добавляет DNS+TCP+TLS+исполнение до FCP.

Что делаю:
- Оборачиваю инициализацию Яндекс.Метрики и Top.Mail.Ru в `requestIdleCallback` / `load` (как уже сделано для Jivo).
- Оставляю `_tmr.push({pageView})` и `ym('init')` — они очередятся до реальной загрузки скрипта, счёт не теряется.
- `<noscript>` пиксели-фолбэки не трогаю (они в `<body>`).

Ожидаемый эффект: −300…800 мс FCP на 4G.

### 3. Preload LCP-картинки
Hero использует `SmartPicture` с `fetchpriority="high"`, но браузер узнаёт про неё только после парса React-бандла (~5с). За это время картинку никто не грузит.

Что делаю:
- Добавляю в `index.html` `<link rel="preload" as="image" href="/assets/…hero-couple-v9-avif" imagesrcset=… type="image/avif" fetchpriority="high" media="(max-width: 768px)">` — только для мобилы, по хэш-имени из билда.
- Для десктопного варианта — отдельный preload. Хэши подставляются через плагин (или помечаю as-is при билде).
- Проверяю, что `SmartPicture` отдаёт `width`/`height` для избежания CLS.

Ожидаемый эффект: LCP на мобиле −1500…2500 мс.

### 4. Проверка веса главного бандла
После прошлого сплита теоретически ~1.5–2 МБ. Проверяю:
- Запускаю `bun run build` и смотрю размеры `dist/assets/*.js`.
- Если главный `index-*.js` >400 КБ gzip — ищу тяжёлые статические импорты (framer-motion / recharts / react-markdown, попавшие в лендинг через компоненты).
- При необходимости — доп. lazy для секций, которые тянут тяжёлые либы.

Ожидаемый эффект: −500…1500 мс TBT/LCP на слабых Android.

### 5. Микрофиксы
- `initActiveTimeTracker()` в `Index.tsx` перенести из `useEffect` → `requestIdleCallback` (сейчас стартует сразу после mount).
- Убрать `JivoVisibility` из глобального дерева при первом рендере / lazy'фицировать.
- Проверить, нет ли sync `fetch` в `main.tsx` или `App.tsx` до первого рендера.

## Технические детали

- Файлы под правку: `src/main.tsx`, `src/pages/Index.tsx`, `index.html`, `src/components/landing/HeroPortrait.tsx`, `src/lib/reportLab/reportFonts.ts` (если fontsource-переезд), `src/components/JivoVisibility.tsx`.
- Билд: `vite.config.ts` — возможно, добавить генерацию preload-тега для LCP через плагин (иначе хардкод пути и апдейт после build).
- Ничего в бизнес-логике не меняю — только загрузка ресурсов.

## Как проверю
1. `bun run build` → смотрю размеры бандлов до/после.
2. Ручной прогон PageSpeed Insights по `reage.life` на мобиле.
3. Проверяю, что PDF-отчёт всё ещё рендерится с правильными шрифтами (Inter/Fraunces/JetBrains) — критично, потому что fontsource переезжает.
4. Проверяю, что Яндекс.Метрика/Top.Mail.Ru/Telegram Pixel по-прежнему фиксируют `pageView` и цели.

## Что НЕ трогаю
- Бэкенд, edge functions, БД.
- Логику отчётов и биомаркеров.
- Дизайн — только загрузку ресурсов.

Оценка суммарного эффекта: FCP/LCP ~5.8s → 1.5–2.5s на мобиле.
