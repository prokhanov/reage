CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  profile_name text;
  birth_date_value date := DATE '1990-01-01';
  gender_value text := 'other';
  weight_value numeric := NULL;
  height_value numeric := NULL;
  medications_value text[] := ARRAY[]::text[];
  condition_item text;
  condition_parts text[];
  plan_data jsonb := '{}'::jsonb;
  duration_months integer := 12;
  amount_value numeric := 0;
BEGIN
  profile_name := btrim(concat_ws(' ', NULLIF(metadata->>'first_name', ''), NULLIF(metadata->>'last_name', '')));
  IF profile_name = '' THEN
    profile_name := COALESCE(NEW.email, 'Новый пользователь');
  END IF;

  IF metadata->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' THEN
    birth_date_value := (metadata->>'birth_date')::date;
  END IF;

  IF metadata->>'gender' IN ('male', 'female', 'other') THEN
    gender_value := metadata->>'gender';
  END IF;

  IF metadata->>'weight' ~ '^\d+(\.\d+)?$' THEN
    weight_value := (metadata->>'weight')::numeric;
  END IF;

  IF metadata->>'height' ~ '^\d+(\.\d+)?$' THEN
    height_value := (metadata->>'height')::numeric;
  END IF;

  IF jsonb_typeof(metadata->'medications') = 'array' THEN
    SELECT COALESCE(array_agg(value), ARRAY[]::text[])
    INTO medications_value
    FROM jsonb_array_elements_text(metadata->'medications') AS value;
  END IF;

  INSERT INTO public.profiles (
    id,
    name,
    first_name,
    last_name,
    email,
    birth_date,
    gender,
    weight,
    height,
    phone,
    operations,
    medications,
    health_note,
    email_verified
  ) VALUES (
    NEW.id,
    profile_name,
    COALESCE(NULLIF(metadata->>'first_name', ''), profile_name),
    NULLIF(metadata->>'last_name', ''),
    NEW.email,
    birth_date_value,
    gender_value,
    weight_value,
    height_value,
    NULLIF(metadata->>'phone', ''),
    COALESCE(metadata->'operations', '{}'::jsonb),
    medications_value,
    NULLIF(metadata->>'health_note', ''),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    birth_date = EXCLUDED.birth_date,
    gender = EXCLUDED.gender,
    weight = EXCLUDED.weight,
    height = EXCLUDED.height,
    phone = EXCLUDED.phone,
    operations = EXCLUDED.operations,
    medications = EXCLUDED.medications,
    health_note = EXCLUDED.health_note,
    email_verified = EXCLUDED.email_verified,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF weight_value IS NOT NULL THEN
    INSERT INTO public.weight_history (user_id, weight)
    VALUES (NEW.id, weight_value);
  END IF;

  IF jsonb_typeof(metadata->'medical_history') = 'array' THEN
    FOR condition_item IN
      SELECT value FROM jsonb_array_elements_text(metadata->'medical_history') AS value
    LOOP
      condition_parts := string_to_array(condition_item, '|');
      IF array_length(condition_parts, 1) >= 2 THEN
        INSERT INTO public.medical_history (user_id, category, condition)
        VALUES (
          NEW.id,
          condition_parts[1],
          array_to_string(condition_parts[2:array_length(condition_parts, 1)], '|')
        );
      END IF;
    END LOOP;
  END IF;

  IF jsonb_typeof(metadata->'selected_plan') = 'object' THEN
    plan_data := metadata->'selected_plan';
  END IF;

  IF plan_data <> '{}'::jsonb AND COALESCE((plan_data->>'skipPayment')::boolean, false) = false THEN
    IF plan_data->>'durationMonths' ~ '^\d+$' THEN
      duration_months := (plan_data->>'durationMonths')::integer;
    END IF;

    IF plan_data->>'amount' ~ '^\d+(\.\d+)?$' THEN
      amount_value := (plan_data->>'amount')::numeric;
    END IF;

    INSERT INTO public.subscriptions (
      user_id,
      status,
      plan_id,
      pricing_id,
      plan_type,
      amount,
      start_date,
      end_date,
      payment_method
    ) VALUES (
      NEW.id,
      'active',
      NULLIF(plan_data->>'planId', '')::uuid,
      NULLIF(plan_data->>'pricingId', '')::uuid,
      COALESCE(NULLIF(plan_data->>'period', ''), 'annual'),
      amount_value,
      now(),
      now() + make_interval(months => duration_months),
      'card'
    );
  ELSE
    INSERT INTO public.subscriptions (user_id, status, plan_type, amount)
    VALUES (NEW.id, 'pending', 'none', 0);
  END IF;

  RETURN NEW;
END;
$$;