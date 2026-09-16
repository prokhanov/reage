ALTER TABLE public.energy_orders ADD COLUMN IF NOT EXISTS bundles text[];

UPDATE public.energy_orders SET bundles = ARRAY[bundle] WHERE bundles IS NULL AND bundle IS NOT NULL;