
CREATE TABLE public.test_email_overrides (
  email TEXT PRIMARY KEY,
  template_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed by edge functions via service role
ALTER TABLE public.test_email_overrides ENABLE ROW LEVEL SECURITY;
