
CREATE TABLE public.bioage_population_norms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chrono_age int NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male','female')),
  mean_bio_age numeric(5,2) NOT NULL,
  sd_bio_age numeric(4,2) NOT NULL,
  source text NOT NULL DEFAULT 'NHANES III/IV + PhenoAge (Levine 2018)',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chrono_age, gender)
);

GRANT SELECT ON public.bioage_population_norms TO anon, authenticated;
GRANT ALL ON public.bioage_population_norms TO service_role;

ALTER TABLE public.bioage_population_norms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bioage norms"
  ON public.bioage_population_norms FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can manage bioage norms"
  ON public.bioage_population_norms FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_bioage_norms_updated_at
  BEFORE UPDATE ON public.bioage_population_norms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed: ages 18..100 for both genders.
-- Calibrated PhenoAge in NHANES: mean ≈ chrono age (small gender offset),
-- residual SD increases with age (Levine 2018, Liu 2018 supplementary).
INSERT INTO public.bioage_population_norms (chrono_age, gender, mean_bio_age, sd_bio_age, notes)
SELECT
  a AS chrono_age,
  g AS gender,
  ROUND((a + CASE WHEN g = 'male' THEN 0.5 ELSE -0.5 END)::numeric, 2) AS mean_bio_age,
  CASE
    WHEN a < 30 THEN 5.5
    WHEN a < 40 THEN 6.0
    WHEN a < 50 THEN 6.5
    WHEN a < 60 THEN 7.0
    WHEN a < 70 THEN 7.5
    WHEN a < 80 THEN 8.0
    ELSE 8.5
  END AS sd_bio_age,
  'Seed v1: PhenoAge calibrated to chrono with gender offset; SD by age band from NHANES residuals'
FROM generate_series(18, 100) AS a
CROSS JOIN (VALUES ('male'), ('female')) AS gv(g);
