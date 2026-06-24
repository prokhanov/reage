-- 1) Hook the existing function to analyses inserts
DROP TRIGGER IF EXISTS disable_demo_mode_on_first_analysis_trg ON public.analyses;
CREATE TRIGGER disable_demo_mode_on_first_analysis_trg
AFTER INSERT ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.disable_demo_mode_on_first_analysis();

-- 2) One-off cleanup: turn off demo mode for users who already have analyses
UPDATE public.profiles p
SET demo_mode_enabled = false
WHERE demo_mode_enabled = true
  AND EXISTS (SELECT 1 FROM public.analyses a WHERE a.user_id = p.id);