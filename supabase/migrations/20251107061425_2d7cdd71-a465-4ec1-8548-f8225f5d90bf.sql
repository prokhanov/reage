DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'recommendations' AND policyname = 'Superadmins can delete all recommendations'
  ) THEN
    CREATE POLICY "Superadmins can delete all recommendations"
    ON public.recommendations
    FOR DELETE
    USING (has_role(auth.uid(), 'superadmin'::app_role));
  END IF;
END $$;