-- Add analysis_id column to prescriptions table to link prescriptions with analyses
ALTER TABLE public.prescriptions 
ADD COLUMN analysis_id uuid NULL REFERENCES public.analyses(id) ON DELETE SET NULL;

-- Create index on analysis_id for faster queries
CREATE INDEX idx_prescriptions_analysis_id ON public.prescriptions(analysis_id);