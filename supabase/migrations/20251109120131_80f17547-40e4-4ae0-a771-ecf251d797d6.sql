-- Add next_analysis_date column to analysis_bookings
ALTER TABLE analysis_bookings 
ADD COLUMN next_analysis_date date;

-- Create function to automatically create next booking when status changes to collected
CREATE OR REPLACE FUNCTION create_next_analysis_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create next booking if status changed to 'collected' and next_analysis_date is not set
  IF NEW.status = 'collected' AND OLD.status != 'collected' AND NEW.next_analysis_date IS NULL THEN
    -- Set next_analysis_date to 3 months from booking_date
    NEW.next_analysis_date := NEW.booking_date + INTERVAL '3 months';
    
    -- Create new booking entry for the next analysis
    INSERT INTO analysis_bookings (
      user_id,
      booking_date,
      booking_time,
      address,
      status
    ) VALUES (
      NEW.user_id,
      NEW.next_analysis_date,
      NEW.booking_time,
      NEW.address,
      'not_scheduled'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic next booking creation
CREATE TRIGGER on_booking_collected
  BEFORE UPDATE ON analysis_bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_next_analysis_booking();