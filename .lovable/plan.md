

## Проблема

Пустые строки игнорируются по двум причинам:
1. **Markdown спецификация** — `react-markdown` (и превью в MDEditor) по стандарту схлопывает несколько пустых строк в один разрыв абзаца
2. **`cleanMarkdownArtifacts`** в `src/lib/markdown.ts` явно заменяет `\n{3,}` на `\n\n` — убивает лишние пустые строки перед рендером и перед PDF-экспортом

## Решение

1. **В `src/lib/markdown.ts`**: убрать или ослабить правило `result.replace(/\n{3,}/g, '\n\n')` — заменить на преобразование множественных пустых строк в специальные разделители `&nbsp;` (невидимые параграфы), которые markdown-рендерер сохранит как реальные отступы.

   Конкретно: каждую «лишнюю» пустую строку (сверх одной) конвертировать в строку с `&nbsp;`, чтобы react-markdown отрендерил её как пустой параграф с высотой.

   ```
   // Вместо: result.replace(/\n{3,}/g, '\n\n')
   // Новое: сохранять дополнительные пустые строки как spacer-параграфы
   result = result.replace(/\n{3,}/g, (match) => {
     const extraLines = match.split('\n').length - 3; // сколько «лишних»
     return '\n\n' + '&nbsp;\n\n'.repeat(extraLines);
   });
   ```

2. **В `parseMarkdownToPdfContent`** (PDF-экспорт в `ReportVisualsTest.tsx`): распознавать строки `&nbsp;` как вертикальный отступ и вставлять spacer-элемент с margin.

### Файлы
- `src/lib/markdown.ts` — строка с `/\n{3,}/g` (~строка 99)
- `src/pages/admin/ReportVisualsTest.tsx` — `parseMarkdownToPdfContent`, обработка строк `&nbsp;`

