
CREATE TABLE public.health_risk_quiz_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT false,
  quiz_version TEXT NOT NULL DEFAULT 'v1',
  age INTEGER,
  sex TEXT,
  height NUMERIC,
  weight NUMERIC,
  bmi NUMERIC,
  waist NUMERIC,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  heart_result JSONB,
  findrisc_result JSONB,
  nafld_result JSONB,
  sleep_result JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.health_risk_quiz_submissions TO anon, authenticated;
GRANT ALL ON public.health_risk_quiz_submissions TO service_role;

ALTER TABLE public.health_risk_quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit their own quiz.
CREATE POLICY "Anyone can submit quiz results"
  ON public.health_risk_quiz_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only superadmins can read submissions.
CREATE POLICY "Superadmins can read quiz submissions"
  ON public.health_risk_quiz_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));
