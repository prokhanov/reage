CREATE TABLE public.checkup_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_slug text NOT NULL,
  biomarker_id uuid REFERENCES public.biomarkers(id) ON DELETE SET NULL,
  title text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkup_markers_slug_idx ON public.checkup_markers(checkup_slug, display_order);
GRANT SELECT ON public.checkup_markers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.checkup_markers TO authenticated;
GRANT ALL ON public.checkup_markers TO service_role;
ALTER TABLE public.checkup_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view checkup markers" ON public.checkup_markers FOR SELECT USING (true);
CREATE POLICY "Staff can manage checkup markers" ON public.checkup_markers TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'checkups'::public.admin_module))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'checkups'::public.admin_module));

CREATE TABLE public.checkup_variants (
  slug text PRIMARY KEY,
  parent_slug text NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checkup_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.checkup_variants TO authenticated;
GRANT ALL ON public.checkup_variants TO service_role;
ALTER TABLE public.checkup_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view checkup variants" ON public.checkup_variants FOR SELECT USING (true);
CREATE POLICY "Staff can manage checkup variants" ON public.checkup_variants TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'checkups'::public.admin_module))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'checkups'::public.admin_module));