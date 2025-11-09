-- Create trigger to automatically set next_analysis_date when status changes to 'collected'
DROP TRIGGER IF EXISTS on_booking_status_change ON analysis_bookings;

CREATE TRIGGER on_booking_status_change
  BEFORE UPDATE ON analysis_bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_next_analysis_booking();