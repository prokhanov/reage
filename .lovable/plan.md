## Проблема
Отчёт всегда парсится и пагинируется одинаково (Paged.js гоняет один и тот же HTML с `@page A4` и media-queries на ширину нет). Но на моб/планшете к `.pagedjs_pages` применяется CSS `zoom: var(--rl-fit-zoom, 1)`. `zoom` — legacy-свойство: в Chromium оно тянет пересчёт layout детей, комбинируется с `.pagedjs_page { overflow: hidden }` и в ряде случаев режет визуально содержимое (последний биомаркер на странице «пропадает»). Также ResizeObserver, живущий в узком контейнере, может стартовать после первой пагинации и приводить к визуальному сдвигу.

По ощущению это выглядит как «отчёт другой на мобиле», хотя фактически парсинг идентичный.

## Что делаем
Убираем адаптивную «zoom-подгонку» и делаем превью строго как PDF-viewer: одинаковый DOM, одинаковая раскладка, отличается только визуальный масштаб через `transform: scale()`, который не влияет на layout и не режет содержимое.

### 1. `src/lib/reportLab/renderer/PagedReportPreview.tsx`
- Убрать использование CSS `zoom` в `pagedCss` (правило `.rl-paged-shell-framed .pagedjs_pages { zoom: var(--rl-fit-zoom, 1); }`).
- Заменить fit-to-width через `zoom` на CSS `transform: scale(var(--rl-fit-zoom, 1))` с `transform-origin: top left`. Обернуть `.pagedjs_pages` в контейнер, у которого:
  - `width: calc(210mm * var(--rl-fit-zoom, 1))` (визуальная ширина после скейла);
  - `height: auto` (наследуется от scaled child через `min-height`, или считаем через ResizeObserver и выставляем через CSS-переменную `--rl-fit-visual-h`).
- Логика вычисления `--rl-fit-zoom` остаётся: `min(1, availableWidth / 794)`. Убрать состояние `narrow`; вертикальный скролл всегда управляется одним и тем же родителем.
- Убрать переключение `height: auto / maxHeight: none / overflow: visible` в JSX — всегда используем ту же геометрию, что и на десктопе (`overflow: auto`, `height` из пропса). Юзер может пинч-зумить браузером как в PDF-viewer.

### 2. Проверка отсутствия других адаптивных развилок
- `chrome === "framed"` — оставляем как есть (это визуальная рамка «Google Docs», а не адаптация под устройство).
- В `theme.css` и `pagedCss` больше нет `@media (max/min-width)` — подтверждено грепом.
- Убедиться, что HTML, скармливаемый Paged.js (`html` из `renderToStaticMarkup`), не зависит от viewport (сейчас не зависит — просто перепроверить).

### 3. Sanity-тест визуально
Playwright:
- 1440×900 desktop и 390×844 mobile, один и тот же analysisId в `/internal/report-v2`. Дождаться `__reportReady`, посчитать `document.querySelectorAll('[data-editable-id]').length` и число `.pagedjs_page` — числа должны совпасть.
- Скриншот первой страницы: одинаковое количество биомаркеров, ничего не обрезано снизу.

## Что НЕ трогаем
- Парсер, `buildLabReportFromDb`, `ReportDocument`, `ReportSectionNav`, sticky-панель — они уже работают одинаково для всех устройств.
- PDF-эндпоинт `render-report-pdf` — на серверный рендер эта правка вообще не влияет.
