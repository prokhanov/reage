CREATE OR REPLACE FUNCTION public.validate_recommendation_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE allowed_types TEXT[];
BEGIN
  SELECT ARRAY['Данные пациента', 'Общее резюме', 'Назначения', 'Организм в целом']
         || COALESCE(ARRAY_AGG(name), ARRAY[]::TEXT[])
  INTO allowed_types FROM biomarker_categories;
  IF NEW.type = ANY(allowed_types) THEN RETURN NEW;
  ELSE RAISE EXCEPTION 'Invalid recommendation type: %. Allowed types: %', NEW.type, array_to_string(allowed_types, ', ');
  END IF;
END; $$;