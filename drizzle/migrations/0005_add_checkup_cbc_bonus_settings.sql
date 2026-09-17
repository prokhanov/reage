ALTER TABLE public.checkup_settings
  ADD COLUMN IF NOT EXISTS cbc_bonus_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.energy_orders
  ADD COLUMN IF NOT EXISTS bonus_items jsonb NOT NULL DEFAULT '[]'::jsonb;