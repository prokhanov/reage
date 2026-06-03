
-- sms_sender_settings
CREATE TABLE public.sms_sender_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_sign text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sms_sender_settings TO authenticated;
GRANT ALL ON public.sms_sender_settings TO service_role;
ALTER TABLE public.sms_sender_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins manage sms sender settings"
  ON public.sms_sender_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.sms_sender_settings (sender_sign) VALUES ('');

-- sms_templates
CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL,
  body_text text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT ALL ON public.sms_templates TO service_role;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins manage sms templates"
  ON public.sms_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.sms_templates (name, type, body_text, variables) VALUES
  ('otp', 'otp', 'ReAge: ваш код подтверждения {{code}}. Никому не сообщайте.', '["code"]'::jsonb),
  ('appointment_reminder', 'appointment_reminder', 'ReAge: напоминание о заборе анализов {{date}} в {{time}} по адресу {{address}}.', '["date","time","address"]'::jsonb),
  ('report_ready', 'report_ready', 'ReAge: {{name}}, ваш персональный отчёт готов. Откройте в кабинете: {{url}}', '["name","url"]'::jsonb),
  ('custom', 'custom', '{{message}}', '["message"]'::jsonb);

-- sms_send_log
CREATE TABLE public.sms_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  template_name text NOT NULL,
  recipient_phone text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'smsaero',
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_send_log TO authenticated;
GRANT ALL ON public.sms_send_log TO service_role;
ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read sms send log"
  ON public.sms_send_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Service role manages sms send log"
  ON public.sms_send_log FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX sms_send_log_created_at_idx ON public.sms_send_log (created_at DESC);
CREATE INDEX sms_send_log_message_id_idx ON public.sms_send_log (message_id);
