ALTER TABLE public.report_documents ADD COLUMN IF NOT EXISTS published_blocks jsonb;

UPDATE public.report_documents
SET published_blocks = blocks
WHERE published_blocks IS NULL AND published_at IS NOT NULL;

DROP POLICY IF EXISTS "Patients can view own published report" ON public.report_documents;
CREATE POLICY "Patients can view own published report"
ON public.report_documents
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND published_at IS NOT NULL AND published_blocks IS NOT NULL);

CREATE OR REPLACE FUNCTION public.report_document_status(p_analysis_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN d.published_at IS NOT NULL AND d.published_blocks IS NOT NULL THEN 'published'
           ELSE 'draft'
         END
  FROM public.report_documents d
  WHERE d.analysis_id = p_analysis_id
  LIMIT 1
$$;