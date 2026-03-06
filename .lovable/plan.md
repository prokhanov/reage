

## Убрать вложенность описания маркера

Сейчас текст описания биомаркера обёрнут в `<div className="pl-2 border-l-2 border-muted">` (строка 368), что создаёт визуальный отступ с левой полосой. Убираем эту обёртку — текст будет на том же уровне, что и карточка маркера.

### Изменение

**Файл:** `src/pages/admin/ReportVisualsTest.tsx`, строки 368-370

Заменить:
```tsx
<div className="pl-2 border-l-2 border-muted">
  <MarkdownContent content={chunk.content} />
</div>
```

На:
```tsx
<MarkdownContent content={chunk.content} />
```

Одна строка, один файл.

