-- Allow superadmins to view all user symptoms (history in view mode)
CREATE POLICY "Superadmins can view all symptoms"
ON user_symptoms
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));

-- Allow superadmins to view all prescription adherence (for analytics/history)
CREATE POLICY "Superadmins can view all adherence"
ON prescription_adherence
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));
