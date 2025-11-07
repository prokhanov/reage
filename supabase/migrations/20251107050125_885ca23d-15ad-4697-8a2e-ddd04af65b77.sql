-- Add superadmin policies for analysis_values table
CREATE POLICY "Superadmins can insert all analysis values"
ON analysis_values FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update all analysis values"
ON analysis_values FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete all analysis values"
ON analysis_values FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));