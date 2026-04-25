CREATE OR REPLACE FUNCTION public.validate_recommendation_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_types TEXT[];
BEGIN
  -- Legacy multi-section types + biomarker categories + новый раздел «Назначения»
  -- (хранит структурированные питание/образ жизни/доп.обследования в content_json).
  SELECT ARRAY['Данные пациента', 'Общее резюме', 'Назначения']
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