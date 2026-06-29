CREATE OR REPLACE FUNCTION public.disable_demo_mode_on_booking_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'uploaded' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.profiles
    SET demo_mode_enabled = false
    WHERE id = NEW.user_id AND demo_mode_enabled = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS disable_demo_mode_on_booking_uploaded_trg ON public.analysis_bookings;
CREATE TRIGGER disable_demo_mode_on_booking_uploaded_trg
AFTER INSERT OR UPDATE OF status ON public.analysis_bookings
FOR EACH ROW
EXECUTE FUNCTION public.disable_demo_mode_on_booking_uploaded();

UPDATE public.profiles p
SET demo_mode_enabled = false
WHERE demo_mode_enabled = true
  AND EXISTS (
    SELECT 1 FROM public.analysis_bookings b
    WHERE b.user_id = p.id AND b.status = 'uploaded'
  );