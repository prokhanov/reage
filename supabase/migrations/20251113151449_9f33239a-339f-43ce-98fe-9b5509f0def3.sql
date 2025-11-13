-- Drop existing policy that hides fully booked slots
DROP POLICY IF EXISTS "Anyone can view active slots with availability" ON availability_slots;

-- Create new policy that shows all active slots regardless of booking status
CREATE POLICY "Anyone can view all active slots"
ON availability_slots
FOR SELECT
USING (is_active = true);