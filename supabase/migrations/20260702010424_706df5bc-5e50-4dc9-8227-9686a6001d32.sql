
-- Билирубин: в норме отсутствует
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=8.5, updated_at=now() WHERE code='BIL-U';

-- Гемоглобин мочи: в норме отсутствует
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='HB-U';

-- Дрожжеподобные клетки: единичные допустимы
UPDATE public.biomarkers SET normal_min=0, normal_max=1, optimal_min=0, optimal_max=0, critical_min=0, critical_max=10, updated_at=now() WHERE code='YEAST-U';

-- Кристаллы солей: единичные допустимы
UPDATE public.biomarkers SET normal_min=0, normal_max=5, optimal_min=0, optimal_max=1, critical_min=0, critical_max=20, updated_at=now() WHERE code='SALT-U';

-- Лейкоцитарная эстераза: качественный
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='LEU-EST-U';

-- Нитриты: качественный (положит. = ИМП)
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='NIT-U';

-- Реакция на эритроциты: качественный
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='ERY-RXN-U';

-- Слизь: небольшое количество нормально
UPDATE public.biomarkers SET normal_min=0, normal_max=10, optimal_min=0, optimal_max=3, critical_min=0, critical_max=50, updated_at=now() WHERE code='MUC-U';

-- Цилиндры гиалиновые: единичные допустимы
UPDATE public.biomarkers SET normal_min=0, normal_max=1, optimal_min=0, optimal_max=0, critical_min=0, critical_max=5, updated_at=now() WHERE code='CYL-HYA-U';

-- Цилиндры патологические: любое присутствие — патология
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='CYL-PATH-U';

-- Эпителий переходный: единичные допустимы
UPDATE public.biomarkers SET normal_min=0, normal_max=1, optimal_min=0, optimal_max=0, critical_min=0, critical_max=5, updated_at=now() WHERE code='EPI-TR-U';

-- Эпителий почечный: в норме отсутствует
UPDATE public.biomarkers SET normal_min=0, normal_max=0, optimal_min=0, optimal_max=0, critical_min=0, critical_max=1, updated_at=now() WHERE code='EPI-REN-U';

-- Эпителий плоский: добавляем критический порог
UPDATE public.biomarkers SET critical_min=0, critical_max=25, updated_at=now() WHERE code='EPI-SQ-U';
