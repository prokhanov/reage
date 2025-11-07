-- Drop existing constraint
ALTER TABLE public.recommendations 
DROP CONSTRAINT IF EXISTS recommendations_type_check;

-- Add new constraint with "Данные пациента" included
ALTER TABLE public.recommendations 
ADD CONSTRAINT recommendations_type_check 
CHECK (type = ANY (ARRAY[
  'Данные пациента'::text,
  'Общее резюме'::text,
  'Полный отчет'::text,
  'Липиды'::text,
  'Гормоны'::text,
  'Метаболизм'::text,
  'Старение'::text,
  'Воспаление'::text,
  'Иммунитет'::text,
  'Витамины'::text,
  'Микроэлементы'::text,
  'Антиоксиданты'::text
]));