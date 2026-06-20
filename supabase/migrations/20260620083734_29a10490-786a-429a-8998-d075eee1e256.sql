
ALTER TABLE public.analysis_bookings
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS lab_location_id uuid REFERENCES public.lab_locations(id) ON DELETE SET NULL;

ALTER TABLE public.analysis_bookings
  DROP CONSTRAINT IF EXISTS analysis_bookings_location_type_check;
ALTER TABLE public.analysis_bookings
  ADD CONSTRAINT analysis_bookings_location_type_check
  CHECK (location_type IN ('home','clinic'));

CREATE INDEX IF NOT EXISTS idx_analysis_bookings_lab_location_id
  ON public.analysis_bookings(lab_location_id);
