

## Проблема

Даже если промпт запрещает списки, модель иногда генерирует строки с `- ` или `* `, и `react-markdown` парсит их как `<ul>` с буллетами. Сейчас в `ReportVisualsTest.tsx` контент не проходит через `cleanMarkdownArtifacts()` / `normalizeMarkdown()`. Нужна защита на уровне рендеринга.

## План

### 1. Применить `normalizeMarkdown` в `ReportVisualsTest.tsx`

Обернуть `generatedContent` в `normalizeMarkdown()` перед передачей в `renderInterleavedReport()` — так же, как это делается на боевых страницах.

### 2. Добавить strip-списков в `MarkdownContent.tsx`

Добавить препроцессинг: конвертировать строки начинающиеся с `- ` или `* ` (которые не являются частью вложенного списка) в обычные параграфы — убирать маркер и добавлять пустую строку перед ними. Это гарантирует, что даже если модель вставит список, рендерер покажет параграфы.

Конкретно — в `MarkdownContent.tsx` перед `<ReactMarkdown>`:
```
// Strip top-level list markers → paragraphs
const cleaned = safeContent.replace(/^[-*]\s+/gm, '');
```

### 3. Альтернатива (менее агрессивная)

Вместо глобального strip — переопределить `ul` и `li` компоненты в `MarkdownContent` так, чтобы они рендерились как `<p>` без буллетов. Это сохранит структуру но уберёт точки:
```tsx
ul: ({ children }) => <div className="space-y-2">{children}</div>,
li: ({ children }) => <p className="text-foreground leading-relaxed">{children}</p>,
```

Однако это сломает страницы где списки нужны (Health Assistant, другие отчёты).

### Рекомендация

Вариант 1+2: применить `normalizeMarkdown` + strip маркеров **только в контексте демо-отчёта** (не глобально в `MarkdownContent`). Создать обёртку или передать флаг `stripLists` в `MarkdownContent`.

**Изменения:**
- `src/components/MarkdownContent.tsx` — добавить проп `stripLists?: boolean`, при `true` убирать `- ` / `* ` маркеры
- `src/pages/admin/ReportVisualsTest.tsx` — передавать `stripLists` и пропускать контент через `normalizeMarkdown()`

