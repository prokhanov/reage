ALTER TABLE public.energy_orders
ADD COLUMN IF NOT EXISTS consultation_purchased boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.energy_orders.consultation_purchased IS 'Whether the order includes the paid doctor consultation add-on.';