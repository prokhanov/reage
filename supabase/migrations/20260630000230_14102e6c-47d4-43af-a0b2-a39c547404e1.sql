ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reproductive_status text,
  ADD COLUMN IF NOT EXISTS last_menstrual_date date;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_reproductive_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_reproductive_status_check
  CHECK (reproductive_status IS NULL OR reproductive_status IN (
    'regular','pregnant','lactating','perimenopause','menopause','hormonal_therapy','contraceptives'
  ));