CREATE OR REPLACE FUNCTION public.publish_report_document(
  p_analysis_id uuid,
  p_blocks jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc public.report_documents%ROWTYPE;
  v_actor uuid := auth.uid();
  v_blocks jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_admin_permission(v_actor, 'patients'::public.admin_module) THEN
    RAISE EXCEPTION 'Not allowed to publish report document' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc
  FROM public.report_documents
  WHERE analysis_id = p_analysis_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report document not found' USING ERRCODE = 'P0002';
  END IF;

  v_blocks := COALESCE(p_blocks, v_doc.blocks);

  IF jsonb_typeof(v_blocks) <> 'array' OR jsonb_array_length(v_blocks) = 0 THEN
    RAISE EXCEPTION 'Report document is empty' USING ERRCODE = '22023';
  END IF;

  UPDATE public.report_documents
  SET
    status = 'published',
    published_blocks = v_blocks,
    published_at = now(),
    published_by = v_actor
  WHERE id = v_doc.id;

  UPDATE public.analyses
  SET status = 'processed'::public.analysis_status
  WHERE id = p_analysis_id
    AND user_id = v_doc.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked analysis not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.publish_report_document(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_report_document(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_report_document(uuid, jsonb) TO service_role;

UPDATE public.analyses a
SET status = 'processed'::public.analysis_status
FROM public.report_documents d
WHERE d.analysis_id = a.id
  AND d.published_at IS NOT NULL
  AND d.published_blocks IS NOT NULL
  AND a.status = 'on_review'::public.analysis_status;