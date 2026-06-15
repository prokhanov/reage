
CREATE TABLE public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE DEFAULT 'robokassa',
  test_mode boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.payment_gateway_settings TO authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read gateway settings"
  ON public.payment_gateway_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert gateway settings"
  ON public.payment_gateway_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update gateway settings"
  ON public.payment_gateway_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_payment_gateway_settings_updated_at
  BEFORE UPDATE ON public.payment_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed default row (test mode ON until user disables)
INSERT INTO public.payment_gateway_settings (provider, test_mode)
VALUES ('robokassa', true)
ON CONFLICT (provider) DO NOTHING;

-- Mark test orders
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
