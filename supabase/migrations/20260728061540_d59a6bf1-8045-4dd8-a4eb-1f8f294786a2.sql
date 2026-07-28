update public.medication_dictionary
set brand_names = array(select distinct unnest(coalesce(brand_names,'{}') || array['Тирзетта'])),
    search_terms = array(select distinct unnest(coalesce(search_terms,'{}') || array['тирзетта','tirzetta'])),
    updated_at = now()
where inn_en = 'tirzepatide';