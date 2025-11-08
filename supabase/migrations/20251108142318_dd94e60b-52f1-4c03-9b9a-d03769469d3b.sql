-- Grant staff with patients permission full access to manage patient data

-- PROFILES: Allow updating patient profiles
CREATE POLICY "Staff with patients permission can update patient profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(id)
);

-- ANALYSES: Allow INSERT, UPDATE, DELETE for patient analyses
CREATE POLICY "Staff with patients permission can insert patient analyses"
ON public.analyses
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff with patients permission can update patient analyses"
ON public.analyses
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff with patients permission can delete patient analyses"
ON public.analyses
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- ANALYSIS_VALUES: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert analysis values for patient analyses"
ON public.analysis_values
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND EXISTS (
    SELECT 1 FROM analyses
    WHERE analyses.id = analysis_values.analysis_id
    AND is_patient(analyses.user_id)
  )
);

CREATE POLICY "Staff can update analysis values for patient analyses"
ON public.analysis_values
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND EXISTS (
    SELECT 1 FROM analyses
    WHERE analyses.id = analysis_values.analysis_id
    AND is_patient(analyses.user_id)
  )
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND EXISTS (
    SELECT 1 FROM analyses
    WHERE analyses.id = analysis_values.analysis_id
    AND is_patient(analyses.user_id)
  )
);

CREATE POLICY "Staff can delete analysis values for patient analyses"
ON public.analysis_values
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND EXISTS (
    SELECT 1 FROM analyses
    WHERE analyses.id = analysis_values.analysis_id
    AND is_patient(analyses.user_id)
  )
);

-- RECOMMENDATIONS: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert recommendations for patients"
ON public.recommendations
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update recommendations for patients"
ON public.recommendations
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete recommendations for patients"
ON public.recommendations
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- PRESCRIPTIONS: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert prescriptions for patients"
ON public.prescriptions
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update prescriptions for patients"
ON public.prescriptions
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete prescriptions for patients"
ON public.prescriptions
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- MEDICAL_HISTORY: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert medical history for patients"
ON public.medical_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update medical history for patients"
ON public.medical_history
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete medical history for patients"
ON public.medical_history
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- COMPLAINTS: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert complaints for patients"
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update complaints for patients"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete complaints for patients"
ON public.complaints
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- USER_SYMPTOMS: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert symptoms for patients"
ON public.user_symptoms
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update symptoms for patients"
ON public.user_symptoms
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete symptoms for patients"
ON public.user_symptoms
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- WEIGHT_HISTORY: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert weight history for patients"
ON public.weight_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update weight history for patients"
ON public.weight_history
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete weight history for patients"
ON public.weight_history
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

-- PRESCRIPTION_ADHERENCE: Allow INSERT, UPDATE, DELETE
CREATE POLICY "Staff can insert adherence data for patients"
ON public.prescription_adherence
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can update adherence data for patients"
ON public.prescription_adherence
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
)
WITH CHECK (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);

CREATE POLICY "Staff can delete adherence data for patients"
ON public.prescription_adherence
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), 'patients'::admin_module)
  AND is_patient(user_id)
);