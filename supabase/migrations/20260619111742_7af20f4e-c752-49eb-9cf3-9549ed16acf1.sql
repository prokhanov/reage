
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payment_orders_promo_code ON public.payment_orders(promo_code_id);
