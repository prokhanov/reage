-- Add effect column to prescriptions table
ALTER TABLE public.prescriptions
ADD COLUMN effect text;