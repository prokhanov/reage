-- Allow staff with patients permission to insert bookings for patients
CREATE POLICY "Staff can insert bookings for patients"
ON public.analysis_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module) 
  AND is_patient(user_id)
);