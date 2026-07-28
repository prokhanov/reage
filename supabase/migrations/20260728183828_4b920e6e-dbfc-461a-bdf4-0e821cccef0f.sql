DROP POLICY IF EXISTS "Staff can view all reports" ON public.report_documents;
DROP POLICY IF EXISTS "Staff can insert reports" ON public.report_documents;
DROP POLICY IF EXISTS "Staff can update reports" ON public.report_documents;
DROP POLICY IF EXISTS "Staff can delete reports" ON public.report_documents;

CREATE POLICY "Staff can view all reports"
ON public.report_documents FOR SELECT TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::admin_module));

CREATE POLICY "Staff can insert reports"
ON public.report_documents FOR INSERT TO authenticated
WITH CHECK (public.has_admin_permission(auth.uid(), 'patients'::admin_module));

CREATE POLICY "Staff can update reports"
ON public.report_documents FOR UPDATE TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::admin_module))
WITH CHECK (public.has_admin_permission(auth.uid(), 'patients'::admin_module));

CREATE POLICY "Staff can delete reports"
ON public.report_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.report_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_documents TO authenticated;
GRANT ALL ON public.report_documents TO service_role;