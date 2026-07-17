
CREATE OR REPLACE FUNCTION public.notify_telegram_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.invoke_telegram_notify(
    'user_registered',
    jsonb_build_object(
      'user_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'middle_name', NEW.middle_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'gender', NEW.gender,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_telegram_subscription_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_plan_name text;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, middle_name, email, phone INTO v_profile
    FROM public.profiles WHERE id = NEW.user_id;

  SELECT name INTO v_plan_name
    FROM public.subscription_plans WHERE id = NEW.plan_id;

  PERFORM public.invoke_telegram_notify(
    'subscription_paid',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'middle_name', v_profile.middle_name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'plan_name', v_plan_name,
      'plan_type', NEW.plan_type,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'start_date', now(),
      'end_date', NEW.end_date
    )
  );
  RETURN NEW;
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

  SELECT name, first_name, last_name, middle_name, email, phone INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  v_address := public.compose_lab_address(NEW.lab_location_id, NEW.address);

  PERFORM public.invoke_telegram_notify('booking_status_changed',
    jsonb_build_object(
      'booking_id', NEW.id, 'user_id', NEW.user_id,
      'name', COALESCE(NULLIF(btrim(concat_ws(' ', v_profile.last_name, v_profile.first_name, v_profile.middle_name)), ''), v_profile.name),
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'middle_name', v_profile.middle_name,
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
  SELECT name, first_name, last_name, middle_name, email, phone
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
      'name', COALESCE(NULLIF(btrim(concat_ws(' ', v_profile.last_name, v_profile.first_name, v_profile.middle_name)), ''), v_profile.name),
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'middle_name', v_profile.middle_name,
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
