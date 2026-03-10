
-- Trigger: auto-sync profiles.weight when weight_history is inserted
CREATE OR REPLACE FUNCTION public.sync_profile_weight()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET weight = NEW.weight
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_profile_weight
  AFTER INSERT ON public.weight_history
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_weight();
