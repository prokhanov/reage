
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_text TEXT NOT NULL,
  button_label TEXT,
  footer_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Seed defaults
INSERT INTO public.email_templates (template_type, subject, heading, body_text, button_label, footer_text) VALUES
('signup', 'Подтвердите ваш email', 'Добро пожаловать в ReAge!', 'Спасибо за регистрацию в ReAge. Подтвердите ваш email, нажав на кнопку ниже:', 'Подтвердить email', 'Если вы не создавали аккаунт, просто проигнорируйте это письмо.'),
('recovery', 'Сброс пароля ReAge', 'Сброс пароля', 'Мы получили запрос на сброс пароля для вашего аккаунта ReAge. Нажмите на кнопку ниже, чтобы задать новый пароль.', 'Сбросить пароль', 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо. Ваш пароль не будет изменён.'),
('magiclink', 'Ссылка для входа в ReAge', 'Вход в ReAge', 'Нажмите на кнопку ниже, чтобы войти в ваш аккаунт ReAge. Ссылка действительна ограниченное время.', 'Войти', 'Если вы не запрашивали эту ссылку, просто проигнорируйте это письмо.'),
('invite', 'Вас пригласили в ReAge', 'Вас пригласили в ReAge', 'Вы получили приглашение присоединиться к ReAge. Нажмите на кнопку ниже, чтобы принять приглашение и создать аккаунт.', 'Принять приглашение', 'Если вы не ожидали этого приглашения, просто проигнорируйте это письмо.'),
('email_change', 'Подтвердите смену email в ReAge', 'Смена email', 'Вы запросили смену email в ReAge. Нажмите на кнопку ниже, чтобы подтвердить изменение:', 'Подтвердить смену email', 'Если вы не запрашивали смену email, немедленно обезопасьте ваш аккаунт.'),
('reauthentication', 'Ваш код подтверждения ReAge', 'Код подтверждения', 'Используйте код ниже для подтверждения вашей личности:', NULL, 'Код действителен ограниченное время. Если вы не запрашивали его, проигнорируйте это письмо.');
