-- ============================================================
-- prescriptions_v2: нутрицевтики (отдельно от старой системы)
-- ============================================================
CREATE TABLE public.prescriptions_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE,
  name text,
  form text,
  dosage text,
  how_to_take text,
  duration text,
  prescription text NOT NULL,
  reason text,
  effect text,
  category text,
  status prescription_status NOT NULL DEFAULT 'on_review'::prescription_status,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_v2_user ON public.prescriptions_v2(user_id);
CREATE INDEX idx_prescriptions_v2_analysis ON public.prescriptions_v2(analysis_id);

ALTER TABLE public.prescriptions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prescriptions_v2"
ON public.prescriptions_v2 FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins manage prescriptions_v2"
ON public.prescriptions_v2 FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Staff view patient prescriptions_v2"
ON public.prescriptions_v2 FOR SELECT TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff insert patient prescriptions_v2"
ON public.prescriptions_v2 FOR INSERT TO authenticated
WITH CHECK (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff update patient prescriptions_v2"
ON public.prescriptions_v2 FOR UPDATE TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id))
WITH CHECK (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff delete patient prescriptions_v2"
ON public.prescriptions_v2 FOR DELETE TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE TRIGGER trg_prescriptions_v2_updated_at
BEFORE UPDATE ON public.prescriptions_v2
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- lifestyle_recommendations_v2: образ жизни и доп. обследования
-- ============================================================
CREATE TABLE public.lifestyle_recommendations_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  nutrition jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity jsonb NOT NULL DEFAULT '[]'::jsonb,
  sleep jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

CREATE INDEX idx_lifestyle_v2_user ON public.lifestyle_recommendations_v2(user_id);
CREATE INDEX idx_lifestyle_v2_analysis ON public.lifestyle_recommendations_v2(analysis_id);

ALTER TABLE public.lifestyle_recommendations_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins manage lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Staff view patient lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR SELECT TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff insert patient lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR INSERT TO authenticated
WITH CHECK (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff update patient lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR UPDATE TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id))
WITH CHECK (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Staff delete patient lifestyle_v2"
ON public.lifestyle_recommendations_v2 FOR DELETE TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE TRIGGER trg_lifestyle_v2_updated_at
BEFORE UPDATE ON public.lifestyle_recommendations_v2
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();