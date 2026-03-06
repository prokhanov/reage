

## Проблема

Два бага в `splitTextByBiomarkers`:

1. **Дублирование имени**: `chunk.content` содержит весь текст секции начиная с `**Калий (K)**`, но карточка уже показывает название. Заголовок не вырезается из текста.

2. **Точка-буллет**: `sectionText` берётся от `matchStart` (= `match.index`), а `match.index` указывает на начало `- **Калий (K)**` (включая маркер списка). Хотя regex захватывает `- `, текст секции всё равно начинается с маркера.

## Решение

**Файл:** `src/pages/admin/ReportVisualsTest.tsx`, функция `splitTextByBiomarkers` + рендеринг (строки 54-74 и 367-368).

### Изменение 1: Вырезать заголовок из контента биомаркера (строки 66-74)

После вычисления `sectionText`, удалить из него заголовок `**Название (КОД)**:` и ведущий маркер списка, чтобы остался только описательный текст:

```tsx
// Extract code from the header
const codeMatch = match[1].match(/\(([A-Za-z0-9\-\/+]+)\)/);
const code = codeMatch ? codeMatch[1] : undefined;

// Remove the header (and optional list marker) from the section text
// match[0] = full match including list marker, match[1] = just the **Name (CODE)** part
const headerEnd = matchStart + match[0].length;
const contentAfterHeader = text.slice(headerEnd, sectionEnd).trim();

parts.push({ type: "biomarker", content: contentAfterHeader, code });
```

Это решает обе проблемы: маркер списка и заголовок убираются из контента, остаётся только описательный текст после `**Калий (K)**`.

