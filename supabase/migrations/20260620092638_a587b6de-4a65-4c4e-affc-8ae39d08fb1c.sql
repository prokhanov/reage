CREATE OR REPLACE FUNCTION public.notify_telegram_booking_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_lab RECORD;
  v_address text;
  v_template_key text;
  v_should_notify boolean;
BEGIN
  v_should_notify := (NEW.status IS DISTINCT FROM OLD.status)
                  OR (NEW.status = 'waiting_call');

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  v_template_key := CASE NEW.status
    WHEN 'waiting_call' THEN 'booking_waiting_call'
    WHEN 'scheduled'    THEN 'booking_scheduled'
    WHEN 'received'     THEN 'booking_received'
    WHEN 'collected'    THEN 'booking_collected'
    WHEN 'uploaded'     THEN 'booking_uploaded'
    ELSE NULL
  END;

  IF v_template_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name, first_name, last_name, email, phone
    INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  v_address := NEW.address;
  IF NEW.lab_location_id IS NOT NULL THEN
    SELECT title, full_address INTO v_lab FROM public.lab_locations WHERE id = NEW.lab_location_id;
    IF FOUND THEN
      v_address := COALESCE(v_lab.title, '') ||
                   CASE WHEN v_lab.full_address IS NOT NULL AND v_lab.full_address <> ''
                        THEN ', ' || v_lab.full_address ELSE '' END;
    END IF;
  END IF;

  PERFORM public.invoke_telegram_notify(
    'booking_status_changed',
    jsonb_build_object(
      'booking_id', NEW.id,
      'user_id', NEW.user_id,
      'name', COALESCE(NULLIF(btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)), ''), v_profile.name),
      'email', v_profile.email,
      'phone', v_profile.phone,
      'booking_date', NEW.booking_date,
      'booking_time', NEW.booking_time,
      'address', v_address,
      'status', NEW.status,
      'location_type', NEW.location_type,
      'template_key', v_template_key
    )
  );
  RETURN NEW;
END;
$$;