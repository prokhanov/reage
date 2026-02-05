-- 1. Добавить колонку recommendation_id с FK CASCADE
ALTER TABLE prescriptions 
ADD COLUMN recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE;

-- 2. Индекс для быстрого поиска
CREATE INDEX idx_prescriptions_recommendation_id ON prescriptions(recommendation_id);