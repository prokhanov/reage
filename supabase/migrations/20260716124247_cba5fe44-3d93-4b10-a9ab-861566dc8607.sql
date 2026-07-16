
CREATE OR REPLACE FUNCTION public.compose_lab_address(p_lab_id uuid, p_fallback text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lab RECORD;
  v_base text;
  v_metro text;
  v_metro_cap text;
BEGIN
  IF p_lab_id IS NULL THEN
    RETURN p_fallback;
  END IF;
  SELECT title, full_address, address_short, metro
    INTO v_lab FROM public.lab_locations WHERE id = p_lab_id;
  IF NOT FOUND THEN
    RETURN p_fallback;
  END IF;

  v_base := COALESCE(NULLIF(v_lab.full_address, ''), NULLIF(v_lab.address_short, ''), NULLIF(v_lab.title, ''), '');
  v_metro := btrim(COALESCE(v_lab.metro, ''));
  IF v_metro = '' OR v_base = '' THEN
    RETURN v_base;
  END IF;
  IF position(lower(v_metro) in lower(v_base)) > 0 THEN
    RETURN v_base;
  END IF;
  v_metro_cap := upper(substring(v_metro from 1 for 1)) || substring(v_metro from 2);
  RETURN 'м. ' || v_metro_cap || ' • ' || v_base;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD; v_address text; v_template_key text; v_should_notify boolean;
BEGIN
  v_should_notify := (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.status = 'waiting_call');
  IF NOT v_should_notify THEN RETURN NEW; END IF;

  v_template_key := CASE NEW.status
    WHEN 'waiting_call'          THEN 'booking_waiting_call'
    WHEN 'scheduled'             THEN 'booking_scheduled'
    WHEN 'application_submitted' THEN 'booking_application_submitted'
    WHEN 'collected'             THEN 'booking_collected'
    WHEN 'report_pending'        THEN 'booking_report_pending'
    WHEN 'report_ready'          THEN 'booking_report_ready'
    ELSE NULL
  END;
  IF v_template_key IS NULL THEN RETURN NEW; END IF;

  SELECT name, first_name, last_name, email, phone INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  v_address := public.compose_lab_address(NEW.lab_location_id, NEW.address);

  PERFORM public.invoke_telegram_notify('booking_status_changed',
    jsonb_build_object(
      'booking_id', NEW.id, 'user_id', NEW.user_id,
      'name', COALESCE(NULLIF(btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)), ''), v_profile.name),
      'email', v_profile.email, 'phone', v_profile.phone,
      'booking_date', NEW.booking_date, 'booking_time', NEW.booking_time,
      'address', v_address, 'status', NEW.status, 'location_type', NEW.location_type,
      'template_key', v_template_key,
      'request_number', NEW.labquest_request_number
    )
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD; v_address text; v_template_key text;
BEGIN
  SELECT name, first_name, last_name, email, phone
    INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  v_address := public.compose_lab_address(NEW.lab_location_id, NEW.address);

  v_template_key := CASE NEW.status
    WHEN 'waiting_call'          THEN 'booking_waiting_call'
    WHEN 'application_submitted' THEN 'booking_application_submitted'
    ELSE NULL
  END;

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
      'template_key', v_template_key,
      'request_number', NEW.labquest_request_number
    )
  );
  RETURN NEW;
END;
$function$;
