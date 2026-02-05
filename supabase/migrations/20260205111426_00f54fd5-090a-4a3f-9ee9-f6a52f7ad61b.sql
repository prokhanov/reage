-- 1. Создать функцию валидации типов рекомендаций
CREATE OR REPLACE FUNCTION public.validate_recommendation_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed_types TEXT[];
BEGIN
  -- Служебные типы (захардкожены) + все категории из biomarker_categories
  SELECT ARRAY['Данные пациента', 'Общее резюме'] 
         || COALESCE(ARRAY_AGG(name), ARRAY[]::TEXT[])
  INTO allowed_types
  FROM biomarker_categories;
  
  -- Проверяем, что type входит в допустимые
  IF NEW.type = ANY(allowed_types) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid recommendation type: %. Allowed types: %', 
                    NEW.type, array_to_string(allowed_types, ', ');
  END IF;
END;
$$;

-- 2. Удалить старый CHECK constraint
ALTER TABLE recommendations 
DROP CONSTRAINT IF EXISTS recommendations_type_check;

-- 3. Создать триггер для валидации
DROP TRIGGER IF EXISTS check_recommendation_type ON recommendations;

CREATE TRIGGER check_recommendation_type
  BEFORE INSERT OR UPDATE ON recommendations
  FOR EACH ROW
  EXECUTE FUNCTION validate_recommendation_type();