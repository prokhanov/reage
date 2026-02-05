-- Add category column to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN category TEXT;

COMMENT ON COLUMN prescriptions.category IS 'Категория биомаркеров, к которой относится назначение (e.g., Сердечно-сосудистая система)';