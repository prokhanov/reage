-- Create weight_history table for tracking weight measurements
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight NUMERIC NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT weight_positive CHECK (weight > 0 AND weight < 1000)
);

-- Enable RLS
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view their own weight history"
ON public.weight_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight measurements"
ON public.weight_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight measurements"
ON public.weight_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight measurements"
ON public.weight_history
FOR DELETE
USING (auth.uid() = user_id);

-- Policies for superadmins
CREATE POLICY "Superadmins can view all weight history"
ON public.weight_history
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_weight_history_user_measured ON public.weight_history(user_id, measured_at DESC);