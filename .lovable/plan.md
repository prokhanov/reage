
# План: Исправление подстановки биомаркеров в промпты

## Проблема

AI не видит результаты анализов при генерации отчёта. Вместо реального анализа AI пишет:
> "Пожалуйста, предоставьте список биомаркеров, чтобы я мог начать анализ"

### Причина

**Несоответствие плейсхолдеров** между промптами в БД и кодом edge function:

| Где | Плейсхолдер |
|-----|-------------|
| Промпты в `ai_prompt_settings` | `{biomarkers}` |
| Код `analyze-biomarkers/index.ts` | `{biomarkersText}` |

Edge function пытается заменить `{biomarkersText}`, но в промптах из БД используется `{biomarkers}` — замена не происходит!

### Текущий код (строки 524-529):

```typescript
const categoryPrompt = userPromptTemplate
  .replace(/{userContext}/g, userContext)
  .replace(/{category}/g, category)
  .replace(/{biomarkersText}/g, biomarkersText)  // ❌ Ищет {biomarkersText}
  .replace(/{trends}/g, getCategoryTrends(category))
  .replace(/{recommendations}/g, getCategoryRecommendations(category));
```

### Промпт из БД:

```
Проанализируйте следующие биомаркеры категории "Энергия и восстановление":

{biomarkers}   ← ❌ Не заменяется!

Для каждого отклонения от нормы...
```

---

## Решение

Добавить дополнительную замену `{biomarkers}` в edge function.

### Изменение в `supabase/functions/analyze-biomarkers/index.ts`:

**Строки 524-529 — добавить замену `{biomarkers}`:**

```typescript
const categoryPrompt = userPromptTemplate
  .replace(/{userContext}/g, userContext)
  .replace(/{category}/g, category)
  .replace(/{biomarkersText}/g, biomarkersText)
  .replace(/{biomarkers}/g, biomarkersText)  // ← ДОБАВИТЬ ЭТУ СТРОКУ
  .replace(/{trends}/g, getCategoryTrends(category))
  .replace(/{recommendations}/g, getCategoryRecommendations(category));
```

---

## Почему так, а не редактировать промпты в БД?

1. **Обратная совместимость** — поддержка обоих плейсхолдеров `{biomarkers}` и `{biomarkersText}`
2. **Гибкость** — админы могут использовать любой из вариантов
3. **Минимальное изменение** — одна строка кода

---

## Шаги реализации

1. Добавить `.replace(/{biomarkers}/g, biomarkersText)` в edge function
2. Задеплоить функцию
3. Перегенерировать отчёт для Алексея Тестова
4. Убедиться, что AI теперь видит данные биомаркеров

---

## Техническая информация

| Элемент | Значение |
|---------|----------|
| Файл | `supabase/functions/analyze-biomarkers/index.ts` |
| Строки | 524-529 |
| Изменение | Добавить 1 строку с заменой `{biomarkers}` |
