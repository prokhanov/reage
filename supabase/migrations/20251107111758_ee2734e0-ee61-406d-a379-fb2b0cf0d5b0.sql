-- Create enum for prescription status
CREATE TYPE public.prescription_status AS ENUM ('on_review', 'confirmed');

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prescription TEXT NOT NULL,
  control_date DATE,
  status prescription_status NOT NULL DEFAULT 'on_review',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own prescriptions
CREATE POLICY "Users can view their own prescriptions"
ON public.prescriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Superadmins can view all prescriptions
CREATE POLICY "Superadmins can view all prescriptions"
ON public.prescriptions
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can insert prescriptions
CREATE POLICY "Only superadmins can insert prescriptions"
ON public.prescriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can update prescriptions
CREATE POLICY "Superadmins can update all prescriptions"
ON public.prescriptions
FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can delete prescriptions
CREATE POLICY "Only superadmins can delete prescriptions"
ON public.prescriptions
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();