# Исправление PDF: пустая страница, колонтитулы, «поля»

## Что на скриншотах на самом деле

### 1. «Поля» (тёмные полосы вокруг листов)
Это **не наш баг** — так iOS Safari отрисовывает фон PDF-вьюера (тёмный чехол вокруг каждого A4-листа). В самом PDF никаких тёмных полей нет: каждая страница — обычный A4 210×297мм. На Mac Preview / Adobe / Chrome фон будет светлым.

Но воспринимается это как «пустое место» ровно потому, что в верхнем/нижнем margin **не видно колонтитулов** — это уже наш баг (см. пункт 3).

### 2. Пустая страница 2 «Общее заключение» — баг вёрстки
Причина найдена в `src/lib/reportLab/theme.css` (строки 131–143):

```css
.rl-prose h2, .rl-prose h3,
.rl-section-header, .rl-callout, .rl-stats,
.rl-h1, .rl-h2, .rl-h3 {
  break-inside: avoid;
  break-after: avoid;
}
```

`break-after: avoid` на `.rl-h1` создаёт «цепочку неразрывности»: заголовок H1 → блок `.rl-stats` (тоже `break-inside: avoid`) → `.rl-callout`. Chromium не может разорвать эту связку и переносит её целиком на следующую страницу. `.rl-eyebrow` («ОБЩЕЕ ЗАКЛЮЧЕНИЕ»), у которого таких правил нет, остаётся сиротой сверху пустой страницы 2.

### 3. Нет колонтитулов
Шаблоны `headerHtml` / `footerHtml` в `deploy/report-renderer/server.js` заданы, но **Chromium их не показывает** — известный подводный камень:
- Chromium масштабирует темплейты и требует размер шрифта в **`px`**, а не `pt` (у нас `font-size: 8pt` → превращается в ~0.5px и становится невидимым).
- `display: flex` внутри темплейта у Chromium ненадёжен — часто игнорируется.
- Отсутствует внешняя обёртка `<div style="width:100%; ...">` с явным `-webkit-print-color-adjust: exact` на цвет текста (не только фон).

## Правки

### A. `src/lib/reportLab/theme.css` — снять избыточное «avoid-after»

- Убрать `break-after: avoid` с `.rl-h1`, `.rl-h2`, `.rl-h3`, `.rl-callout`, `.rl-stats` (оставить только `break-inside: avoid`).
- Оставить `break-after: avoid` только у `.rl-section-header` и подзаголовков `.rl-prose h2/h3` — им это действительно нужно, чтобы заголовок раздела не отрывался от первого абзаца.
- Добавить `break-after: avoid` на `.rl-eyebrow` — чтобы «ОБЩЕЕ ЗАКЛЮЧЕНИЕ» держался вместе со следующим за ним H1.

### B. `deploy/report-renderer/server.js` — починить темплейты колонтитулов

Переписать `headerHtml` / `footerHtml` под требования Chromium:

```html
<!-- header -->
<div style="width:100%; font-family:-apple-system,'Inter',Segoe UI,sans-serif;
            font-size:9px; color:#7a7f8f; letter-spacing:1.2px;
            text-transform:uppercase; padding:0 18mm; box-sizing:border-box;
            -webkit-print-color-adjust:exact; print-color-adjust:exact;">
  <table style="width:100%; border-collapse:collapse;"><tr>
    <td style="text-align:left;">ReAge · Персональный отчёт</td>
    <td style="text-align:right;">reage.life</td>
  </tr></table>
</div>
```

Ключевые отличия:
- `font-size` в `px` (Chromium игнорирует `pt` в темплейтах).
- Раскладка через `<table>`, а не flex.
- `print-color-adjust: exact` на цвет текста.
- `box-sizing: border-box` — чтобы padding не разъезжал по ширине.

Аналогично для футера: слева `Longevity clinic`, справа `<span class="pageNumber"></span> / <span class="totalPages"></span>`.

Дополнительно: у обложки (dark radial gradient) колонтитулы будут смотреться грязно поверх тёмного фона. Логика: **скрывать колонтитулы на обложке**. Chromium умеет это через CSS `@page :first { margin-top: 0; margin-bottom: 0; }` в отдельном стайлшите страницы — но проще спрятать содержимое темплейтов на первой странице через `.pageNumber` фолбэк: если Chromium его не поддерживает, ограничимся тем, что обложка занимает всю печатную высоту (297мм, `padding: 0`, содержимое обложки перекрывает край) — на ней колонтитулы всё равно будут накладываться на тёмный градиент.

Итоговое решение: оставляем колонтитулы на всех страницах, но у **обложки** заведомо перекрываем область под колонтитулами тем же тёмным фоном — обложка уже растянута на все 297мм с `padding: 0`, поэтому визуально колонтитулы «растворятся» в градиенте. Никакого белого зазора не появится.

### C. Проверка

1. Локально пересобрать превью: `/admin/report-visuals` → «Постранично» → визуально убедиться, что страница 2 не пустая, всё резюме на одной странице.
2. Скачать PDF, открыть в Mac Preview / Chrome — убедиться, что:
   - на каждой странице кроме обложки видны шапка (ReAge · Персональный отчёт | reage.life) и футер (Longevity clinic | N/66);
   - пустых страниц нет;
   - фон в PDF светлый (тёмные полосы на iPhone — только чехол Safari, объяснить пользователю).

## Что понадобится задеплоить

- **Клиент** (Publish → Update): изменения в `theme.css` попадут в превью, которое рендерит Playwright.
- **Fly-рендерер** (`deploy/report-renderer/`): пересобрать и задеплоить контейнер, чтобы обновлённые темплейты колонтитулов пошли в PDF.
