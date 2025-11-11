-- Add age_ranges field to biomarkers table for age-dependent normal ranges
ALTER TABLE biomarkers 
ADD COLUMN age_ranges jsonb DEFAULT NULL;

-- Add a comment explaining the structure
COMMENT ON COLUMN biomarkers.age_ranges IS 'Age-dependent normal ranges in format: {"male": [{"age_from": 0, "age_to": 18, "min": 120, "max": 150}], "female": [...]}';

-- Create an index for better query performance
CREATE INDEX idx_biomarkers_age_ranges ON biomarkers USING GIN (age_ranges);