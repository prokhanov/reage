ALTER TABLE public.health_strategy_snapshots
  ADD COLUMN IF NOT EXISTS roadmap jsonb,
  ADD COLUMN IF NOT EXISTS key_biomarkers jsonb,
  ADD COLUMN IF NOT EXISTS analyses_per_year integer;