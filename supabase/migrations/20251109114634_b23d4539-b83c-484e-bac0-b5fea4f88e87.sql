-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Staff with analysis_bookings permission can view bookings" ON public.analysis_bookings;

-- Create a new policy that allows staff with either analysis_bookings OR patients permission to view bookings
CREATE POLICY "Staff with analysis_bookings or patients permission can view bookings"
ON public.analysis_bookings
FOR SELECT
USING (
  has_admin_permission(auth.uid(), 'analysis_bookings'::admin_module) 
  OR has_admin_permission(auth.uid(), 'patients'::admin_module)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);