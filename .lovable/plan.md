

## Проблема

В biomarker-блоке `content` начинается с `• **Название (CODE)** — описание...` или `**Название (CODE)**\nописание...`. Карточка уже показывает название — получается дубль.

## Решение

В `anchorParser.ts`, строка 94-95: после извлечения `content` для biomarker-блока, strip первую строку/буллет, содержащую код маркера.

```typescript
// После строки 94:
const content = processedText.slice(tagEnd, endPos.start).trim();

// Добавить очистку:
const cleanedContent = stripLeadingBiomarkerName(content, data);
blocks.push({ type: 'biomarker', code: data, content: cleanedContent });
```

Новая функция `stripLeadingBiomarkerName(content, code)`:
- Регекс: `^[\s•\-*]*\*{0,2}[^(\n]*\(CODE\)\*{0,2}\s*[—–\-:]?\s*` — удаляет первую строку вида `• **Аспартатаминотрансфераза (AST)** —` или `**AST**`
- Если после удаления остался пустой текст — вернуть оригинал (защита)

Одна функция + одна строка замены в `anchorParser.ts`.

