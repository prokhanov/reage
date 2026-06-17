ALTER TABLE public.lab_map_contexts
  ADD COLUMN IF NOT EXISTS show_partner_button boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_select_button boolean NOT NULL DEFAULT false;