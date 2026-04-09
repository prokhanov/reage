
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS form text,
  ADD COLUMN IF NOT EXISTS dosage text,
  ADD COLUMN IF NOT EXISTS how_to_take text,
  ADD COLUMN IF NOT EXISTS duration text;
