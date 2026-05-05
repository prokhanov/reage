ALTER TABLE public.health_strategy_snapshots
  ADD COLUMN IF NOT EXISTS cohort_percentile integer,
  ADD COLUMN IF NOT EXISTS cohort_label text;