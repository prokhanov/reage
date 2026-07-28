CREATE OR REPLACE FUNCTION public.report_document_status(p_analysis_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rd.status
  FROM public.report_documents rd
  JOIN public.analyses a ON a.id = rd.analysis_id
  WHERE rd.analysis_id = p_analysis_id
    AND (
      a.user_id = auth.uid()
      OR has_role(auth.uid(), 'superadmin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'doctor'::app_role)
    )
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.report_document_status(uuid) TO authenticated;