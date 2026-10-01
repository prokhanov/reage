ALTER TABLE public.one_time_checkups
ADD COLUMN IF NOT EXISTS consultation_purchased boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.one_time_checkups.consultation_purchased IS 'Whether a doctor consultation has been purchased for this blood draw order.';