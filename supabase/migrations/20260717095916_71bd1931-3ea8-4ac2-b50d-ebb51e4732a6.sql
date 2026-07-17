UPDATE public.telegram_notification_settings
SET enabled_events = COALESCE(enabled_events, '{}'::jsonb) || '{"callback_requested": true}'::jsonb
WHERE singleton = true;