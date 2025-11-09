-- Update analysis_bookings status to use new values
ALTER TABLE public.analysis_bookings 
DROP CONSTRAINT IF EXISTS analysis_bookings_status_check;

ALTER TABLE public.analysis_bookings
ALTER COLUMN status TYPE text;

COMMENT ON COLUMN public.analysis_bookings.status IS 'Статусы: not_scheduled (не назначен), scheduled (назначен), collected (получен), uploaded (загружен)';

-- Set default status to not_scheduled
ALTER TABLE public.analysis_bookings 
ALTER COLUMN status SET DEFAULT 'not_scheduled';

-- Update existing records to new status format
UPDATE public.analysis_bookings 
SET status = 'scheduled' 
WHERE status = 'pending';

UPDATE public.analysis_bookings 
SET status = 'not_scheduled' 
WHERE status NOT IN ('scheduled', 'collected', 'uploaded');