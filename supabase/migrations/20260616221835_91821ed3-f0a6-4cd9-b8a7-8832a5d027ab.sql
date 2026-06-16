ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passport_series TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT;