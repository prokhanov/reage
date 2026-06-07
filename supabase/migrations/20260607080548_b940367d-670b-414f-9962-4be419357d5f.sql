
-- 1. Three new email templates for confirmation reminders
INSERT INTO public.email_templates (template_type, subject, heading, body_text, button_label, footer_text)
VALUES
  ('confirm_reminder_email',
   'Подтвердите ваш email в ReAge',
   'Остался один шаг',
   E'Здравствуйте!\n\nМы заметили, что ваш email пока не подтверждён. Это нужно, чтобы вы могли получать результаты анализов и важные уведомления.\n\nПодтвердите адрес, перейдя по ссылке ниже.',
   'Подтвердить email',
   'Если вы не регистрировались в ReAge — просто проигнорируйте это письмо.'),
  ('confirm_reminder_phone',
   'Подтвердите номер телефона в ReAge',
   'Подтвердите номер телефона',
   E'Здравствуйте!\n\nВаш номер телефона ещё не подтверждён. Это нужно для безопасного входа и быстрых уведомлений.\n\nЗайдите в личный кабинет и завершите подтверждение.',
   'Перейти в кабинет',
   'Если вы не регистрировались в ReAge — просто проигнорируйте это письмо.'),
  ('confirm_reminder_both',
   'Завершите регистрацию в ReAge',
   'Завершите регистрацию',
   E'Здравствуйте!\n\nУ вас остались неподтверждённые контакты: email и номер телефона. Подтвердите их, чтобы пользоваться всеми возможностями ReAge.',
   'Завершить регистрацию',
   'Если вы не регистрировались в ReAge — просто проигнорируйте это письмо.')
ON CONFLICT (template_type) DO NOTHING;

-- 2. Settings table (3 rows, one per reminder type)
CREATE TABLE IF NOT EXISTS public.confirmation_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL UNIQUE
    CHECK (reminder_type IN ('confirm_reminder_email','confirm_reminder_phone','confirm_reminder_both')),
  enabled boolean NOT NULL DEFAULT true,
  first_delay_hours integer NOT NULL DEFAULT 24 CHECK (first_delay_hours >= 0),
  frequency_hours integer NOT NULL DEFAULT 72 CHECK (frequency_hours >= 1),
  max_reminders integer NOT NULL DEFAULT 3 CHECK (max_reminders >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.confirmation_reminder_settings TO authenticated;
GRANT ALL ON public.confirmation_reminder_settings TO service_role;

ALTER TABLE public.confirmation_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage reminder settings"
  ON public.confirmation_reminder_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.confirmation_reminder_settings (reminder_type, enabled, first_delay_hours, frequency_hours, max_reminders)
VALUES
  ('confirm_reminder_email', true, 24, 72, 3),
  ('confirm_reminder_phone', true, 24, 72, 3),
  ('confirm_reminder_both',  true, 24, 72, 3)
ON CONFLICT (reminder_type) DO NOTHING;

-- 3. Log table
CREATE TABLE IF NOT EXISTS public.confirmation_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_type text NOT NULL
    CHECK (reminder_type IN ('confirm_reminder_email','confirm_reminder_phone','confirm_reminder_both')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS confirmation_reminder_log_user_type_idx
  ON public.confirmation_reminder_log (user_id, reminder_type, sent_at DESC);

GRANT SELECT ON public.confirmation_reminder_log TO authenticated;
GRANT ALL ON public.confirmation_reminder_log TO service_role;

ALTER TABLE public.confirmation_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins read reminder log"
  ON public.confirmation_reminder_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));
