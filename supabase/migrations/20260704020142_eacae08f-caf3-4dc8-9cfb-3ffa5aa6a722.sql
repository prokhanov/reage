CREATE TABLE public.report_preview_snapshots (
  token text PRIMARY KEY,
  report jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT ALL ON public.report_preview_snapshots TO service_role;
ALTER TABLE public.report_preview_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX report_preview_snapshots_expires_at_idx
  ON public.report_preview_snapshots (expires_at);