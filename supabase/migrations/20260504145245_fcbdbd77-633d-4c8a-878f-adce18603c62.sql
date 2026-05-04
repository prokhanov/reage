-- WBC: убираем некорректные возрастные диапазоны (содержали значения от RBC), используем общие нормы
UPDATE public.biomarkers
SET range_mode = 'general',
    age_ranges = NULL,
    updated_at = now()
WHERE code = 'WBC';

-- fT4: убираем некорректные возрастные диапазоны (женские были занижены), используем общие нормы
UPDATE public.biomarkers
SET range_mode = 'general',
    age_ranges = NULL,
    updated_at = now()
WHERE code = 'fT4';