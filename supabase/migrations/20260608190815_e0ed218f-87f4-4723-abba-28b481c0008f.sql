ALTER TABLE public.telegram_notification_settings 
ADD COLUMN IF NOT EXISTS booking_templates jsonb NOT NULL DEFAULT '{}'::jsonb;