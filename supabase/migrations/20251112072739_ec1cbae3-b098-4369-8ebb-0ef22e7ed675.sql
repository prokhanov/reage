-- Add missing biomarkers for demo data

-- Энергия и восстановление
INSERT INTO biomarkers (code, name, category, unit, normal_min, normal_max, display_order) VALUES
('Ретикулоциты', 'Ретикулоциты', 'Энергия и восстановление', '%', 0.5, 2.0, 9),
('Гаптоглобин', 'Гаптоглобин', 'Энергия и восстановление', 'г/л', 0.3, 2.0, 10),
('ОЖСС (TIBC)', 'ОЖСС (TIBC)', 'Энергия и восстановление', 'мкмоль/л', 45, 75, 11),
('Насыщение трансферрина (%)', 'Насыщение трансферрина (%)', 'Энергия и восстановление', '%', 20, 50, 12)
ON CONFLICT (code) DO NOTHING;

-- Воспалительная и иммунная система
INSERT INTO biomarkers (code, name, category, unit, normal_min, normal_max, display_order) VALUES
('IgA', 'IgA', 'Воспалительная и иммунная система', 'г/л', 0.7, 4.0, 40),
('IgE', 'IgE', 'Воспалительная и иммунная система', 'МЕ/мл', 0, 100, 41),
('CD3+ (T-лимфоциты)', 'CD3+ (T-лимфоциты)', 'Воспалительная и иммунная система', '%', 55, 80, 42),
('CD4+ (T-хелперы)', 'CD4+ (T-хелперы)', 'Воспалительная и иммунная система', '%', 31, 60, 43),
('CD8+ (T-супрессоры)', 'CD8+ (T-супрессоры)', 'Воспалительная и иммунная система', '%', 12, 42, 44),
('CD19+ (B-лимфоциты)', 'CD19+ (B-лимфоциты)', 'Воспалительная и иммунная система', '%', 6, 19, 45),
('NK-клетки (CD16+CD56+)', 'NK-клетки (CD16+CD56+)', 'Воспалительная и иммунная система', '%', 7, 31, 46)
ON CONFLICT (code) DO NOTHING;

-- Сердечно-сосудистая система
INSERT INTO biomarkers (code, name, category, unit, normal_min, normal_max, display_order) VALUES
('NT-proBNP', 'NT-proBNP', 'Сердечно-сосудистая система', 'пг/мл', 0, 125, 60),
('Тропонин I', 'Тропонин I', 'Сердечно-сосудистая система', 'нг/мл', 0, 0.04, 61),
('Миоглобин', 'Миоглобин', 'Сердечно-сосудистая система', 'нг/мл', 28, 72, 62),
('Креатинкиназа (КФК)', 'Креатинкиназа (КФК)', 'Сердечно-сосудистая система', 'Ед/л', NULL, NULL, 63)
ON CONFLICT (code) DO NOTHING;

-- Update male/female specific ranges for КФК
UPDATE biomarkers SET
  normal_min_male = 39,
  normal_max_male = 308,
  normal_min_female = 26,
  normal_max_female = 192
WHERE code = 'Креатинкиназа (КФК)';

-- Эндокринная и стрессовая система
INSERT INTO biomarkers (code, name, category, unit, normal_min, normal_max, display_order) VALUES
('Т3 свободный', 'Т3 свободный', 'Эндокринная и стрессовая система', 'пмоль/л', 2.6, 5.7, 80),
('IGF-1', 'IGF-1', 'Эндокринная и стрессовая система', 'нг/мл', NULL, NULL, 81)
ON CONFLICT (code) DO NOTHING;

-- Update age-dependent ranges for IGF-1
UPDATE biomarkers SET
  age_ranges = '{
    "male": [
      {"age_from": 21, "age_to": 25, "min": 116, "max": 358},
      {"age_from": 26, "age_to": 30, "min": 117, "max": 329},
      {"age_from": 31, "age_to": 35, "min": 115, "max": 307},
      {"age_from": 36, "age_to": 40, "min": 109, "max": 284},
      {"age_from": 41, "age_to": 45, "min": 101, "max": 267},
      {"age_from": 46, "age_to": 50, "min": 94, "max": 252},
      {"age_from": 51, "age_to": 55, "min": 87, "max": 238},
      {"age_from": 56, "age_to": 60, "min": 81, "max": 225},
      {"age_from": 61, "age_to": 65, "min": 75, "max": 212},
      {"age_from": 66, "age_to": 120, "min": 69, "max": 200}
    ],
    "female": [
      {"age_from": 21, "age_to": 25, "min": 116, "max": 358},
      {"age_from": 26, "age_to": 30, "min": 117, "max": 329},
      {"age_from": 31, "age_to": 35, "min": 115, "max": 307},
      {"age_from": 36, "age_to": 40, "min": 109, "max": 284},
      {"age_from": 41, "age_to": 45, "min": 101, "max": 267},
      {"age_from": 46, "age_to": 50, "min": 94, "max": 252},
      {"age_from": 51, "age_to": 55, "min": 87, "max": 238},
      {"age_from": 56, "age_to": 60, "min": 81, "max": 225},
      {"age_from": 61, "age_to": 65, "min": 75, "max": 212},
      {"age_from": 66, "age_to": 120, "min": 69, "max": 200}
    ]
  }'::jsonb
WHERE code = 'IGF-1';