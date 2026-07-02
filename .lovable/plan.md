## Что делаем

Кнопка **«Редактировать»** в шапке превью отчёта. По клику текстовые блоки становятся editable rich-text полями с плавающей панелью форматирования (**B**, *I*, • список, 1. список, H2, H3). «Сохранить» пишет изменения в `recommendations.text` в БД — правки сразу видны всем и попадают в PDF. «Отмена» откатывает.

Доступ: только `admin`, `superadmin`, `doctor` (проверка через `has_role`).

## Что редактируется

- Prose-блоки категорий (тексты между биомаркерами).
- Prose-блоки «Общее резюме», «Данные пациента», «Назначения» (текстовая часть).
- Комментарии к биомаркерам (текст под карточкой биомаркера).

Не редактируется: обложка, значения/статусы биомаркеров, метрики.

## Форматирование

Стандартная панель Tiptap StarterKit:
- Bold, Italic
- Bullet list, Ordered list
- H2, H3, обычный параграф

Всё остальное (заголовки H1, ссылки, изображения, таблицы) отключено, чтобы не ломать вёрстку PDF.

## Как сохраняется

`recommendations.text` хранит markdown-подобный текст с якорями `<!-- anchor:biomarker CODE -->…<!-- anchor:biomarker_end -->`. Поэтому:

1. Каждый редактируемый блок помечаем `data-block-id` (индекс prose-блока или код биомаркера).
2. При «Сохранить» проходим по блокам категории/раздела в исходном порядке, конвертируем HTML → markdown (Bold → `**…**`, list → `- …`, H2 → `##`, H3 → `###`), склеиваем обратно с сохранением якорей и заголовка категории.
3. UPDATE в `recommendations.text` через существующий Supabase-клиент (RLS уже разрешает admin/doctor UPDATE — при необходимости добавим политику).
4. После UPDATE перечитываем `report` и перерисовываем превью.

Для «Назначения» content_json остаётся неизменным на этом этапе (правится только текст-обёртка, если он есть; структурированный JSON не трогаем в MVP).

## Технически

Новые файлы:
- `src/lib/reportLab/editor/EditableProse.tsx` — Tiptap-обёртка на один блок. Пропсы: `initialMarkdown`, `onChange(markdown)`.
- `src/lib/reportLab/editor/htmlToMarkdown.ts` — минимальный сериализатор (p, strong, em, ul, ol, li, h2, h3).
- `src/lib/reportLab/editor/markdownToHtml.ts` — используем существующий `ProseMarkdown` парсер, вынесем HTML-строку.
- `src/lib/reportLab/editor/useReportEditor.ts` — хранит `mode: 'view' | 'edit'`, локальный черновик по recommendation.id, `save()`/`cancel()`.
- `src/lib/reportLab/editor/EditToolbar.tsx` — floating toolbar над выделением.
- `src/lib/reportLab/editor/ReportEditorShell.tsx` — обёртка над `PagedReportPreview` / `PaginatedReportPreview` с кнопками «Редактировать / Сохранить / Отмена» и передачей контекста.

Правки в существующие файлы:
- `src/lib/reportLab/renderer/ProseMarkdown.tsx` — принимает опциональный `editableId`, в режиме edit рендерит `<EditableProse>`.
- `src/lib/reportLab/renderer/BiomarkerCard.tsx` — commentary через тот же путь.
- `src/lib/reportLab/renderer/ReportSection.tsx` / `ReportOverview` / `ReportPatientData` / `ReportPrescriptions` — прокидывают `editableId` вида `rec:<id>#block:<n>` или `rec:<id>#bio:<code>`.
- `src/pages/internal/ReportPreview.tsx` и `src/pages/admin/ReportVisualsTest.tsx` — оборачивают превью в `ReportEditorShell` и показывают кнопку правки только если у пользователя роль admin/doctor.

Пакеты: `@tiptap/react @tiptap/starter-kit @tiptap/pm`.

## Взаимодействие с paged.js

Paged.js клонирует DOM в свои страницы, поэтому редактирование в paged-режиме невозможно без потери постраничной вёрстки. Решение:
- В режиме `edit` временно скрываем paged-превью и показываем **сплошной** непагинированный рендер (`ReportDocument` без paged-обёртки) — те же стили, но одним потоком. Так пользователь спокойно правит, а после «Сохранить» возвращаемся к paged.
- Это единственный практичный путь, иначе редактор конфликтует с CSS-пагинатором.

## Проверка

1. Ролевой доступ: не-admin/doctor не видит кнопку «Редактировать».
2. Правка prose в категории: сохранение, перезагрузка страницы → текст новый, порядок блоков и биомаркеров сохранён.
3. Правка commentary у биомаркера: карточка обновилась, якоря на месте (проверить `recommendations.text` селектом).
4. Заголовки H2/H3 через тулбар → в PDF рендерятся как заголовки (это заодно решает жалобу про «Общее резюме / Сильные стороны / Интерпретация биомаркеров» без правки промпта).
5. PDF-рендер после сохранения содержит те же изменения.

## Что вне scope MVP

- История версий/undo между сессиями.
- Редактирование содержимого биомаркеров (числа, единицы).
- Редактирование структурированных назначений (`content_json.lifestyle` / `follow_ups`) — оставим на следующий шаг.
- Совместное редактирование в реальном времени.
