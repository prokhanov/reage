UPDATE public.telegram_notification_settings
SET enabled_events = COALESCE(enabled_events, '{}'::jsonb) || jsonb_build_object('feedback_received', true)
WHERE singleton = true;