CREATE OR REPLACE FUNCTION public.unpublish_report_document(p_analysis_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doc public.report_documents%ROWTYPE;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_admin_permission(v_actor, 'patients'::public.admin_module) THEN
    RAISE EXCEPTION 'Not allowed to unpublish report document' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc
  FROM public.report_documents
  WHERE analysis_id = p_analysis_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report document not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.report_documents
  SET
    status = 'draft',
    published_blocks = NULL,
    published_at = NULL,
    published_by = NULL,
    published_pdf_path = NULL,
    published_pdf_hash = NULL,
    published_pdf_rendered_at = NULL
  WHERE id = v_doc.id;

  UPDATE public.analyses
  SET status = 'on_review'::public.analysis_status
  WHERE id = p_analysis_id
    AND user_id = v_doc.user_id;

  RETURN 'draft';
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unpublish_report_document(uuid) TO authenticated;