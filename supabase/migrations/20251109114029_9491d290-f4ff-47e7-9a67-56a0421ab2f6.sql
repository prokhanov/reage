-- Add RLS policies for staff with analysis_bookings permission
CREATE POLICY "Staff with analysis_bookings permission can view bookings"
ON public.analysis_bookings
FOR SELECT
USING (has_admin_permission(auth.uid(), 'analysis_bookings'::admin_module));

CREATE POLICY "Staff with analysis_bookings permission can update bookings"
ON public.analysis_bookings
FOR UPDATE
USING (has_admin_permission(auth.uid(), 'analysis_bookings'::admin_module))
WITH CHECK (has_admin_permission(auth.uid(), 'analysis_bookings'::admin_module));