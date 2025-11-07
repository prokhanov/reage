-- Allow superadmins to update all analyses
CREATE POLICY "Superadmins can update all analyses"
ON public.analyses
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to update all recommendations  
CREATE POLICY "Superadmins can update all recommendations"
ON public.recommendations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));