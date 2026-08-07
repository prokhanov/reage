GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analyses TO authenticated;
GRANT ALL ON TABLE public.analyses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recommendations TO authenticated;
GRANT ALL ON TABLE public.recommendations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_documents TO authenticated;
GRANT ALL ON TABLE public.report_documents TO service_role;