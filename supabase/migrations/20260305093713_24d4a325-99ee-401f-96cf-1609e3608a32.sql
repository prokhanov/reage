
-- Add optimal and critical range columns to biomarkers table
ALTER TABLE public.biomarkers
  ADD COLUMN IF NOT EXISTS optimal_min double precision,
  ADD COLUMN IF NOT EXISTS optimal_max double precision,
  ADD COLUMN IF NOT EXISTS optimal_min_male double precision,
  ADD COLUMN IF NOT EXISTS optimal_max_male double precision,
  ADD COLUMN IF NOT EXISTS optimal_min_female double precision,
  ADD COLUMN IF NOT EXISTS optimal_max_female double precision,
  ADD COLUMN IF NOT EXISTS critical_min double precision,
  ADD COLUMN IF NOT EXISTS critical_max double precision,
  ADD COLUMN IF NOT EXISTS critical_min_male double precision,
  ADD COLUMN IF NOT EXISTS critical_max_male double precision,
  ADD COLUMN IF NOT EXISTS critical_min_female double precision,
  ADD COLUMN IF NOT EXISTS critical_max_female double precision;
