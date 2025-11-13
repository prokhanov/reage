-- Create availability_slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  total_capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_capacity CHECK (total_capacity > 0),
  CONSTRAINT valid_booked_count CHECK (booked_count >= 0 AND booked_count <= total_capacity),
  CONSTRAINT unique_slot UNIQUE (date, time_slot)
);

-- Add slot_id to analysis_bookings
ALTER TABLE public.analysis_bookings 
ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON public.availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_active ON public.availability_slots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analysis_bookings_slot_id ON public.analysis_bookings(slot_id);

-- Enable RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_slots
CREATE POLICY "Anyone can view active slots with availability"
  ON public.availability_slots
  FOR SELECT
  USING (is_active = true AND booked_count < total_capacity);

CREATE POLICY "Superadmins can view all slots"
  ON public.availability_slots
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Staff can view all slots"
  ON public.availability_slots
  FOR SELECT
  USING (NOT is_patient(auth.uid()));

CREATE POLICY "Superadmins can manage slots"
  ON public.availability_slots
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER availability_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function: book_analysis_slot
CREATE OR REPLACE FUNCTION public.book_analysis_slot(p_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Lock the slot row for update
  SELECT * INTO v_slot
  FROM availability_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  -- Check if slot exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot not found'
    );
  END IF;

  -- Check if slot is active
  IF NOT v_slot.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot is not active'
    );
  END IF;

  -- Check if slot has capacity
  IF v_slot.booked_count >= v_slot.total_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot is fully booked'
    );
  END IF;

  -- Increment booked_count
  UPDATE availability_slots
  SET booked_count = booked_count + 1
  WHERE id = p_slot_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'booked_count', v_slot.booked_count + 1,
    'total_capacity', v_slot.total_capacity
  );
END;
$$;

-- Function: cancel_booking
CREATE OR REPLACE FUNCTION public.cancel_booking(p_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Check if slot exists
  SELECT * INTO v_slot
  FROM availability_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot not found'
    );
  END IF;

  -- Check if there are bookings to cancel
  IF v_slot.booked_count <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No bookings to cancel'
    );
  END IF;

  -- Decrement booked_count
  UPDATE availability_slots
  SET booked_count = booked_count - 1
  WHERE id = p_slot_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'booked_count', v_slot.booked_count - 1,
    'total_capacity', v_slot.total_capacity
  );
END;
$$;

-- Optional: Create availability_templates table for recurring schedules
CREATE TABLE IF NOT EXISTS public.availability_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  time_slots JSONB NOT NULL, -- [{"time": "09:00", "capacity": 2}, ...]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for templates
ALTER TABLE public.availability_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view templates"
  ON public.availability_templates
  FOR SELECT
  USING (NOT is_patient(auth.uid()));

CREATE POLICY "Superadmins can manage templates"
  ON public.availability_templates
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER availability_templates_updated_at
  BEFORE UPDATE ON public.availability_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();