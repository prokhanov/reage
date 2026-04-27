DELETE FROM public.prescriptions
WHERE id = 'c9310548-1c45-4b6e-98b4-4a3f689bf0a2'
   OR (
     name IS NOT NULL
     AND form IS NOT NULL
     AND lower(trim(name)) IN ('нутрицевтики','витамины','добавки','препараты','минералы','бады','нутрицевтика')
   );