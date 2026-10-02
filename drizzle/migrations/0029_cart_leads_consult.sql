ALTER TABLE public.checkup_cart_leads ADD COLUMN IF NOT EXISTS consult boolean NOT NULL DEFAULT false;
ALTER TABLE public.checkup_cart_leads ADD COLUMN IF NOT EXISTS consult_price numeric;