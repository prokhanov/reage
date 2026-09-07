CREATE SEQUENCE IF NOT EXISTS public.energy_orders_inv_id_seq START WITH 900000001 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.energy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inv_id bigint NOT NULL UNIQUE DEFAULT nextval('public.energy_orders_inv_id_seq'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bundle text NOT NULL DEFAULT 'energy',
  email text NOT NULL,
  phone text NOT NULL,
  clinic_id text,
  clinic_title text,
  clinic_address text,
  original_amount numeric NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  out_sum numeric NOT NULL,
  promo_code text,
  status text NOT NULL DEFAULT 'pending',
  is_test boolean NOT NULL DEFAULT true,
  paid_amount numeric,
  paid_at timestamptz,
  robokassa_signature text,
  raw_callback jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.energy_orders_inv_id_seq OWNED BY public.energy_orders.inv_id;

GRANT ALL ON public.energy_orders TO service_role;
GRANT SELECT ON public.energy_orders TO authenticated;

ALTER TABLE public.energy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view energy orders"
ON public.energy_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR user_id = auth.uid());
