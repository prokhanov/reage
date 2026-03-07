
-- 1. Add missing biomarkers

-- Индекс Каро (Caro Index = GLU/INS, lower is worse)
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, normal_min, critical_min,
  description)
VALUES ('Caro', 'Индекс Каро', 'Энергия и восстановление', 'индекс', 16, 0.8, 'general',
  0.40, 0.33, 0.25,
  'Соотношение глюкозы к инсулину. Показатель инсулинорезистентности.');

-- Анти-ТПО (lower is better, one-sided)
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_max, normal_max, critical_max,
  optimal_min, normal_min, critical_min,
  description)
VALUES ('Anti-TPO', 'Антитела к тиреопероксидазе', 'Эндокринная и стрессовая система', 'МЕ/мл', 82, 1.0, 'general',
  1.0, 5.6, 34.0,
  0, 0, 0,
  'Маркер аутоиммунного поражения щитовидной железы.');

-- Антитела к рецептору ТТГ (lower is better)
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_max, normal_max, critical_max,
  optimal_min, normal_min, critical_min,
  description)
VALUES ('TRAb', 'Антитела к рецептору ТТГ', 'Эндокринная и стрессовая система', 'МЕ/л', 83, 1.0, 'general',
  1.0, 1.75, 3.0,
  0, 0, 0,
  'Маркер болезни Грейвса и аутоиммунного тиреотоксикоза.');

-- MCHC
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, optimal_max, normal_min, normal_max, critical_min, critical_max,
  description)
VALUES ('MCHC', 'Средняя концентрация гемоглобина в эритроците', 'Воспалительная и иммунная система', 'г/л', 49, 0.7, 'general',
  330, 350, 320, 360, 300, 380,
  'Показатель насыщенности эритроцитов гемоглобином.');

-- RDW
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, optimal_max, normal_min, normal_max, critical_min, critical_max,
  description)
VALUES ('RDW', 'Ширина распределения эритроцитов', 'Воспалительная и иммунная система', '%', 50, 0.8, 'general',
  11.5, 13.5, 11.5, 14.5, 10.0, 18.0,
  'Показатель вариабельности размеров эритроцитов (анизоцитоз).');

-- MPV
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, optimal_max, normal_min, normal_max, critical_min, critical_max,
  description)
VALUES ('MPV', 'Средний объём тромбоцита', 'Воспалительная и иммунная система', 'фл', 51, 0.5, 'general',
  8.0, 10.0, 7.4, 10.4, 6.0, 13.0,
  'Показатель размера тромбоцитов, связан с их функциональной активностью.');

-- PCT (Тромбокрит) - using PCT-t to avoid confusion with other PCT
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, optimal_max, normal_min, normal_max, critical_min, critical_max,
  description)
VALUES ('PCT-t', 'Тромбокрит', 'Воспалительная и иммунная система', '%', 52, 0.4, 'general',
  0.20, 0.35, 0.15, 0.40, 0.10, 0.50,
  'Доля объёма крови, занимаемая тромбоцитами.');

-- PDW
INSERT INTO biomarkers (code, name, category, unit, display_order, aging_weight, range_mode,
  optimal_min, optimal_max, normal_min, normal_max, critical_min, critical_max,
  description)
VALUES ('PDW', 'Ширина распределения тромбоцитов', 'Воспалительная и иммунная система', '%', 53, 0.4, 'general',
  10.0, 16.0, 10.0, 18.0, 8.0, 22.0,
  'Показатель вариабельности размеров тромбоцитов.');

-- 2. Create analysis for Алина Дарбинян
INSERT INTO analyses (id, user_id, date, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'd8d632d4-1d79-4cf5-bbaf-4c377ebbe6eb',
  '2026-03-07',
  'on_review'
);

-- 3. Insert biomarker values
-- Энергия и восстановление
INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '321738cd-5eeb-4d67-90dc-60e40c381b7b', 4.17),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '86e5c4f0-6d8b-4244-bf08-ece31c7b6581', 7.81),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a744b5dd-7271-4323-8427-019d20d957ef', 1.45);

INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 0.53 FROM biomarkers WHERE code = 'Caro';

-- Сердечно-сосудистая система
INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '1342fd0a-225a-458a-b75d-d8308be52595', 6.6),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '4c64db9a-4d3e-4d08-a192-9abdd2e0ca04', 3.9),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '92841082-8398-4da3-b69a-da819aaa52bb', 2.44),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '3c579818-a4e2-467c-9496-2317602be696', 1.3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '1637ca06-8c0c-47fa-919f-c139566f373b', 4.2);

-- Эндокринная
INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '27d43522-8f34-40fd-8411-4fa1481404dd', 2.33),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '42b8ea52-c3f0-43f8-a627-61003b7fac1b', 11.38);

INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 0.52 FROM biomarkers WHERE code = 'Anti-TPO';
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 1.91 FROM biomarkers WHERE code = 'TRAb';

-- Воспалительная и иммунная система
INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '4cfb2f47-5c45-4d2d-b996-8462ae2c8ddf', 1.02),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'eae8a96a-1dac-43b8-b516-f83ce591f068', 3.64),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '62137e53-1c24-4be0-95ec-c731ddf0aa21', 4.45),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '47b616dd-6ec1-4b13-b743-5d895c684a18', 134),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '6702dcdb-c3cd-425d-9b9b-db55ed385bef', 255),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b3b4424c-4ea0-4efa-ba9e-19a9c5ad4107', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '9e3e1b1b-f9bf-4214-9421-0b8665002b69', 30);

-- Absolute diff values with unit_override
INSERT INTO analysis_values (analysis_id, biomarker_id, value, unit_override) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd881af63-45a9-41a4-8c66-b0eb58efe3b9', 1.96, '×10⁹/л'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f5852ccf-6bb7-40c5-8806-5cdf92689800', 1.40, '×10⁹/л'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2ccff155-10bc-4029-b876-bb334f4b2608', 0.35, '×10⁹/л'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '01ba7712-3c66-4476-94aa-123a03ad88ed', 0.15, '×10⁹/л'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '8aded925-1c48-4f7d-befb-cd801f3361ea', 0.04, '×10⁹/л');

-- New biomarkers values
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 335 FROM biomarkers WHERE code = 'MCHC';
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 12.5 FROM biomarkers WHERE code = 'RDW';
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 10.5 FROM biomarkers WHERE code = 'MPV';
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 0.25 FROM biomarkers WHERE code = 'PCT-t';
INSERT INTO analysis_values (analysis_id, biomarker_id, value)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 13.5 FROM biomarkers WHERE code = 'PDW';

-- Обмен веществ и детоксикация
INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e404b31a-61e4-48d8-a29d-1e9c37a84747', 33.7),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'af61785c-0031-4a94-9c6e-2ad31fe7fc98', 30.9);
