-- Recompute calculated biomarkers for Алина Дарбинян (analysis ffa1578f)
-- Inputs: GLU=4.72, INS=3.1, TC=3, HDL=1.9, TG=0.84, HCT=43.34, RBC=4.54

-- HOMA-IR = (4.72 * 3.1) / 22.5 = 0.65
UPDATE public.analysis_values SET value = 0.65 WHERE id = 'fa93d8a3-8b70-462a-bf23-a80f4009ac91';

-- Caro = 4.72 / 3.1 = 1.52
UPDATE public.analysis_values SET value = 1.52 WHERE id = 'e7d2d944-ce96-4985-b737-123f650ff8b7';

-- VLDL = 0.84 / 2.2 = 0.38
UPDATE public.analysis_values SET value = 0.38 WHERE id = 'c49de411-aea6-4c12-816a-a6e2dd4fe65f';

-- LDL (Friedewald) = 3 - 1.9 - 0.84/2.2 = 0.72
UPDATE public.analysis_values SET value = 0.72 WHERE id = '37c22b8b-69a2-4f7e-ad1e-ab633d13e50d';

-- AI = (3 - 1.9) / 1.9 = 0.58
UPDATE public.analysis_values SET value = 0.58 WHERE id = '10236a41-4392-45ab-98e6-e70e01ea6976';

-- MCV = (43.34 * 10) / 4.54 = 95.5
UPDATE public.analysis_values SET value = 95.5 WHERE id = 'b5ecd709-4a99-420b-8321-3593208ef9f6';

-- MCH and MCHC require HGB which is missing — delete to avoid showing incorrect values
DELETE FROM public.analysis_values WHERE id IN (
  '5e2c8198-8826-41e9-99b5-a3dec7404c46', -- MCH
  '31ecc036-a4fa-41e1-b1bd-2b6fa4268601'  -- MCHC
);