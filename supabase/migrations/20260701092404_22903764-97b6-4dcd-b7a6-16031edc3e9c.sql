ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false;
ALTER TABLE public.profiles ALTER COLUMN onboarding_completed SET DEFAULT false;