-- Откат к версии Stage 4 (23 апр)
-- Возвращаем триггер validate_recommendation_type к виду без 'snapshot'
-- и удаляем индекс idx_recommendations_analysis_type, добавленный 24 апр.

CREATE OR REPLACE FUNCTION public.validate_recommendation_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_types TEXT[];
BEGIN
  -- Только legacy-типы (Stage 4 формат) + категории биомаркеров.
  -- Тип 'snapshot' НЕ допускается — мы откатились к многострочной модели.
  SELECT ARRAY['Данные пациента', 'Общее резюме']
         || COALESCE(ARRAY_AGG(name), ARRAY[]::TEXT[])
  INTO allowed_types
  FROM biomarker_categories;

  IF NEW.type = ANY(allowed_types) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid recommendation type: %. Allowed types: %',
                    NEW.type, array_to_string(allowed_types, ', ');
  END IF;
END;
$function$;

DROP INDEX IF EXISTS public.idx_recommendations_analysis_type;