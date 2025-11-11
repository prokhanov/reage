-- Add biomarkers_metadata JSONB field to analyses table for tracking composite biomarker calculation
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS biomarkers_metadata JSONB;

-- Create GIN index for efficient querying of biomarkers metadata
CREATE INDEX IF NOT EXISTS idx_analyses_biomarkers_metadata ON analyses USING GIN (biomarkers_metadata);

-- Add comment explaining the field purpose
COMMENT ON COLUMN analyses.biomarkers_metadata IS 'Метаданные расчета биологического возраста: количество текущих и исторических биомаркеров (окно 4 месяца)';