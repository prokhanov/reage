CREATE POLICY "Staff with patients permission can view patient prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission(auth.uid(), 'patients'::public.admin_module)
  AND public.is_patient(user_id)
);

CREATE POLICY "Staff with patients permission can view patient recommendations"
ON public.recommendations
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission(auth.uid(), 'patients'::public.admin_module)
  AND public.is_patient(user_id)
);