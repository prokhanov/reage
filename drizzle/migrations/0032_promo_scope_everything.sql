ALTER TABLE public.promo_codes DROP CONSTRAINT promo_codes_scope_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_scope_check CHECK (scope = ANY (ARRAY['all','subscriptions','checkups','everything']));
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_checkups_applies_to_check CHECK (checkups_applies_to = ANY (ARRAY['all','specific']));