
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postpartum_date date,
  ADD COLUMN IF NOT EXISTS menopause_date date,
  ADD COLUMN IF NOT EXISTS contraceptive_type text,
  ADD COLUMN IF NOT EXISTS contraceptive_start_date date,
  ADD COLUMN IF NOT EXISTS hrt_type text,
  ADD COLUMN IF NOT EXISTS hrt_route text,
  ADD COLUMN IF NOT EXISTS hrt_start_date date;
