-- Extend profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS height NUMERIC;

-- Create medical conditions table
CREATE TABLE public.medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, condition)
);

-- Enable RLS
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own medical history"
  ON public.medical_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical history"
  ON public.medical_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical history"
  ON public.medical_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical history"
  ON public.medical_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_medical_history_user_id ON public.medical_history(user_id);