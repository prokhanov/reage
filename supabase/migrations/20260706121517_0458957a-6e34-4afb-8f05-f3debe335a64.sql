ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS cover_overrides jsonb;
COMMENT ON COLUMN public.analyses.cover_overrides IS
  'ReportV2 cover editor overrides. NULL = default hardcoded template.';