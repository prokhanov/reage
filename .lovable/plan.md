

# План: Прямая привязка назначений к отчёту

## Текущая проблема

```text
Сейчас:
prescriptions.analysis_id → analyses.id

Но назначения генерируются из recommendations!
```

## Решение

Добавить `recommendation_id` в `prescriptions` с FK CASCADE:

```text
prescriptions.recommendation_id → recommendations.id ON DELETE CASCADE
```

## Миграция БД

```sql
-- 1. Добавить колонку recommendation_id
ALTER TABLE prescriptions 
ADD COLUMN recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE;

-- 2. Индекс для быстрого поиска
CREATE INDEX idx_prescriptions_recommendation_id ON prescriptions(recommendation_id);
```

## Изменения в Edge Function

**supabase/functions/analyze-biomarkers/index.ts**:

При сохранении назначений передавать `recommendation_id` вместо/вместе с `analysis_id`:

```typescript
// После сохранения recommendation получаем его id
const { data: recData } = await supabaseClient
  .from("recommendations")
  .insert({ analysis_id, type, text })
  .select("id")
  .single();

// Используем recommendation_id при создании prescriptions
await supabaseClient.from("prescriptions").insert({
  user_id: userId,
  recommendation_id: recData.id,  // ← новая связь
  analysis_id: analysisId,        // можно оставить для обратной совместимости
  prescription: p.prescription,
  ...
});
```

## Логика работы

```text
Удаление отчёта (recommendation):
├─ DELETE FROM recommendations WHERE id = 'xxx'
└─ CASCADE → автоматически удаляются prescriptions с этим recommendation_id
```

## Результат

- Назначения напрямую привязаны к записи отчёта
- При удалении recommendation → назначения удаляются автоматически (CASCADE)
- Чистая архитектура без триггеров
- `analysis_id` в prescriptions можно оставить для удобства запросов или убрать позже

