ALTER TABLE public.report_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.report_documents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_documents;