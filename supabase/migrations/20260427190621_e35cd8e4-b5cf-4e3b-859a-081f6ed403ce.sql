-- Таблица для пошагового pipeline генерации отчёта
CREATE TABLE public.report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('standard', 'deep')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,           -- упорядоченный список шагов (id + label)
  current_step text,                                   -- id текущего шага
  steps_total int NOT NULL DEFAULT 0,
  steps_done int NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,                     -- ретраи на уровне текущего шага
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- Индекс для быстрого поиска активной задачи по анализу
CREATE UNIQUE INDEX report_jobs_active_per_analysis
  ON public.report_jobs (analysis_id)
  WHERE status IN ('queued', 'running');

CREATE INDEX report_jobs_user_idx ON public.report_jobs (user_id, started_at DESC);
CREATE INDEX report_jobs_analysis_idx ON public.report_jobs (analysis_id, started_at DESC);

-- updated_at trigger
CREATE TRIGGER report_jobs_updated_at
  BEFORE UPDATE ON public.report_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report jobs"
  ON public.report_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff with patients permission can view patient jobs"
  ON public.report_jobs FOR SELECT
  TO authenticated
  USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Superadmins can view all jobs"
  ON public.report_jobs FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can manage all jobs"
  ON public.report_jobs FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert/update делаются через service role в edge-функции, дополнительные политики не нужны.
