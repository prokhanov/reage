-- Update demo_data_templates with 4 analyses over a year
UPDATE demo_data_templates
SET male_data = jsonb_set(
  male_data - 'analysis',
  '{analyses}',
  '[
    {
      "analysis_date": "2024-04-15",
      "biological_age": 50,
      "health_index": 62,
      "lab_name": "Инвитро",
      "note": "Исходное состояние: преддиабет, воспаление",
      "ai_analysis": {
        "aging_rate": 1.11,
        "confidence_score": 85,
        "explanation": "Выявлены маркеры воспаления и нарушения углеводного обмена"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2024-07-15",
      "biological_age": 49,
      "health_index": 66,
      "lab_name": "Инвитро",
      "note": "Начало улучшения после терапии",
      "ai_analysis": {
        "aging_rate": 1.09,
        "confidence_score": 88,
        "explanation": "Положительная динамика: снижение воспаления и улучшение метаболических показателей"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2024-10-15",
      "biological_age": 47,
      "health_index": 72,
      "lab_name": "Инвитро",
      "note": "Пик улучшения",
      "ai_analysis": {
        "aging_rate": 1.04,
        "confidence_score": 92,
        "explanation": "Достигнуты целевые значения по большинству показателей"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2025-01-15",
      "biological_age": 48,
      "health_index": 69,
      "lab_name": "Инвитро",
      "note": "Стабилизация результатов",
      "ai_analysis": {
        "aging_rate": 1.07,
        "confidence_score": 90,
        "explanation": "Результаты стабилизированы, требуется поддерживающая терапия"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    }
  ]'::jsonb
),
female_data = jsonb_set(
  female_data - 'analysis',
  '{analyses}',
  '[
    {
      "analysis_date": "2024-04-15",
      "biological_age": 50,
      "health_index": 63,
      "lab_name": "Инвитро",
      "note": "Исходное состояние: перименопауза, дефицит железа",
      "ai_analysis": {
        "aging_rate": 1.11,
        "confidence_score": 85,
        "explanation": "Выявлены признаки гормональной перестройки и дефицита железа"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2024-07-15",
      "biological_age": 49,
      "health_index": 67,
      "lab_name": "Инвитро",
      "note": "Начало улучшения после терапии",
      "ai_analysis": {
        "aging_rate": 1.09,
        "confidence_score": 88,
        "explanation": "Положительная динамика: повышение уровня железа, снижение воспаления"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2024-10-15",
      "biological_age": 47,
      "health_index": 71,
      "lab_name": "Инвитро",
      "note": "Пик улучшения",
      "ai_analysis": {
        "aging_rate": 1.04,
        "confidence_score": 92,
        "explanation": "Достигнуты целевые значения, гормональный баланс улучшен"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    },
    {
      "analysis_date": "2025-01-15",
      "biological_age": 48,
      "health_index": 68,
      "lab_name": "Инвитро",
      "note": "Стабилизация результатов",
      "ai_analysis": {
        "aging_rate": 1.07,
        "confidence_score": 90,
        "explanation": "Результаты стабилизированы, продолжаем поддерживающую терапию"
      },
      "biomarkers_metadata": {
        "current_count": 25,
        "historical_count": 0,
        "total_count": 25
      }
    }
  ]'::jsonb
)
WHERE id = 'default';

-- Update male biomarkers with 4 analyses
UPDATE demo_data_templates
SET male_data = jsonb_set(
  male_data,
  '{biomarkers}',
  '[
    {"code": "HB", "value": 148, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "HB", "value": 150, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "HB", "value": 152, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "HB", "value": 151, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "RBC", "value": 4.8, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "RBC", "value": 4.9, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "RBC", "value": 5.0, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "RBC", "value": 4.95, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "HCT", "value": 43, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "HCT", "value": 44, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "HCT", "value": 45, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "HCT", "value": 44.5, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "ESR", "value": 8, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "ESR", "value": 6, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "ESR", "value": 5, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "ESR", "value": 6, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "FERR", "value": 180, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "FERR", "value": 185, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "FERR", "value": 190, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "FERR", "value": 188, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "CRP", "value": 4.2, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 0},
    {"code": "CRP", "value": 3.2, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 1},
    {"code": "CRP", "value": 2.1, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 2},
    {"code": "CRP", "value": 2.5, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 3},
    {"code": "WBC", "value": 7.2, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 0},
    {"code": "WBC", "value": 6.8, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 1},
    {"code": "WBC", "value": 6.5, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 2},
    {"code": "WBC", "value": 6.7, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 3},
    {"code": "CHOL", "value": 6.2, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "CHOL", "value": 5.8, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "CHOL", "value": 5.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "CHOL", "value": 5.6, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "LDL", "value": 4.1, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "LDL", "value": 3.6, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "LDL", "value": 3.2, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "LDL", "value": 3.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "HDL", "value": 1.1, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "HDL", "value": 1.3, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "HDL", "value": 1.5, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "HDL", "value": 1.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "TG", "value": 2.2, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "TG", "value": 1.9, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "TG", "value": 1.5, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "TG", "value": 1.7, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "GLU", "value": 6.1, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "GLU", "value": 5.7, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "GLU", "value": 5.3, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "GLU", "value": 5.5, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "HBA1C", "value": 6.1, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "HBA1C", "value": 5.8, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "HBA1C", "value": 5.5, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "HBA1C", "value": 5.6, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "CREA", "value": 95, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "CREA", "value": 92, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "CREA", "value": 90, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "CREA", "value": 91, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "ALT", "value": 35, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "ALT", "value": 30, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "ALT", "value": 25, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "ALT", "value": 27, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "AST", "value": 32, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "AST", "value": 28, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "AST", "value": 24, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "AST", "value": 26, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "GGT", "value": 42, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "GGT", "value": 35, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "GGT", "value": 28, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "GGT", "value": 30, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "ALP", "value": 75, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "ALP", "value": 72, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "ALP", "value": 68, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "ALP", "value": 70, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "BIL", "value": 15, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "BIL", "value": 14, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "BIL", "value": 13, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "BIL", "value": 13.5, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "TEST", "value": 11, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "TEST", "value": 13.5, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "TEST", "value": 15.2, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "TEST", "value": 14.5, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "SHBG", "value": 38, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "SHBG", "value": 36, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "SHBG", "value": 34, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "SHBG", "value": 35, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "DHEAS", "value": 180, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "DHEAS", "value": 195, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "DHEAS", "value": 210, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "DHEAS", "value": 205, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "VITD", "value": 32, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "VITD", "value": 48, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "VITD", "value": 62, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "VITD", "value": 58, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "TSH", "value": 2.2, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "TSH", "value": 2.0, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "TSH", "value": 1.8, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "TSH", "value": 1.9, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "FT4", "value": 14, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "FT4", "value": 14.5, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "FT4", "value": 15, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "FT4", "value": 14.8, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3}
  ]'::jsonb
)
WHERE id = 'default';

-- Update female biomarkers with 4 analyses
UPDATE demo_data_templates
SET female_data = jsonb_set(
  female_data,
  '{biomarkers}',
  '[
    {"code": "HB", "value": 128, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "HB", "value": 133, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "HB", "value": 138, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "HB", "value": 135, "unit": "г/л", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "RBC", "value": 4.0, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "RBC", "value": 4.2, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "RBC", "value": 4.4, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "RBC", "value": 4.3, "unit": "×10¹²/л", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "HCT", "value": 37, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "HCT", "value": 39, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "HCT", "value": 41, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "HCT", "value": 40, "unit": "%", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "ESR", "value": 18, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "ESR", "value": 14, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "ESR", "value": 10, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "ESR", "value": 12, "unit": "мм/ч", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "FERR", "value": 28, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 0},
    {"code": "FERR", "value": 42, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 1},
    {"code": "FERR", "value": 58, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 2},
    {"code": "FERR", "value": 52, "unit": "нг/мл", "category": "Энергия и восстановление", "analysis_index": 3},
    {"code": "CRP", "value": 4.5, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 0},
    {"code": "CRP", "value": 3.2, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 1},
    {"code": "CRP", "value": 2.2, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 2},
    {"code": "CRP", "value": 2.8, "unit": "мг/л", "category": "Воспалительная и иммунная система", "analysis_index": 3},
    {"code": "WBC", "value": 7.0, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 0},
    {"code": "WBC", "value": 6.6, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 1},
    {"code": "WBC", "value": 6.2, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 2},
    {"code": "WBC", "value": 6.4, "unit": "×10⁹/л", "category": "Воспалительная и иммунная система", "analysis_index": 3},
    {"code": "CHOL", "value": 6.0, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "CHOL", "value": 5.7, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "CHOL", "value": 5.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "CHOL", "value": 5.5, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "LDL", "value": 3.9, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "LDL", "value": 3.5, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "LDL", "value": 3.1, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "LDL", "value": 3.2, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "HDL", "value": 1.3, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "HDL", "value": 1.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "HDL", "value": 1.6, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "HDL", "value": 1.5, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "TG", "value": 1.9, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 0},
    {"code": "TG", "value": 1.7, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 1},
    {"code": "TG", "value": 1.4, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 2},
    {"code": "TG", "value": 1.6, "unit": "ммоль/л", "category": "Сердечно-сосудистая система", "analysis_index": 3},
    {"code": "GLU", "value": 5.4, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "GLU", "value": 5.2, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "GLU", "value": 5.0, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "GLU", "value": 5.1, "unit": "ммоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "HBA1C", "value": 5.7, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "HBA1C", "value": 5.5, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "HBA1C", "value": 5.3, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "HBA1C", "value": 5.4, "unit": "%", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "CREA", "value": 72, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "CREA", "value": 70, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "CREA", "value": 68, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "CREA", "value": 69, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "ALT", "value": 28, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "ALT", "value": 25, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "ALT", "value": 22, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "ALT", "value": 24, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "AST", "value": 25, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "AST", "value": 22, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "AST", "value": 20, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "AST", "value": 21, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "GGT", "value": 32, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "GGT", "value": 28, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "GGT", "value": 24, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "GGT", "value": 26, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "ALP", "value": 68, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "ALP", "value": 65, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "ALP", "value": 62, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "ALP", "value": 64, "unit": "Ед/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "BIL", "value": 12, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 0},
    {"code": "BIL", "value": 11, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 1},
    {"code": "BIL", "value": 10.5, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 2},
    {"code": "BIL", "value": 11, "unit": "мкмоль/л", "category": "Обмен веществ и детоксикация", "analysis_index": 3},
    {"code": "ESTR", "value": 150, "unit": "пг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "ESTR", "value": 165, "unit": "пг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "ESTR", "value": 180, "unit": "пг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "ESTR", "value": 170, "unit": "пг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "SHBG", "value": 72, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "SHBG", "value": 68, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "SHBG", "value": 65, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "SHBG", "value": 66, "unit": "нмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "DHEAS", "value": 160, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "DHEAS", "value": 175, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "DHEAS", "value": 188, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "DHEAS", "value": 182, "unit": "мкг/дл", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "VITD", "value": 28, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "VITD", "value": 45, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "VITD", "value": 65, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "VITD", "value": 60, "unit": "нг/мл", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "TSH", "value": 2.8, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "TSH", "value": 2.5, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "TSH", "value": 2.2, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "TSH", "value": 2.4, "unit": "мМЕ/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3},
    {"code": "FT4", "value": 13, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 0},
    {"code": "FT4", "value": 13.5, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 1},
    {"code": "FT4", "value": 14, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 2},
    {"code": "FT4", "value": 13.8, "unit": "пмоль/л", "category": "Эндокринная и стрессовая система", "analysis_index": 3}
  ]'::jsonb
)
WHERE id = 'default';