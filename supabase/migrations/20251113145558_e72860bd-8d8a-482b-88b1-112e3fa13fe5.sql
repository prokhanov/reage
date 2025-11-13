-- Allow total_capacity to be 0
ALTER TABLE public.availability_slots DROP CONSTRAINT IF EXISTS valid_capacity;

ALTER TABLE public.availability_slots 
ADD CONSTRAINT valid_capacity CHECK (total_capacity >= 0);