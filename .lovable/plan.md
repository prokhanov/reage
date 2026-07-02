# Починка рендера PDF: колонтитулы, разрывы, тёмные поля

## Что не так сейчас

Посмотрел исходники — три независимые проблемы, каждая с чёткой причиной:

### 1. Нет колонтитулов на большинстве страниц
`.rl-header` и `.rl-footer` есть только в `ReportSection.tsx` и они `position: absolute` внутри `.rl-page` (высотой ровно 297mm). Это значит:
- Обложка, «Резюме», «Назначения» — вообще без колонтитулов.
- Секции — колонтитул виден только на **первой** физической странице секции. Если раздел вытекает на 2–3 листа PDF (а у Проханова так), на 2-й и 3-й его нет.

Абсолютное позиционирование в HTML **не умеет** повторяться на каждой печатной странице по определению.

### 2. Некрасивые разрывы
На `.rl-biomarker` и `.rl-rx` стоит `break-inside: avoid`, а на **прозе, заголовках H2/H3, callout'ах и section-header'ах — нет**. Поэтому браузер режет:
- посреди абзаца;
- сразу после заголовка `## Как проблемы связаны между собой` — заголовок остаётся сиротой внизу страницы;
- callout «Общее резюме» — рвётся пополам.

### 3. Тёмные поля
Два источника:
- **Экранный превью-фон** `background: #d9d5cd` протекает в PDF, если правило `@media print` не сработает (Chromium в headless режиме иногда игнорирует medium-hint). Плюс `.reportlab { padding: 40px 0 }` из `@media screen` тоже иногда просачивается.
- **Обложка** — тёмно-синий радиальный градиент почти на весь лист. Это by design для 1-й страницы, но выглядит инородно на фоне остальных светлых.

## План правок

### A. Native-колонтитулы на уровне Playwright (deploy/report-renderer/server.js)

Отказываемся от DOM-колонтитулов. Печатаем через:
```js
await page.pdf({
  format: "A4",
  displayHeaderFooter: true,
  margin: { top: "22mm", bottom: "18mm", left: "0mm", right: "0mm" },
  headerTemplate: `<div style="width:100%;padding:0 20mm;font-family:-apple-system,Inter,sans-serif;font-size:8pt;color:#7a7f8f;letter-spacing:.14em;text-transform:uppercase;display:flex;justify-content:space-between"><span>ReAge · Персональный отчёт</span><span>{PATIENT_LABEL}</span></div>`,
  footerTemplate: `<div style="width:100%;padding:0 20mm;font-family:-apple-system,Inter,sans-serif;font-size:8pt;color:#7a7f8f;letter-spacing:.14em;text-transform:uppercase;display:flex;justify-content:space-between"><span>reage.life</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  printBackground: true,
});
```
- `{PATIENT_LABEL}` подставится из `req.body` (`patientLabel`).
- Убираем `preferCSSPageSize: true` (он конфликтует с `displayHeaderFooter`).
- Колонтитулы репитятся на **каждой** физической странице автоматически и **не рисуются на обложке** — для этого добавим на обложке правило `.rl-cover { --hide-native-header: 1 }` и подменим шаблон на пустой если первая страница, либо (проще) — обложку сгенерим отдельным `pdf.pdf()` без колонтитулов и склеим с помощью `pdf-lib`. Начнём с простого варианта: колонтитулы на всех страницах, включая обложку (там всё равно тёмный фон — 8pt текст на нём почти не виден).

### B. Правильная пагинация (src/lib/reportLab/theme.css)

1. Убрать жёсткий `min-height: 297mm` у `.rl-page` (кроме обложки). Оставить `break-before: page` — контент льётся естественно, пустые «хвосты» пропадают.
2. Добавить правила:
   ```css
   .reportlab .rl-prose p     { orphans: 3; widows: 3; }
   .reportlab .rl-prose h2,
   .reportlab .rl-prose h3,
   .reportlab .rl-section-header,
   .reportlab .rl-callout,
   .reportlab .rl-stats       { break-inside: avoid; page-break-inside: avoid; break-after: avoid; page-break-after: avoid; }
   .reportlab .rl-h1, .reportlab .rl-h2, .reportlab .rl-h3 { break-after: avoid; page-break-after: avoid; }
   ```
   `break-after: avoid` на заголовке = запрет сироты, заголовок «прилипает» к следующему блоку.
3. Убрать `.rl-header`/`.rl-footer` из `.rl-page` секций (в `ReportSection.tsx`) — их роль теперь у Playwright.

### C. Убрать тёмные полосы

1. `@media print` явно обнулить фон и паддинг у корня:
   ```css
   @media print {
     html, body { background: #ffffff !important; }
     .reportlab { background: #ffffff !important; padding: 0 !important; }
     .reportlab .rl-page { background: var(--paper); }
   }
   ```
2. `@page { size: A4; margin: 0 }` → **убрать `margin: 0`**, теперь margins задаёт Playwright (см. пункт A). Без этого браузер обрежет тень/фон в 0.
3. Убедиться, что `.rl-page` больше не имеет `background: var(--paper)` **вне** секций (обложка сохраняет свой тёмный градиент).

### D. Что НЕ трогаю

- Логика edge-функций `render-report-pdf`/`mint-preview-token` — не при чём.
- Данные отчёта, компоненты биомаркеров, парсер — не при чём.
- Шрифты — уже подключены, останутся.

## Что нужно от вас

1. **Задеплоить обновлённый `deploy/report-renderer/server.js`** на Fly (`fly deploy` из папки `deploy/report-renderer/`). Без этого пункт A не применится.
2. Нажать **Publish → Update**, чтобы новые стили `theme.css` уехали на `reage.life`.
3. Открыть `/admin/report-visuals` → «Скачать PDF» и посмотреть новый результат.

Если после этого останется что-то конкретное (например, конкретный разрыв или колонтитул не влезает по ширине) — точечно добьём. Полный редизайн вёрстки сейчас предлагать не буду: сначала чиним технические косяки, потом уже спорим про эстетику.
