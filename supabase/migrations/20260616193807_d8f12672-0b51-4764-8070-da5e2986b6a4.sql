ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS operations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS medications text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS health_note text;