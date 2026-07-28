-- 1. PDF-снимок публикации
ALTER TABLE public.report_documents
  ADD COLUMN IF NOT EXISTS published_pdf_path text,
  ADD COLUMN IF NOT EXISTS published_pdf_hash text,
  ADD COLUMN IF NOT EXISTS published_pdf_rendered_at timestamptz;

-- 2. report_jobs: режим 'pdf' + уникальность активной задачи с учётом mode,
--    иначе PDF-рендер конфликтует с активной AI-задачей по тому же анализу.
ALTER TABLE public.report_jobs DROP CONSTRAINT IF EXISTS report_jobs_mode_check;
ALTER TABLE public.report_jobs
  ADD CONSTRAINT report_jobs_mode_check CHECK (mode IN ('standard', 'deep', 'pdf'));

DROP INDEX IF EXISTS public.report_jobs_active_per_analysis;
CREATE UNIQUE INDEX report_jobs_active_per_analysis
  ON public.report_jobs (analysis_id, mode)
  WHERE status IN ('queued', 'running');

-- 3. Журнал доступа к отчётам
CREATE TABLE public.report_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'staff')),
  channel text NOT NULL CHECK (channel IN ('pdf', 'signed_url')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX report_access_log_analysis_idx
  ON public.report_access_log (analysis_id, created_at DESC);
CREATE INDEX report_access_log_dedup_idx
  ON public.report_access_log (viewer_id, analysis_id, created_at DESC);

GRANT SELECT ON public.report_access_log TO authenticated;
GRANT ALL ON public.report_access_log TO service_role;

ALTER TABLE public.report_access_log ENABLE ROW LEVEL SECURITY;

-- Пишет только service_role (edge-функции) — INSERT-политик для authenticated нет.
CREATE POLICY "Superadmins can read access log"
  ON public.report_access_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Staff can read access log for their patients"
  ON public.report_access_log FOR SELECT
  TO authenticated
  USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));