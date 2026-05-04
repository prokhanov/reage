-- CREA: привести gender-fallback поля в соответствие с age_ranges
UPDATE public.biomarkers
SET normal_min_female = 53,
    normal_max_female = 97,
    optimal_min_female = 58,
    optimal_max_female = 88,
    critical_min_female = 40,
    critical_max_female = 120,
    normal_min_male = 74,
    normal_max_male = 110,
    optimal_min_male = 80,
    optimal_max_male = 100,
    critical_min_male = 55,
    critical_max_male = 135,
    updated_at = now()
WHERE code = 'CREA';

-- CD8+: исправить логический конфликт (crit_max был ниже normal_max)
UPDATE public.biomarkers
SET normal_min = 19,
    normal_max = 35,
    optimal_min = 22,
    optimal_max = 32,
    critical_min = 8,
    critical_max = 50,
    updated_at = now()
WHERE code = 'CD8+';