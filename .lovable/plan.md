
# План: Исправить пустые строки в нумерованных списках

## Проблема
AI генерирует нумерованные списки с пустыми строками между пунктами. Текущий рендерер считает пустые строки отдельными пунктами и нумерует их (1., 2., 3., 4...).

На скриншоте видно:
- Пункт 1 — пустой
- Пункт 2 — "Общая оценка здоровья"
- Пункт 3 — пустой
- И так далее

## Решение
Два уровня исправления:

### 1. Фильтрация пустых элементов в рендерере
**Файл:** `src/components/MarkdownContent.tsx`

В кастомном `ol` компоненте фильтровать пустые элементы перед нумерацией:

```typescript
ol: ({ children }) => {
  const items = Children.toArray(children)
    .filter((child) => {
      // Пропускаем пустые элементы
      if (!isValidElement(child)) return false;
      const content = (child.props as any).children;
      // Проверяем есть ли реальный контент
      if (!content) return false;
      if (typeof content === 'string' && !content.trim()) return false;
      return true;
    });
  
  return (
    <ol className="list-none pl-0 mb-4 space-y-3 text-foreground">
      {items.map((child, idx) => {
        const itemContent = isValidElement(child) ? (child.props as any).children : child;
        return (
          <li key={idx} className="flex gap-3 items-start">
            <span className="tabular-nums shrink-0 text-foreground select-text">
              {idx + 1}.
            </span>
            <div className="min-w-0 flex-1 [&_p]:m-0 [&_p]:inline [&_p]:leading-relaxed">
              {itemContent}
            </div>
          </li>
        );
      })}
    </ol>
  );
},
```

### 2. Улучшенная очистка в препроцессоре
**Файл:** `src/lib/markdown.ts`

Усилить склейку разорванных нумерованных списков:

```typescript
// Склеиваем нумерованные маркеры с текстом через любое количество пустых строк
// "1.\n\n\nТекст" → "1. Текст"
preprocessed = preprocessed.replace(/(^|\n)(\d+\.)\s*\n+\s*(?=\S)/g, "$1$2 ");

// Удаляем "голые" нумерованные маркеры без контента
// строки вида "1." "2." "3." без текста после
preprocessed = preprocessed.replace(/^\d+\.\s*$/gm, "");
```

## Результат
- Пустые элементы не отображаются в списках
- Нумерация идёт только по реальным пунктам (1, 2, 3...)
- Разорванные списки склеиваются ещё на этапе препроцессинга
