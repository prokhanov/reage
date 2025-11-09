-- Create trigger for automatic next_analysis_date creation
CREATE OR REPLACE TRIGGER trigger_create_next_analysis_booking
  BEFORE UPDATE ON public.analysis_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_next_analysis_booking();