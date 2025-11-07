-- Allow superadmins to update any profile
CREATE POLICY "Superadmins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Extend weight_history policies for superadmins (insert/update/delete)
CREATE POLICY "Superadmins can insert weight history"
ON public.weight_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update weight history"
ON public.weight_history
FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete weight history"
ON public.weight_history
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));