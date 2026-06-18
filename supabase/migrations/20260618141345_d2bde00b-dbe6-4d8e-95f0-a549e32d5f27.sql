ALTER TABLE public.sms_sender_settings
  ADD COLUMN IF NOT EXISTS api_email text,
  ADD COLUMN IF NOT EXISTS api_key text;