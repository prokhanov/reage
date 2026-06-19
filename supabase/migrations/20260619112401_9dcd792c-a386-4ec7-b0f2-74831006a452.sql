CREATE TABLE public.promo_code_settings (
  singleton boolean PRIMARY KEY DEFAULT true,
  default_prefix text NOT NULL DEFAULT 'PROMO',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_code_settings_singleton_chk CHECK (singleton = true)
);

GRANT SELECT, INSERT, UPDATE ON public.promo_code_settings TO authenticated;
GRANT ALL ON public.promo_code_settings TO service_role;

ALTER TABLE public.promo_code_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage promo settings"
ON public.promo_code_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.promo_code_settings (singleton, default_prefix) VALUES (true, 'PROMO')
ON CONFLICT (singleton) DO NOTHING;