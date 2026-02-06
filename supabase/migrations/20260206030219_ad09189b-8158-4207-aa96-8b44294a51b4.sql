-- Create default slot settings table
CREATE TABLE public.default_slot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_slot text NOT NULL,
  total_capacity int NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(day_of_week, time_slot)
);

-- Enable RLS
ALTER TABLE public.default_slot_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read defaults
CREATE POLICY "Anyone can read default slot settings"
ON public.default_slot_settings FOR SELECT
USING (true);

-- Policy: Only admins/superadmins can modify
CREATE POLICY "Admins can modify default slot settings"
ON public.default_slot_settings FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_default_slot_settings_updated_at
BEFORE UPDATE ON public.default_slot_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Populate with default values (7 days × 9 time slots = 63 records)
-- 0=Sunday, 1=Monday, ..., 6=Saturday
INSERT INTO public.default_slot_settings (day_of_week, time_slot, total_capacity)
SELECT dow, time_slot, 3
FROM generate_series(0, 6) AS dow
CROSS JOIN unnest(ARRAY['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']) AS time_slot;

-- Create function to get slots for date range (merges virtual + real)
CREATE OR REPLACE FUNCTION public.get_slots_for_date_range(
  p_start_date date,
  p_end_date date,
  p_existing_slot_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  date date,
  time_slot text,
  total_capacity int,
  booked_count int,
  is_active boolean,
  is_override boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date;
BEGIN
  FOR v_current_date IN SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    RETURN QUERY
    SELECT 
      COALESCE(s.id, ('00000000-0000-0000-0000-' || lpad(to_char(v_current_date, 'YYYYMMDD') || lpad(replace(d.time_slot, ':', ''), 4, '0'), 12, '0'))::uuid) as id,
      v_current_date as date,
      d.time_slot,
      COALESCE(s.total_capacity, d.total_capacity) as total_capacity,
      COALESCE(s.booked_count, 0) as booked_count,
      COALESCE(s.is_active, d.is_active) as is_active,
      (s.id IS NOT NULL) as is_override
    FROM default_slot_settings d
    LEFT JOIN availability_slots s 
      ON s.date = v_current_date AND s.time_slot = d.time_slot
    WHERE d.day_of_week = EXTRACT(DOW FROM v_current_date)::int
      AND d.is_active = true
    ORDER BY d.time_slot;
  END LOOP;
END;
$$;

-- Update book_analysis_slot to handle virtual slots
CREATE OR REPLACE FUNCTION public.book_analysis_slot(
  p_slot_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_time_slot text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_default RECORD;
  v_new_slot_id uuid;
  v_day_of_week int;
BEGIN
  -- If p_slot_id provided, try to find existing slot
  IF p_slot_id IS NOT NULL THEN
    SELECT * INTO v_slot
    FROM availability_slots
    WHERE id = p_slot_id
    FOR UPDATE;
  END IF;

  -- If slot not found but date/time provided, try to create from defaults
  IF NOT FOUND AND p_date IS NOT NULL AND p_time_slot IS NOT NULL THEN
    v_day_of_week := EXTRACT(DOW FROM p_date)::int;
    
    -- Check if there's already a slot for this date/time
    SELECT * INTO v_slot
    FROM availability_slots
    WHERE date = p_date AND time_slot = p_time_slot
    FOR UPDATE;
    
    IF NOT FOUND THEN
      -- Get default settings
      SELECT * INTO v_default 
      FROM default_slot_settings 
      WHERE day_of_week = v_day_of_week AND time_slot = p_time_slot;
      
      IF NOT FOUND OR NOT v_default.is_active THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Slot not available for this day/time'
        );
      END IF;
      
      -- Check capacity
      IF v_default.total_capacity < 1 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Slot has no capacity'
        );
      END IF;
      
      -- Create new slot with first booking
      INSERT INTO availability_slots (date, time_slot, total_capacity, booked_count, is_active)
      VALUES (p_date, p_time_slot, v_default.total_capacity, 1, true)
      RETURNING id INTO v_new_slot_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'slot_id', v_new_slot_id,
        'booked_count', 1,
        'total_capacity', v_default.total_capacity
      );
    END IF;
  END IF;

  -- If still not found, return error
  IF v_slot IS NULL THEN
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
  WHERE id = v_slot.id;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', v_slot.id,
    'booked_count', v_slot.booked_count + 1,
    'total_capacity', v_slot.total_capacity
  );
END;
$$;

-- Update cancel_booking to optionally clean up default slots
CREATE OR REPLACE FUNCTION public.cancel_booking(p_slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_default RECORD;
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

  -- Check if slot should be deleted (back to default state)
  SELECT * INTO v_default 
  FROM default_slot_settings 
  WHERE day_of_week = EXTRACT(DOW FROM v_slot.date)::int 
    AND time_slot = v_slot.time_slot;
  
  IF FOUND AND v_slot.booked_count - 1 = 0 
     AND v_slot.total_capacity = v_default.total_capacity 
     AND v_slot.is_active = v_default.is_active THEN
    -- Slot is back to default state, can be deleted
    DELETE FROM availability_slots WHERE id = p_slot_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'booked_count', v_slot.booked_count - 1,
    'total_capacity', v_slot.total_capacity
  );
END;
$$;

-- Function to upsert slot override (for admin changes)
CREATE OR REPLACE FUNCTION public.upsert_slot_override(
  p_date date,
  p_time_slot text,
  p_total_capacity int DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_default RECORD;
  v_new_capacity int;
  v_new_active boolean;
  v_slot_id uuid;
BEGIN
  -- Get default settings
  SELECT * INTO v_default 
  FROM default_slot_settings 
  WHERE day_of_week = EXTRACT(DOW FROM p_date)::int AND time_slot = p_time_slot;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No default settings for this day/time');
  END IF;
  
  -- Determine new values
  v_new_capacity := COALESCE(p_total_capacity, v_default.total_capacity);
  v_new_active := COALESCE(p_is_active, v_default.is_active);
  
  -- Check if slot exists
  SELECT * INTO v_slot FROM availability_slots 
  WHERE date = p_date AND time_slot = p_time_slot
  FOR UPDATE;
  
  IF FOUND THEN
    -- Check if we can reduce capacity
    IF v_new_capacity < v_slot.booked_count THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Cannot reduce capacity below booked count'
      );
    END IF;
    
    -- Update existing
    UPDATE availability_slots 
    SET total_capacity = v_new_capacity, is_active = v_new_active
    WHERE id = v_slot.id
    RETURNING id INTO v_slot_id;
  ELSE
    -- Create new override
    INSERT INTO availability_slots (date, time_slot, total_capacity, booked_count, is_active)
    VALUES (p_date, p_time_slot, v_new_capacity, 0, v_new_active)
    RETURNING id INTO v_slot_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'slot_id', v_slot_id,
    'total_capacity', v_new_capacity,
    'is_active', v_new_active
  );
END;
$$;

-- Function to reset slot to defaults (delete override)
CREATE OR REPLACE FUNCTION public.reset_slot_to_default(
  p_date date,
  p_time_slot text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  SELECT * INTO v_slot FROM availability_slots 
  WHERE date = p_date AND time_slot = p_time_slot;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Slot already at default');
  END IF;
  
  IF v_slot.booked_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot reset slot with active bookings'
    );
  END IF;
  
  DELETE FROM availability_slots WHERE id = v_slot.id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Slot reset to default');
END;
$$;