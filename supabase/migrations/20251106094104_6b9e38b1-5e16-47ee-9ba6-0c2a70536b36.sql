-- Drop the old constraint that only allowed limited types
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_type_check;

-- Add new constraint that allows all category types plus summary types
ALTER TABLE recommendations ADD CONSTRAINT recommendations_type_check 
CHECK (type IN (
  'Липиды',
  'Гормоны', 
  'Метаболизм',
  'Старение',
  'Воспаление',
  'Иммунитет',
  'Витамины',
  'Микроэлементы',
  'Антиоксиданты',
  'Общее резюме',
  'Полный отчет'
));