-- Add reason column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN reason TEXT;

COMMENT ON COLUMN prescriptions.reason IS 'Причина назначения: какие биомаркеры/показатели привели к этому решению';