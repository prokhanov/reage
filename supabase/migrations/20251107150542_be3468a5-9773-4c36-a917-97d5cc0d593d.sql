-- Добавляем политики для суперадминов на таблицу prescription_adherence
CREATE POLICY "Superadmins can insert adherence for any user"
ON prescription_adherence
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update adherence for any user"
ON prescription_adherence
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));

-- Добавляем политики для суперадминов на таблицу user_symptoms
CREATE POLICY "Superadmins can insert symptoms for any user"
ON user_symptoms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete symptoms for any user"
ON user_symptoms
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));