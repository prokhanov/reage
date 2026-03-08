

## Проблема

Когда текст **не содержит якорей** (`<!-- anchor:...`), `parseAnchors` вызывает `legacyFallback`, который через `splitTextByBiomarkers` ищет паттерны вроде `**Name (CODE)**` в обычном тексте и ошибочно вставляет шкалы биомаркеров.

Пользователь хочет: **если якорей нет — текст рендерится как есть, без автодетекта маркеров**.

## Исправление

**`src/lib/anchorParser.ts`** — убрать legacy fallback:

```typescript
// Было:
if (!text.includes('<!-- anchor:')) {
  return legacyFallback(text, biomarkerCodes);
}

// Станет:
if (!text.includes('<!-- anchor:')) {
  return [{ type: 'text', content: text }];
}
```

Удалить функцию `legacyFallback` и импорт `splitTextByBiomarkers`.

`splitTextByBiomarkers` в `pdfExportHelpers.ts` остаётся как экспорт (на случай если используется где-то напрямую), но больше не вызывается из конвейера рендеринга.

