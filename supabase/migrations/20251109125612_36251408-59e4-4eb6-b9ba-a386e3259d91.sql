-- Add DELETE policy for staff with analysis_bookings permission
CREATE POLICY "Staff with analysis_bookings permission can delete bookings"
ON public.analysis_bookings
FOR DELETE
TO authenticated
USING (has_admin_permission(auth.uid(), 'analysis_bookings'::admin_module));

-- Add DELETE policy for superadmins
CREATE POLICY "Superadmins can delete all bookings"
ON public.analysis_bookings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));