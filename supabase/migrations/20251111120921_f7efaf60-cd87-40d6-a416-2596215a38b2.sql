-- Add gender-specific normal range columns to biomarkers table
ALTER TABLE biomarkers 
ADD COLUMN IF NOT EXISTS normal_min_male double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS normal_max_male double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS normal_min_female double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS normal_max_female double precision DEFAULT NULL;

COMMENT ON COLUMN biomarkers.normal_min_male IS 'Minimum normal value for males';
COMMENT ON COLUMN biomarkers.normal_max_male IS 'Maximum normal value for males';
COMMENT ON COLUMN biomarkers.normal_min_female IS 'Minimum normal value for females';
COMMENT ON COLUMN biomarkers.normal_max_female IS 'Maximum normal value for females';