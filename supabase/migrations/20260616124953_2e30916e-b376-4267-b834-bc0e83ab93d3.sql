
CREATE TABLE public.lab_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'labquest',
  external_id text,
  title text NOT NULL,
  metro text,
  city text,
  address_short text,
  full_address text,
  lat numeric,
  lng numeric,
  phones text[] NOT NULL DEFAULT '{}',
  hours text[] NOT NULL DEFAULT '{}',
  email text,
  page_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX lab_locations_provider_external_id_key
  ON public.lab_locations (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX lab_locations_city_idx ON public.lab_locations (city);
CREATE INDEX lab_locations_metro_idx ON public.lab_locations (metro);
CREATE INDEX lab_locations_provider_idx ON public.lab_locations (provider);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_locations TO authenticated;
GRANT ALL ON public.lab_locations TO service_role;

ALTER TABLE public.lab_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lab locations"
  ON public.lab_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert lab locations"
  ON public.lab_locations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update lab locations"
  ON public.lab_locations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete lab locations"
  ON public.lab_locations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER lab_locations_set_updated_at
  BEFORE UPDATE ON public.lab_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
