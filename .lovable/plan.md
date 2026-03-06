

## Проблема

В `renderInterleavedReport` (строки 314-319 и 354-358) каждый чанк текста оборачивается в `<div className="prose prose-sm dark:prose-invert">`, а внутри `MarkdownContent` добавляет **ещё один** `prose prose-sm`. Двойная вложенность `prose` в Tailwind Typography ломает рендер — абзацы получают стили списков.

## План

### Убрать внешние `prose`-обёртки в `renderInterleavedReport`

В `src/pages/admin/ReportVisualsTest.tsx`:

1. **Строка 316**: заменить `<div className="prose prose-sm dark:prose-invert max-w-none">` на `<div>` — `MarkdownContent` сам добавит `prose`.

2. **Строка 355**: заменить `<div className="prose prose-sm dark:prose-invert max-w-none pl-2 border-l-2 border-muted">` на `<div className="pl-2 border-l-2 border-muted">` — убрать prose, оставить только стили отступа.

Один файл, две строки.

