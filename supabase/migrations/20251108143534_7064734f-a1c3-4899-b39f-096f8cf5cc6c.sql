DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analysis_values' 
      AND policyname = 'Staff can view analysis values for patient analyses'
  ) THEN
    CREATE POLICY "Staff can view analysis values for patient analyses"
    ON public.analysis_values
    FOR SELECT
    USING (
      has_admin_permission(auth.uid(), 'patients'::admin_module)
      AND EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_values.analysis_id
          AND is_patient(analyses.user_id)
      )
    );
  END IF;
END $$;