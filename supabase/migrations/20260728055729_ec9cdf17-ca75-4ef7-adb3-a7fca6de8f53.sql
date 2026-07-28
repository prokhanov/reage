CREATE TABLE public.medication_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn text NOT NULL,
  inn_en text,
  drug_class text NOT NULL DEFAULT '',
  brand_names text[] NOT NULL DEFAULT '{}',
  search_terms text[] NOT NULL DEFAULT '{}',
  lab_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  clinical_note text,
  source text NOT NULL DEFAULT 'ai_seed',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX medication_dictionary_inn_key ON public.medication_dictionary (lower(inn));
CREATE INDEX medication_dictionary_search_terms_idx ON public.medication_dictionary USING GIN (search_terms);

GRANT SELECT ON public.medication_dictionary TO authenticated;
GRANT ALL ON public.medication_dictionary TO service_role;
ALTER TABLE public.medication_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read medication dictionary"
  ON public.medication_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage medication dictionary"
  ON public.medication_dictionary FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER medication_dictionary_updated_at
  BEFORE UPDATE ON public.medication_dictionary
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.medication_unresolved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  normalized text NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  resolved boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX medication_unresolved_normalized_key ON public.medication_unresolved (normalized);

GRANT SELECT ON public.medication_unresolved TO authenticated;
GRANT ALL ON public.medication_unresolved TO service_role;
ALTER TABLE public.medication_unresolved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read unresolved medications"
  ON public.medication_unresolved FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins can manage unresolved medications"
  ON public.medication_unresolved FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));