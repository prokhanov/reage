
CREATE TABLE public.lifestyle_quiz_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  quiz_version TEXT NOT NULL DEFAULT 'v1',
  sex TEXT,
  age_band TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.lifestyle_quiz_submissions TO anon, authenticated;
GRANT ALL ON public.lifestyle_quiz_submissions TO service_role;

ALTER TABLE public.lifestyle_quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit lifestyle quiz results"
  ON public.lifestyle_quiz_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can read lifestyle quiz submissions"
  ON public.lifestyle_quiz_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));
