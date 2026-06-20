-- Add Telegram notification for new callback/booking requests on insert.
-- Adds default template and trigger that notifies on every new analysis_bookings row.

UPDATE public.telegram_notification_settings
SET booking_templates = COALESCE(booking_templates, '{}'::jsonb)
  || jsonb_build_object(
       'booking_waiting_call',
       E'📞 <b>Новая заявка на анализы</b>\n👤 {patient}\n📱 {phone}\n📧 {email}\n📍 {address}\n🏷 Статус: <b>{status}</b>'
     )
WHERE singleton = true
  AND NOT (COALESCE(booking_templates, '{}'::jsonb) ? 'booking_waiting_call');

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_created()
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
BEGIN
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

  v_template_key := CASE WHEN NEW.status = 'waiting_call' THEN 'booking_waiting_call' ELSE NULL END;

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

DROP TRIGGER IF EXISTS trg_notify_telegram_booking_created ON public.analysis_bookings;
CREATE TRIGGER trg_notify_telegram_booking_created
AFTER INSERT ON public.analysis_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_booking_created();