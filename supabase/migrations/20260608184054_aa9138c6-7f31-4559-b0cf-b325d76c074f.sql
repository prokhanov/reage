ALTER TABLE public.sms_send_log
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_status text;

CREATE INDEX IF NOT EXISTS sms_send_log_provider_message_id_idx
  ON public.sms_send_log (provider_message_id);