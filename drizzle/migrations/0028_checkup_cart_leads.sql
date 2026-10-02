CREATE TABLE public.checkup_cart_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email text,
  phone text,
  last_name text,
  first_name text,
  middle_name text,
  birth_date date,
  bundles text[] NOT NULL DEFAULT '{}',
  clinic_title text,
  clinic_address text,
  location_type text,
  promo_code text,
  amount numeric,
  page text,
  utm jsonb,
  ym_client_id text,
  status text NOT NULL DEFAULT 'incomplete',
  order_id uuid REFERENCES public.energy_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkup_cart_leads_email_idx ON public.checkup_cart_leads (lower(email));
CREATE INDEX checkup_cart_leads_phone_idx ON public.checkup_cart_leads (phone);
CREATE INDEX checkup_cart_leads_order_idx ON public.checkup_cart_leads (order_id);
GRANT SELECT ON public.checkup_cart_leads TO authenticated;
GRANT ALL ON public.checkup_cart_leads TO service_role;
ALTER TABLE public.checkup_cart_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view cart leads" ON public.checkup_cart_leads FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE OR REPLACE FUNCTION public.mark_cart_lead_paid() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.checkup_cart_leads SET status = 'paid', updated_at = now() WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER energy_orders_mark_cart_lead_paid AFTER UPDATE OF status ON public.energy_orders
FOR EACH ROW EXECUTE FUNCTION public.mark_cart_lead_paid();