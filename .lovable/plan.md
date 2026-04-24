Проверка показала: логика в целом верная, но корень проблемы шире, чем только админский интерфейс.

Что именно происходит
- В админке редактор загружает `recommendations.text`, преобразуя markdown в HTML через `marked.parse(...)`. Если в тексте есть строки с табом или 4+ пробелами перед `Ваш уровень / Ваш показатель / Ваш индекс`, markdown трактует это как code block, поэтому в админке это выглядит как выделенный блок.
- При сохранении админка конвертирует HTML обратно в markdown через `TurndownService` с `codeBlockStyle: 'fenced'`, поэтому такие куски могут снова превращаться в fenced code blocks и давать ```.
- Но клиентский отчёт и PDF для новых отчётов берут основной контент не из `recommendations.text`, а из `recommendations.content_json` (structured snapshot). То есть даже если поправить только админку, проблема может остаться в клиентской части и PDF.
- Я проверил актуальные данные: в последнем `content_json` у biomarker-блоков действительно есть комментарии с индентацией, а в `recommendations.text` есть куски вида `Ваш уровень ...` и сразу после них literal ` ``` `. Это подтверждает, что источник артефактов находится и в сохранённом markdown, и в snapshot.

Вывод
- Да, отображение в админке связано с проблемой.
- Но нет, изменение только отображения в админке не гарантирует исправление клиентского отчёта и PDF.
- Реальный корень: форматирование сохраняется в данных отчёта, а затем используется двумя разными пайплайнами:

```text
AI / markdown
  -> recommendations.text
  -> admin editor (ReactQuill)
  -> save back to markdown

AI / text reports
  -> deterministic snapshot builder
  -> recommendations.content_json
  -> client report + PDF
```

План исправления
1. Нормализовать данные до попадания в редактор админа
- Перед `marked.parse(...)` агрессивно удалять fenced code blocks, табы и 4-space indent именно в медицинском narrative-контенте.
- Отдельно распознавать строки, начинающиеся с `Ваш уровень`, `Ваш показатель`, `Ваш индекс`, и принудительно превращать их в обычные абзацы.

2. Исправить обратное сохранение из админки
- Убрать сохранение code blocks при round-trip через Turndown.
- Добавить кастомные правила Turndown: `pre` и `code` сохранять как обычный текст/абзац, а не как fenced markdown.
- После turndown прогонять текст через единый sanitizer перед записью в БД.

3. Исправить источник истины для клиентского отчёта и PDF
- Очистить `snapshot.blocks[].commentary` при построении `content_json` в `analyze-biomarkers`.
- В детерминированном snapshot builder добавить нормализацию, которая:
  - убирает leading tabs/4 spaces,
  - убирает stray triple backticks,
  - разворачивает pseudo-code блоки в обычный prose,
  - отдельно защищает строки `Ваш уровень / Ваш показатель / Ваш индекс`.

4. Синхронизировать web и PDF рендер
- Использовать один и тот же нормализатор для `MarkdownContent`, `snapshotRenderer` и PDF parser.
- Убедиться, что ни web, ни PDF больше не интерпретируют эти куски как code/pre.

5. Проверить старые и новые отчёты
- Новый отчёт: убедиться, что проблема исчезла на генерации.
- Уже сохранённый отчёт: убедиться, что после открытия/сохранения в админке или после регенерации snapshot артефакты исчезают.
- Отдельно проверить последний biomarker, чтобы не было утечки фона до следующей секции.

Технические изменения
- `src/components/admin/EditReportDialog.tsx`
  - почистить markdown до `marked.parse`
  - заменить round-trip правила Turndown
- `src/components/MarkdownContent.tsx`
  - оставить как последний защитный слой, но не как основное место лечения данных
- `src/lib/markdown.ts`
  - вынести единый sanitizer для prose-only medical text
- `src/lib/snapshotRenderer.tsx`
  - использовать тот же sanitizer для commentary
- `src/lib/pdfExportHelpers.ts`
  - парсить уже нормализованный prose без code semantics
- `supabase/functions/analyze-biomarkers/index.ts`
  - чистить commentary при сборке `content_json`

Критерии готовности
- В админке фрагменты `Ваш уровень / Ваш показатель / Ваш индекс` выглядят как обычные абзацы, без серого выделения и monospace.
- В клиентском отчёте больше нет горизонтального скролла на этих местах.
- В PDF больше не появляются ```.
- Последний biomarker не захватывает текст следующего блока.

Если подтверждаете, следующим сообщением я внесу исправления именно по этому плану: сначала источник данных, потом админский редактор, потом web/PDF рендер, чтобы закрыть проблему целиком.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>