
UPDATE public.analysis_bookings SET status='collected' WHERE status='received';
UPDATE public.analysis_bookings SET status='report_ready' WHERE status='uploaded';

CREATE OR REPLACE FUNCTION public.disable_demo_mode_on_booking_uploaded()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'report_ready' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.profiles SET demo_mode_enabled = false
    WHERE id = NEW.user_id AND demo_mode_enabled = true;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_telegram_booking_status_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD; v_lab RECORD; v_address text; v_template_key text; v_should_notify boolean;
BEGIN
  v_should_notify := (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.status = 'waiting_call');
  IF NOT v_should_notify THEN RETURN NEW; END IF;

  v_template_key := CASE NEW.status
    WHEN 'waiting_call'   THEN 'booking_waiting_call'
    WHEN 'scheduled'      THEN 'booking_scheduled'
    WHEN 'collected'      THEN 'booking_collected'
    WHEN 'report_pending' THEN 'booking_report_pending'
    WHEN 'report_ready'   THEN 'booking_report_ready'
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
      'template_key', v_template_key
    )
  );
  RETURN NEW;
END;
$function$;

DELETE FROM public.email_templates WHERE template_type='booking_received';
UPDATE public.email_templates SET template_type='booking_report_ready' WHERE template_type='booking_uploaded';
UPDATE public.email_templates
SET subject='Анализ в работе', heading='Анализ в работе',
    body_text='{patient_name}, ваш биоматериал передан в лабораторию — анализ в работе.

Как только результаты поступят, мы приступим к формированию персонального отчёта и сообщим вам.'
WHERE template_type='booking_collected';

INSERT INTO public.email_templates (template_type, subject, heading, body_text, button_label, footer_text, signature_text)
SELECT 'booking_report_pending','Отчёт в работе','Формируем ваш персональный отчёт',
       '{patient_name}, результаты поступили из лаборатории — мы приступили к формированию вашего персонального отчёта ReAge.

Обычно подготовка занимает 1–2 рабочих дня. Как только отчёт будет готов, вы получите уведомление и сможете открыть его в личном кабинете.',
       button_label, footer_text, signature_text
FROM public.email_templates WHERE template_type='booking_report_ready'
ON CONFLICT DO NOTHING;

DELETE FROM public.sms_templates WHERE type='booking_received';
UPDATE public.sms_templates SET type='booking_report_ready', name='booking_report_ready' WHERE type='booking_uploaded';
UPDATE public.sms_templates
SET body_text='ReAge: биоматериал передан в лабораторию — анализ в работе. Сообщим, когда результаты поступят.'
WHERE type='booking_collected';

INSERT INTO public.sms_templates (name, type, body_text, is_active)
VALUES ('booking_report_pending','booking_report_pending',
        'ReAge: результаты получены, формируем ваш персональный отчёт. Обычно 1–2 рабочих дня.', true)
ON CONFLICT DO NOTHING;
