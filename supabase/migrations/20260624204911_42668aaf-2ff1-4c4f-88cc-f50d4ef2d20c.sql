
-- RLS policies for analysis-uploads bucket
CREATE POLICY "analysis_uploads_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'analysis-uploads'
  AND (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_admin_permission(auth.uid(), 'patients'::public.admin_module)
  )
)
WITH CHECK (
  bucket_id = 'analysis-uploads'
  AND (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_admin_permission(auth.uid(), 'patients'::public.admin_module)
  )
);

CREATE POLICY "analysis_uploads_owner_rw"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'analysis-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'analysis-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
