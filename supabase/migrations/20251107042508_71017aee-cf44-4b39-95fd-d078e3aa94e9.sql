-- Allow superadmins to delete any analysis
CREATE POLICY "Superadmins can delete all analyses"
ON public.analyses
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));