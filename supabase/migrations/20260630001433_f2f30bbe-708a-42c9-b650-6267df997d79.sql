ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pregnancy_start_date date;

COMMENT ON COLUMN public.profiles.pregnancy_start_date IS
  'Дата начала беременности (первый день последней менструации перед беременностью). Используется для расчёта срока в неделях и триместра при reproductive_status=pregnant.';