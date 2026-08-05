UPDATE public.report_documents
SET
  blocks = '[]'::jsonb,
  updated_at = now()
WHERE analysis_id = '60b7f023-39f7-4288-9772-9977af6d5981'::uuid
  AND edited_at IS NULL
  AND published_at IS NULL
  AND status = 'draft';