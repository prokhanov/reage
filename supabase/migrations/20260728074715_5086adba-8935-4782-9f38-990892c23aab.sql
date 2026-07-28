CREATE TABLE public.report_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  published_by uuid,
  edited_at timestamptz,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_documents_status_check CHECK (status IN ('draft','published','edited'))
);

CREATE INDEX idx_report_documents_user ON public.report_documents(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_documents TO authenticated;
GRANT ALL ON public.report_documents TO service_role;

ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own published report"
  ON public.report_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status IN ('published','edited'));

CREATE POLICY "Staff can view all reports"
  ON public.report_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Staff can insert reports"
  ON public.report_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Staff can update reports"
  ON public.report_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Staff can delete reports"
  ON public.report_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER report_documents_updated_at
  BEFORE UPDATE ON public.report_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();