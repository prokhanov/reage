-- 1. дубликат карточки фосфолипидов
DELETE FROM public.medication_dictionary WHERE inn = 'Фосфолипиды';

-- 2. одинаковые бренды у разных веществ -> оставляем у ведущего компонента
UPDATE public.medication_dictionary
SET brand_names = array_remove(brand_names, 'Кордафлекс'),
    search_terms = array_remove(search_terms, 'кордафлекс')
WHERE inn = 'амлодипин';

UPDATE public.medication_dictionary
SET brand_names = array_remove(array_remove(brand_names, 'Мильгамма'), 'Комбилипен'),
    search_terms = array_remove(array_remove(search_terms, 'мильгамма'), 'комбилипен')
WHERE inn = 'Цианокобаламин';

UPDATE public.medication_dictionary
SET brand_names = array_remove(array_remove(array_remove(array_remove(brand_names, 'Ангиовит'), 'Магне B6'), 'Магнелис B6'), 'Магнефар B6'),
    search_terms = array_remove(array_remove(array_remove(array_remove(search_terms, 'ангиовит'), 'магне b6'), 'магнелис b6'), 'магнефар b6')
WHERE inn = 'Пиридоксин';

UPDATE public.medication_dictionary
SET brand_names = array_remove(array_remove(brand_names, 'Фосфоглив'), 'Фосфоглив Форте'),
    search_terms = array_remove(array_remove(search_terms, 'фосфоглив'), 'фосфоглив форте')
WHERE inn = 'Глицирризиновая кислота';

-- 3. популярные синонимы, которых не хватало
UPDATE public.medication_dictionary
SET brand_names = array(SELECT DISTINCT unnest(brand_names || ARRAY['Аспирин'])),
    search_terms = array(SELECT DISTINCT unnest(search_terms || ARRAY['аспирин','аспирин кардио','аск','ацетилсалициловая кислота']))
WHERE inn = 'ацетилсалициловая кислота';

UPDATE public.medication_dictionary
SET search_terms = array(SELECT DISTINCT unnest(search_terms || ARRAY['омега-3','омега 3','омега3','рыбий жир','fish oil','epa dha','пнжк']))
WHERE inn = 'омега-3 жирные кислоты';

UPDATE public.medication_dictionary
SET search_terms = array(SELECT DISTINCT unnest(search_terms || ARRAY['витамин д3','витамин d3','вит д3','витамин д','витамин d','холекальциферол','колекальциферол','д3','d3']))
WHERE inn = 'колекальциферол';

UPDATE public.medication_dictionary
SET brand_names = array(SELECT DISTINCT unnest(brand_names || ARRAY['Магне B6','Магнефар B6'])),
    search_terms = array(SELECT DISTINCT unnest(search_terms || ARRAY['магний b6','магний в6','магне b6','магнелис b6','магнефар b6','магний','магния цитрат','магне в6']))
WHERE inn = 'магния цитрат';

UPDATE public.medication_dictionary
SET search_terms = array(SELECT DISTINCT unnest(search_terms || ARRAY['нифедипин','кордафлекс','кордафлекс ретард']))
WHERE inn = 'нифедипин';