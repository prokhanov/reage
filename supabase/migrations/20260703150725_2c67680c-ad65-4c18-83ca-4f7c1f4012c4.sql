CREATE TABLE IF NOT EXISTS public._prompt_import_staging (
  key text NOT NULL,
  chunk_idx int NOT NULL,
  chunk text NOT NULL,
  PRIMARY KEY (key, chunk_idx)
);
GRANT ALL ON public._prompt_import_staging TO service_role;
ALTER TABLE public._prompt_import_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc only" ON public._prompt_import_staging FOR ALL TO service_role USING (true) WITH CHECK (true);