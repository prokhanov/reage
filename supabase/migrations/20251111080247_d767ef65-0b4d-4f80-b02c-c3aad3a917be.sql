-- Add display_order column to biomarkers table
ALTER TABLE public.biomarkers 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Add display_order column to medical_conditions_templates table
ALTER TABLE public.medical_conditions_templates 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX idx_biomarkers_display_order ON public.biomarkers(category, display_order);
CREATE INDEX idx_medical_conditions_templates_display_order ON public.medical_conditions_templates(category, display_order);