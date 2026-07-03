# План изменений колонтитулов и обрамления ключевого вывода

## Что делаем

1. **Убираем жёлтую рамку у «Ключевого вывода»** в превью/PDF.
2. **Удаляем «Longevity clinic»** из нижнего колонтитула.
3. **Добавляем название текущего раздела в верхний колонтитул слева** (выбранный вариант), а справа оставляем бренд/сайт.

---

## Детали реализации

### 1. Ключевой вывод — убрать жёлтую рамку

Файл: `src/lib/reportLab/renderer/ReportOverview.tsx`.

- Обёртка `<div className="rl-callout">` вокруг блока «Ключевой вывод» заменяется на `<div className="rl-conclusion">` (или аналогичный нейтральный класс).
- Сохраняем подпись «Ключевой вывод» (`rl-eyebrow`) и текст вывода.

Файл: `src/lib/reportLab/theme.css`.

- Добавляем стиль `.reportlab .rl-conclusion` без жёлтого левого бордера и без серой заливки. Достаточно лёгкого вертикального отступа и, при необходимости, тонкой верхней/нижней разделительной линии `var(--hairline)`.
- Старый `.rl-callout` оставляем без изменений для других карточек, если они используются.

### 2. Удалить «Longevity clinic»

Файл: `src/lib/reportLab/theme.css`.

- В `@bottom-left` убрать текст `content: "Longevity clinic";`, заменить на `content: none;` или полностью удалить правило `@bottom-left`, оставив только нумерацию страниц справа.

Файл: `src/lib/reportLab/renderer/PaginatedReportPreview.tsx`.

- В `#footer-poly .poly-foot` убрать `<span>Longevity clinic</span>`, оставить только блок нумерации `<span class="pagedjs_page_number"></span> / <span class="pagedjs_total_pages"></span>`.

### 3. Название раздела в верхнем колонтитуле

Реализуем через CSS Paged Media `string-set` + `string()`, которое поддерживается paged.js для превью и Chromium для PDF.

#### Шаг 3.1. Отметить источники заголовков

- `src/lib/reportLab/renderer/ReportSection.tsx`: на `<div className="title">{category.title}</div>` добавить атрибут `data-running-header="section"`.
- Дополнительно, чтобы колонтитул не пустовал на страницах без раздела, добавить `data-running-header` на главные заголовки:
  - `ReportOverview.tsx`: заголовок «Обзор биологического состояния».
  - `ReportPatientData.tsx` (если есть заголовок) — установить как «Персональные данные».
  - `ReportPrescriptions.tsx` — установить как «Рекомендации».

#### Шаг 3.2. CSS named string

Файл: `src/lib/reportLab/theme.css`.

```css
[data-running-header] {
  string-set: section-title content(text());
}
```

- Обновить `@page`:
  - `@top-left`: `content: string(section-title, first);` — название раздела/страницы.
  - `@top-right`: оставить `content: "ReAge · reage.life";` или сократить до `content: "reage.life";`.

- Для `@page :first` (обложка) сохранить `content: none;`, чтобы на обложке колонтитулов не было.

#### Шаг 3.3. Превью (paged.js)

Файл: `src/lib/reportLab/renderer/PaginatedReportPreview.tsx`.

- В `#header-poly .poly-head` заменить левый `<span>ReAge · Персональный отчёт</span>` на `<span class="pagedjs-running-header-section"></span>` или использовать `content: string(section-title, first);` в CSS для running-элемента.
- Справа оставить `<span>reage.life</span>`.
- Проверить, что paged.js корректно подхватывает `string-set` из элементов внутри `.reportlab`.

### 4. Проверка

- Запустить `bunx tsgo --noEmit`.
- Открыть `/admin/report-visuals` и пролистать превью:
  - на обложке колонтитулов нет;
  - в верхнем левом колонтитуле отображается название текущего раздела/страницы;
  - внизу слева нет «Longevity clinic»;
  - «Ключевой вывод» не имеет жёлтой рамки и серого фона.

---

## Что НЕ входит в план

- Изменение самого текста «Ключевой вывод».
- Редактирование обложки (она уже была отдельно доработана).
- Добавление логики определения названия раздела из данных — используем уже имеющийся `category.title`.