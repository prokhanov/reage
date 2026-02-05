
# План: Исправление оставшихся артефактов в отчётах

## Диагностика проблем

На основе анализа оригинальных данных AI в базе найдены следующие артефакты:

| Проблема | Пример в базе | Место отображения |
|----------|---------------|-------------------|
| Horizontal rule с пробелами | `* * *` (строки 321, 330) | Предпросмотр и редактор |
| Точка перед секцией | Перед "Энергия", "Меры коррекции" | Редактор (ReactQuill) |
| Trailing emphasis | `.*` в конце абзацев | Предпросмотр |
| Экранированные номера | `**1\.`, `**2\.` | PDF экспорт |

## Изменения

### 1. Файл: `src/lib/markdown.ts`

**Улучшение функции `cleanMarkdownArtifacts`:**

- Добавить обработку `* * *` с пробелами (сейчас regex ловит только `***` без пробелов)
- Добавить очистку экранированных точек в номерах (`1\.` → `1.`)
- Улучшить regex для trailing emphasis (`.*` → `.`)

```typescript
// Добавить в начало функции:
// Normalize horizontal rules with spaces (* * *, - - -)
if (/^[\*\-_](\s+[\*\-_]){2,}$/.test(trimmed)) {
  cleanedLines.push('');
  continue;
}

// Добавить после обработки строк:
// Fix escaped periods in numbered lists (1\. → 1.)
result = result.replace(/(\d+)\\\.(?=\s)/g, '$1.');

// Fix trailing emphasis before period (text*. → text.)
result = result.replace(/\*\.(?=\s|$)/g, '.');
```

### 2. Файл: `src/components/admin/EditReportDialog.tsx`

**Добавить очистку markdown перед конвертацией в HTML:**

```typescript
import { cleanMarkdownArtifacts } from "@/lib/markdown";

// В loadRecommendations():
const sectionsWithHtml = (data || []).map(section => ({
  ...section,
  originalMarkdown: section.text,
  text: marked.parse(cleanMarkdownArtifacts(section.text)) as string
}));
```

### 3. Файл: `src/pages/Recommendations.tsx`

**Улучшить `parseMarkdownToPdfMake`:**

Добавить очистку экранированных точек в номерах для PDF:

```typescript
// В функции cleanMarkdownEscapes добавить:
.replace(/(\d+)\\\.(?=\s)/g, '$1.')  // 1\. → 1.
```

## Причина проблемы "точка перед секцией"

В базе данные AI генерирует структуру:

```markdown
*   **Меры коррекции**:
*   **Образ жизни**: ...
```

Это некорректный markdown — после `*   ` идёт жирный заголовок вместо текста пункта. Когда `marked` парсит это, он создаёт `<li>` элемент, который отображает точку.

Исправление: добавить в `cleanMarkdownArtifacts` логику для удаления начальных `*   ` перед жирным заголовком подраздела.

## Результат

После изменений:
- `* * *` → удаляется (пустая строка)
- `**1\.` → `**1.` (без экранирования)
- `text.*` → `text.` (без trailing asterisk)
- Точка перед заголовками секций → исчезнет
