# План: Прямая привязка назначений к отчёту ✅ ВЫПОЛНЕНО

## Что было сделано

### 1. Миграция БД
```sql
ALTER TABLE prescriptions 
ADD COLUMN recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE;

CREATE INDEX idx_prescriptions_recommendation_id ON prescriptions(recommendation_id);
```

### 2. Изменения в Edge Function `analyze-biomarkers`

- При сохранении recommendations теперь получаем их ids через `.select("id, type")`
- Находим id рекомендации "Общее резюме" 
- При создании prescriptions передаём `recommendation_id`

## Результат

- Назначения привязаны к recommendation через `recommendation_id`
- При удалении recommendation → назначения удаляются автоматически (CASCADE)
- `analysis_id` сохранён для обратной совместимости
