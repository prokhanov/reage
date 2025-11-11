-- Добавляем поле emoji в таблицу biomarker_categories
ALTER TABLE biomarker_categories 
ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '📊';