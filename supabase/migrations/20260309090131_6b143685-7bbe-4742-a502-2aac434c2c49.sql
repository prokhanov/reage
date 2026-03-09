
CREATE TABLE public.email_sender_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL DEFAULT 'reage',
  sender_email TEXT NOT NULL DEFAULT 'noreply',
  sender_domain TEXT NOT NULL DEFAULT 'notify.reage.life',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.email_sender_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage sender settings"
  ON public.email_sender_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.email_sender_settings (sender_name, sender_email, sender_domain)
VALUES ('reage', 'noreply', 'notify.reage.life');
