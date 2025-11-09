-- Drop the restrictive policy
DROP POLICY IF EXISTS "Staff with analysis_bookings or patients permission can view bookings" ON public.analysis_bookings;

-- Create a policy that allows all staff (non-patients) to view bookings
CREATE POLICY "All staff can view bookings"
ON public.analysis_bookings
FOR SELECT
USING (
  NOT is_patient(auth.uid())
);