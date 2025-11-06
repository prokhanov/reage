-- Create table for user symptoms tracking
CREATE TABLE public.user_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  symptom TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 3),
  tracked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_symptoms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own symptoms"
  ON public.user_symptoms
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symptoms"
  ON public.user_symptoms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptoms"
  ON public.user_symptoms
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptoms"
  ON public.user_symptoms
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_symptoms_user_id ON public.user_symptoms(user_id);
CREATE INDEX idx_user_symptoms_tracked_at ON public.user_symptoms(tracked_at DESC);