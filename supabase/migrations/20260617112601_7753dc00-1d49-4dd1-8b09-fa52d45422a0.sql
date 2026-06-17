-- lab_locations: public read of active rows
GRANT SELECT ON public.lab_locations TO anon;
DROP POLICY IF EXISTS "Public can read active lab locations" ON public.lab_locations;
CREATE POLICY "Public can read active lab locations"
  ON public.lab_locations
  FOR SELECT
  TO anon
  USING (is_active = true);

-- lab_map_contexts: public read of enabled contexts
GRANT SELECT ON public.lab_map_contexts TO anon;
DROP POLICY IF EXISTS "Public can read enabled lab map contexts" ON public.lab_map_contexts;
CREATE POLICY "Public can read enabled lab map contexts"
  ON public.lab_map_contexts
  FOR SELECT
  TO anon
  USING (is_enabled = true);