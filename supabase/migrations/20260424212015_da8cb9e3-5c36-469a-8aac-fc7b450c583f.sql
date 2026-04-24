-- Разрешаем тип 'snapshot' в recommendations + service-типы.
-- Старые типы (категории) остаются разрешены ради обратной совместимости со старыми отчётами.
CREATE OR REPLACE FUNCTION public.validate_recommendation_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_types TEXT[];
BEGIN
  -- Новый канонический тип + служебные (legacy) + категории биомаркеров.
  SELECT ARRAY['snapshot', 'Данные пациента', 'Общее резюме']
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

-- Удобный индекс для быстрой выборки одной записи snapshot на анализ.
CREATE INDEX IF NOT EXISTS idx_recommendations_analysis_type
  ON public.recommendations (analysis_id, type);