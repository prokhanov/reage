-- Add assigned_staff_id column to analysis_bookings
ALTER TABLE public.analysis_bookings
ADD COLUMN assigned_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Extend admin_module enum with analysis_bookings
ALTER TYPE admin_module ADD VALUE IF NOT EXISTS 'analysis_bookings';