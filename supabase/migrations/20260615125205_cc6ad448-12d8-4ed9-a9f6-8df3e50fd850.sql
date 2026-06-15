
-- ============ payment_orders ============
CREATE SEQUENCE IF NOT EXISTS public.payment_orders_inv_id_seq START 1000001;

CREATE TABLE public.payment_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inv_id bigint NOT NULL UNIQUE DEFAULT nextval('public.payment_orders_inv_id_seq'),
  user_id uuid NOT NULL,
  plan_id uuid,
  pricing_id uuid,
  out_sum numeric NOT NULL,
  paid_amount numeric,
  status text NOT NULL DEFAULT 'pending',
  robokassa_signature text,
  raw_callback jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_orders_status_check CHECK (status IN ('pending','paid','failed'))
);

ALTER SEQUENCE public.payment_orders_inv_id_seq OWNED BY public.payment_orders.inv_id;

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
GRANT USAGE ON SEQUENCE public.payment_orders_inv_id_seq TO authenticated, service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins view all payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX idx_payment_orders_status ON public.payment_orders(status);

-- ============ payment_callback_log ============
CREATE TABLE public.payment_callback_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inv_id bigint,
  signature_valid boolean NOT NULL DEFAULT false,
  error text,
  raw_body jsonb,
  headers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_callback_log TO authenticated;
GRANT ALL ON public.payment_callback_log TO service_role;

ALTER TABLE public.payment_callback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins read callback log"
  ON public.payment_callback_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_payment_callback_log_inv ON public.payment_callback_log(inv_id);
CREATE INDEX idx_payment_callback_log_created ON public.payment_callback_log(created_at DESC);

-- ============ Tighten subscriptions RLS ============
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users insert own pending subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users update own pending subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
