
-- ============================================================
-- 1) Клинические веса биомаркеров (aging_weight)
--    Значения — из спецификации Biomarker Health Engine v1.0.
-- ============================================================

-- Energy_Recovery ------------------------------------------------
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'ALB';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'GLU';
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'INS';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'HOMA-IR';
UPDATE biomarkers SET aging_weight = 2.3 WHERE code = 'Caro';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'HbA1c';
UPDATE biomarkers SET aging_weight = 1.3 WHERE code = 'LDH';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'Mg';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'B12';
UPDATE biomarkers SET aging_weight = 1.7 WHERE code = 'B9';
UPDATE biomarkers SET aging_weight = 1.6 WHERE code = 'Zn';
UPDATE biomarkers SET aging_weight = 1.6 WHERE code = 'Se';
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'CoQ10';
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'GSH';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'LACT';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'MDA';

-- Inflammation_Immunity ------------------------------------------
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'Hb';
UPDATE biomarkers SET aging_weight = 1.3 WHERE code = 'HCT';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'RBC';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'MCV';
UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'MCH';
UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'MCHC';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'RDW';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'PLT';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'MPV';

UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'WBC';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'NEUT';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'NEUT-ABS';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'LYMPH';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'LYMPH-ABS';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'MONO';
UPDATE biomarkers SET aging_weight = 1.3 WHERE code = 'MONO-ABS';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'EOS';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'EOS-ABS';
UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'BASO';
UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'BASO-ABS';

UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'ESR';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'hs-CRP';

UPDATE biomarkers SET aging_weight = 1.7 WHERE code = 'IgG';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'IgM';

UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'IL-6';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'TNF-α';

-- Cardiovascular -------------------------------------------------
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'TC';
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'LDL';
UPDATE biomarkers SET aging_weight = 2.3 WHERE code = 'HDL';
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'TG';
UPDATE biomarkers SET aging_weight = 1.7 WHERE code = 'VLDL';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'non-HDL';

UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'AI';

UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'ApoA1';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'ApoB';
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'ApoB/A1';

UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'Lp(a)';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'HCY';

UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'FERR';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'CK';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'FIB';

UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'PT';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'PT-Q';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'INR';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'APTT';

UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'Fe';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'Cu';

UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'hs-TnI';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'NT-proBNP';

-- Metabolism_Detox ----------------------------------------------
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'ALT';
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'AST';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'GGT';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'ALP';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'BIL';
UPDATE biomarkers SET aging_weight = 1.3 WHERE code = 'TP';

UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'CREA';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'GFR';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'UREA';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'UA';

UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'ACR';

UPDATE biomarkers SET aging_weight = 1.7 WHERE code = 'Na';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'K';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'Cl';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'Ca';

UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'TRANSF';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'TSAT';

UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'CREA-U';
UPDATE biomarkers SET aging_weight = 3.0 WHERE code = 'MAU';

UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'pH-U';
UPDATE biomarkers SET aging_weight = 1.0 WHERE code = 'SG';
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'PRO-U';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'GLU-U';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'KET-U';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'BIL-U';
UPDATE biomarkers SET aging_weight = 1.2 WHERE code = 'UBG';

UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'HB-U';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'NIT-U';
UPDATE biomarkers SET aging_weight = 2.3 WHERE code = 'LEU-U';
UPDATE biomarkers SET aging_weight = 2.3 WHERE code = 'LEU-EST-U';

UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'RBC-U';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'ERY-RXN-U';

UPDATE biomarkers SET aging_weight = 0.5 WHERE code = 'EPI-SQ-U';
UPDATE biomarkers SET aging_weight = 0.7 WHERE code = 'EPI-TR-U';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'EPI-REN-U';

UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'CYL-HYA-U';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'CYL-PATH-U';

UPDATE biomarkers SET aging_weight = 0.8 WHERE code = 'SALT-U';
UPDATE biomarkers SET aging_weight = 2.0 WHERE code = 'BACT-U';
UPDATE biomarkers SET aging_weight = 1.5 WHERE code = 'YEAST-U';
UPDATE biomarkers SET aging_weight = 0.5 WHERE code = 'MUC-U';

-- Endocrine_Stress ----------------------------------------------
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'TSH';
UPDATE biomarkers SET aging_weight = 2.8 WHERE code = 'fT4';
UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'fT3';

UPDATE biomarkers SET aging_weight = 2.0 WHERE code = '25-OH D';

UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'TEST';
UPDATE biomarkers SET aging_weight = 1.8 WHERE code = 'SHBG';
UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'FAI';

UPDATE biomarkers SET aging_weight = 2.2 WHERE code = 'DHEA-S';
UPDATE biomarkers SET aging_weight = 2.3 WHERE code = 'CORT';

UPDATE biomarkers SET aging_weight = 2.5 WHERE code = 'IGF-1';

-- ============================================================
-- 2) Веса систем — health_model_settings.system_weights
-- ============================================================
INSERT INTO public.health_model_settings (key, value)
VALUES (
  'system_weights',
  jsonb_build_object(
    'cardiovascular', 1.30,
    'metabolism',     1.30,
    'inflammation',   1.20,
    'energy',         1.10,
    'endocrine',      1.10
  )
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
