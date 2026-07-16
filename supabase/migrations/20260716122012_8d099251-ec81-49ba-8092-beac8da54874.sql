
ALTER TABLE public.analysis_bookings
  ADD COLUMN IF NOT EXISTS labquest_request_number text;

CREATE OR REPLACE FUNCTION public.validate_labquest_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.labquest_request_number IS NOT NULL THEN
    NEW.labquest_request_number := btrim(NEW.labquest_request_number);
    IF NEW.labquest_request_number = '' THEN
      NEW.labquest_request_number := NULL;
    END IF;
  END IF;
  IF NEW.status = 'application_submitted' THEN
    IF NEW.labquest_request_number IS NULL OR length(NEW.labquest_request_number) = 0 THEN
      RAISE EXCEPTION 'labquest_request_number is required for status application_submitted'
        USING ERRCODE = 'check_violation';
    END IF;
    IF length(NEW.labquest_request_number) > 64 THEN
      RAISE EXCEPTION 'labquest_request_number is too long (max 64 chars)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_labquest_request_number_trg ON public.analysis_bookings;
CREATE TRIGGER validate_labquest_request_number_trg
BEFORE INSERT OR UPDATE ON public.analysis_bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_labquest_request_number();

DROP INDEX IF EXISTS public.analysis_bookings_one_active_per_user;
CREATE UNIQUE INDEX analysis_bookings_one_active_per_user
  ON public.analysis_bookings (user_id)
  WHERE status = ANY (ARRAY[
    'scheduled'::text,
    'application_submitted'::text,
    'received'::text,
    'waiting_call'::text,
    'no_answer'::text
  ]);

INSERT INTO public.sms_templates (name, type, body_text)
VALUES (
  'booking_application_submitted',
  'booking_application_submitted',
  'ReAge: запись на анализы подтверждена. По прибытии сообщите администратору ЛабКвест: «Номер заявки {{request_number}}, от партнёра ООО «РеЭйдж»».'
)
ON CONFLICT (name) DO UPDATE SET body_text = EXCLUDED.body_text;

INSERT INTO public.email_templates (
  template_type, subject, heading, body_text, button_label, footer_text
)
VALUES (
  'booking_application_submitted',
  'Ваша запись на анализы подтверждена',
  'Запись на анализы подтверждена',
  E'Здравствуйте, {patient_name}!\n\nВаша запись на забор биоматериала подтверждена: {appointment_date} в {appointment_time}, {clinic_address}.\n\nПо прибытии в лабораторию сообщите администратору ЛабКвест:\n\n«Номер заявки {request_number}, от партнёра ООО «РеЭйдж»».\n\nЭто нужно, чтобы анализы были оформлены на нашего партнёра и результаты попали к вам в личный кабинет.',
  'Открыть личный кабинет',
  'Если у вас есть вопросы — напишите нам в ответ на это письмо.'
)
ON CONFLICT (template_type) DO UPDATE SET
  subject = EXCLUDED.subject,
  heading = EXCLUDED.heading,
  body_text = EXCLUDED.body_text,
  button_label = EXCLUDED.button_label,
  footer_text = EXCLUDED.footer_text;

UPDATE public.telegram_notification_settings
SET booking_templates = booking_templates || jsonb_build_object(
  'booking_application_submitted',
  E'✅ <b>Заявка ЛабКвест оформлена</b>\n👤 {patient}\n📱 {phone}\n🗓 {date} {time}\n📍 {address}\n🔖 Номер заявки: <b>{request_number}</b>'
)
WHERE singleton = true;

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD; v_lab RECORD; v_address text; v_template_key text; v_should_notify boolean;
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
  v_address := NEW.address;
  IF NEW.lab_location_id IS NOT NULL THEN
    SELECT title, full_address INTO v_lab FROM public.lab_locations WHERE id = NEW.lab_location_id;
    IF FOUND THEN
      v_address := COALESCE(v_lab.title, '') ||
        CASE WHEN v_lab.full_address IS NOT NULL AND v_lab.full_address <> '' THEN ', ' || v_lab.full_address ELSE '' END;
    END IF;
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$$;
