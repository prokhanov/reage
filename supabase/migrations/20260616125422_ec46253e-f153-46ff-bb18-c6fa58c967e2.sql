
DROP INDEX IF EXISTS public.lab_locations_provider_external_id_key;
ALTER TABLE public.lab_locations
  ADD CONSTRAINT lab_locations_provider_external_id_key UNIQUE (provider, external_id);
