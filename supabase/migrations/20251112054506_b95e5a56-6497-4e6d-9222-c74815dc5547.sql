-- Добавить поле demo_mode_enabled в profiles
ALTER TABLE profiles ADD COLUMN demo_mode_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.demo_mode_enabled IS 'Включен ли демо-режим для пользователя (автоматически отключается при добавлении первого анализа)';

-- Создать таблицу demo_data_templates
CREATE TABLE demo_data_templates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  male_data JSONB NOT NULL,
  female_data JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS политики для demo_data_templates
ALTER TABLE demo_data_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view demo templates"
  ON demo_data_templates FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage demo templates"
  ON demo_data_templates FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

COMMENT ON TABLE demo_data_templates IS 'Шаблоны демо-данных для новых пользователей, адаптированные под пол';

-- Триггер автоотключения демо-режима
CREATE OR REPLACE FUNCTION disable_demo_mode_on_first_analysis()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET demo_mode_enabled = false 
  WHERE id = NEW.user_id AND demo_mode_enabled = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_disable_demo_mode
  AFTER INSERT ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION disable_demo_mode_on_first_analysis();

COMMENT ON FUNCTION disable_demo_mode_on_first_analysis IS 'Автоматически отключает демо-режим при добавлении первого реального анализа';

-- Инициализация демо-данных
INSERT INTO demo_data_templates (id, male_data, female_data, description)
VALUES (
  'default',
  '{
    "profile": {
      "chronological_age": 45,
      "weight": 85,
      "height": 178
    },
    "analysis": {
      "biological_age": 49,
      "health_index": 65,
      "analysis_date": "2025-01-15",
      "lab_name": "Демо лаборатория",
      "note": "Демонстрационные данные",
      "ai_analysis": {
        "confidence_score": 75,
        "aging_rate": 1.2,
        "explanation": "Умеренные отклонения в маркерах воспаления и обмена веществ. Биологический возраст на 4 года превышает хронологический.",
        "key_aging_markers": [
          {"name": "HbA1c", "impact": 0.8, "reasoning": "Повышен до 6.1% (преддиабет)"},
          {"name": "CRP", "impact": 0.7, "reasoning": "Умеренное воспаление 4.2 мг/л"},
          {"name": "Холестерин общий", "impact": 0.6, "reasoning": "Выше нормы 6.2 ммоль/л"}
        ]
      }
    },
    "biomarkers": [
      {"code": "HBA1C", "value": 6.1, "category": "Обмен веществ и детоксикация"},
      {"code": "CRP", "value": 4.2, "category": "Воспалительная и иммунная система"},
      {"code": "CHOL", "value": 6.2, "category": "Сердечно-сосудистая система"},
      {"code": "GLU", "value": 5.8, "category": "Обмен веществ и детоксикация"},
      {"code": "HB", "value": 155, "category": "Энергия и восстановление"},
      {"code": "TESTO", "value": 450, "category": "Эндокринная и стрессовая система"},
      {"code": "CORT", "value": 520, "category": "Эндокринная и стрессовая система"},
      {"code": "TSH", "value": 2.8, "category": "Эндокринная и стрессовая система"}
    ],
    "symptoms": [
      {"category": "Энергия", "symptom": "Усталость после обеда", "severity": 5, "tracked_at": "2025-01-10"},
      {"category": "Сон", "symptom": "Частые пробуждения ночью", "severity": 4, "tracked_at": "2025-01-10"},
      {"category": "Концентрация", "symptom": "Сложности с фокусировкой", "severity": 4, "tracked_at": "2025-01-10"}
    ],
    "weight_history": [
      {"weight": 87, "measured_at": "2024-10-15"},
      {"weight": 86.5, "measured_at": "2024-11-15"},
      {"weight": 85.5, "measured_at": "2024-12-15"},
      {"weight": 85, "measured_at": "2025-01-15"}
    ],
    "prescriptions": [
      {
        "prescription": "Магний цитрат 400 мг перед сном",
        "effect": "Улучшение качества сна, снижение стресса",
        "status": "active",
        "control_date": "2025-04-15"
      },
      {
        "prescription": "Омега-3 2000 мг во время еды",
        "effect": "Снижение воспаления, поддержка сердечно-сосудистой системы",
        "status": "active",
        "control_date": "2025-04-15"
      }
    ],
    "recommendations": [
      {"type": "nutrition", "text": "Снизить потребление быстрых углеводов (сладости, белый хлеб)"},
      {"type": "lifestyle", "text": "Ходьба 30 минут после ужина для контроля глюкозы"},
      {"type": "supplement", "text": "Рассмотреть прием берберина для поддержки метаболизма глюкозы"}
    ],
    "risk_zones": {
      "smart_priorities": {
        "immediate": {
          "focus": {
            "title": "Стабилизация уровня глюкозы",
            "description": "HbA1c в зоне преддиабета требует немедленной коррекции",
            "predicted_improvements": [
              {"metric": "HbA1c", "from": 6.1, "to": 5.7, "unit": "%"},
              {"metric": "Энергия", "improvement": "+25%"}
            ]
          },
          "tasks": [
            {
              "action": "Исключить сладкие напитки и десерты",
              "reason": "Резкие скачки глюкозы ускоряют старение",
              "prediction": {"effect": "Снижение HbA1c на 0.4%", "confidence": 85, "timeline": "2 недели"}
            }
          ]
        },
        "medium_term": {
          "focus": {
            "title": "Снижение системного воспаления",
            "description": "CRP 4.2 указывает на хроническое воспаление",
            "predicted_improvements": [
              {"metric": "CRP", "from": 4.2, "to": 2.0, "unit": "мг/л"}
            ]
          },
          "tasks": [
            {
              "action": "Добавить куркумин 1000 мг/день",
              "reason": "Мощный природный противовоспалительный агент",
              "prediction": {"effect": "Снижение CRP на 40-50%", "confidence": 78, "timeline": "4-6 недель"}
            }
          ]
        },
        "long_term": {
          "focus": {
            "title": "Оптимизация липидного профиля",
            "description": "Холестерин 6.2 увеличивает кардиоваскулярный риск",
            "predicted_improvements": [
              {"metric": "Холестерин", "from": 6.2, "to": 5.2, "unit": "ммоль/л"}
            ]
          },
          "tasks": [
            {
              "action": "Средиземноморская диета + силовые тренировки",
              "reason": "Комплексный подход для долгосрочной оптимизации",
              "prediction": {"effect": "Снижение холестерина на 15-20%", "confidence": 72, "timeline": "3-4 месяца"}
            }
          ]
        }
      },
      "risk_map": {
        "categories": [
          {"name": "Обмен веществ", "score": 68, "trend": "stable", "insight": "HbA1c в зоне преддиабета"},
          {"name": "Воспаление", "score": 62, "trend": "up", "insight": "CRP повышен"},
          {"name": "Сердечно-сосудистая", "score": 70, "trend": "stable", "insight": "Холестерин выше нормы"},
          {"name": "Энергия", "score": 75, "trend": "down", "insight": "Легкая усталость"},
          {"name": "Гормональная", "score": 80, "trend": "stable", "insight": "Тестостерон в норме"}
        ]
      },
      "aging_blockers": {
        "blockers": [
          {
            "name": "Гликация (HbA1c)",
            "impact_score": 70,
            "evidence": ["HbA1c 6.1% (преддиабет)", "Ускоряет повреждение белков"],
            "recommendation": "Контроль углеводов + берберин"
          },
          {
            "name": "Хроническое воспаление",
            "impact_score": 60,
            "evidence": ["CRP 4.2 мг/л", "Ускоряет износ тканей"],
            "recommendation": "Омега-3 + куркумин + антивоспалительная диета"
          },
          {
            "name": "Окислительный стресс",
            "impact_score": 55,
            "evidence": ["Высокий метаболизм + воспаление", "Повреждает клетки"],
            "recommendation": "Витамин С + E + коэнзим Q10"
          }
        ]
      }
    }
  }',
  '{
    "profile": {
      "chronological_age": 45,
      "weight": 68,
      "height": 165
    },
    "analysis": {
      "biological_age": 48,
      "health_index": 67,
      "analysis_date": "2025-01-15",
      "lab_name": "Демо лаборатория",
      "note": "Демонстрационные данные",
      "ai_analysis": {
        "confidence_score": 76,
        "aging_rate": 1.15,
        "explanation": "Признаки перименопаузы, умеренный дефицит железа. Биологический возраст на 3 года превышает хронологический.",
        "key_aging_markers": [
          {"name": "Ферритин", "impact": 0.75, "reasoning": "Снижен до 35 мкг/л (дефицит железа)"},
          {"name": "Эстрадиол", "impact": 0.7, "reasoning": "Снижение уровня эстрогенов (перименопауза)"},
          {"name": "CRP", "impact": 0.65, "reasoning": "Умеренное воспаление 3.8 мг/л"}
        ]
      }
    },
    "biomarkers": [
      {"code": "HB", "value": 135, "category": "Энергия и восстановление"},
      {"code": "FERR", "value": 35, "category": "Энергия и восстановление"},
      {"code": "CRP", "value": 3.8, "category": "Воспалительная и иммунная система"},
      {"code": "ESTR", "value": 180, "category": "Эндокринная и стрессовая система"},
      {"code": "SHBG", "value": 65, "category": "Эндокринная и стрессовая система"},
      {"code": "TSH", "value": 2.5, "category": "Эндокринная и стрессовая система"},
      {"code": "CHOL", "value": 5.8, "category": "Сердечно-сосудистая система"},
      {"code": "GLU", "value": 5.2, "category": "Обмен веществ и детоксикация"}
    ],
    "symptoms": [
      {"category": "Гормональные", "symptom": "Приливы жара", "severity": 6, "tracked_at": "2025-01-10"},
      {"category": "Настроение", "symptom": "Перепады настроения", "severity": 5, "tracked_at": "2025-01-10"},
      {"category": "Энергия", "symptom": "Усталость к вечеру", "severity": 5, "tracked_at": "2025-01-10"},
      {"category": "Либидо", "symptom": "Снижение либидо", "severity": 4, "tracked_at": "2025-01-10"}
    ],
    "weight_history": [
      {"weight": 69.5, "measured_at": "2024-10-15"},
      {"weight": 69, "measured_at": "2024-11-15"},
      {"weight": 68.5, "measured_at": "2024-12-15"},
      {"weight": 68, "measured_at": "2025-01-15"}
    ],
    "prescriptions": [
      {
        "prescription": "Железо бисглицинат 25 мг утром натощак",
        "effect": "Восстановление уровня ферритина, повышение энергии",
        "status": "active",
        "control_date": "2025-04-15"
      },
      {
        "prescription": "Витамин D3 2000 МЕ ежедневно",
        "effect": "Поддержка гормонального баланса, настроения",
        "status": "active",
        "control_date": "2025-04-15"
      }
    ],
    "recommendations": [
      {"type": "nutrition", "text": "Увеличить потребление красного мяса и зеленых листовых овощей (источники железа)"},
      {"type": "lifestyle", "text": "Йога или медитация 15 минут в день для баланса гормонов"},
      {"type": "supplement", "text": "Рассмотреть прием фитоэстрогенов (изофлавоны сои) для облегчения симптомов перименопаузы"}
    ],
    "risk_zones": {
      "smart_priorities": {
        "immediate": {
          "focus": {
            "title": "Восстановление уровня железа",
            "description": "Ферритин 35 мкг/л вызывает хроническую усталость",
            "predicted_improvements": [
              {"metric": "Ферритин", "from": 35, "to": 60, "unit": "мкг/л"},
              {"metric": "Энергия", "improvement": "+35%"}
            ]
          },
          "tasks": [
            {
              "action": "Железо бисглицинат + витамин C",
              "reason": "Быстрое восстановление запасов железа",
              "prediction": {"effect": "Повышение ферритина на 25 мкг/л", "confidence": 88, "timeline": "6-8 недель"}
            }
          ]
        },
        "medium_term": {
          "focus": {
            "title": "Гормональная адаптация",
            "description": "Перименопауза требует поддержки организма",
            "predicted_improvements": [
              {"metric": "Приливы", "improvement": "-40%"},
              {"metric": "Настроение", "improvement": "+30%"}
            ]
          },
          "tasks": [
            {
              "action": "Фитоэстрогены (изофлавоны сои 50 мг/день)",
              "reason": "Мягкая поддержка гормонального баланса",
              "prediction": {"effect": "Снижение симптомов перименопаузы", "confidence": 75, "timeline": "4-6 недель"}
            }
          ]
        },
        "long_term": {
          "focus": {
            "title": "Профилактика остеопороза",
            "description": "Снижение эстрогенов увеличивает риск потери костной массы",
            "predicted_improvements": [
              {"metric": "Плотность костей", "improvement": "стабилизация"}
            ]
          },
          "tasks": [
            {
              "action": "Кальций + витамин D + силовые тренировки",
              "reason": "Комплексная защита костной ткани",
              "prediction": {"effect": "Сохранение плотности костей", "confidence": 80, "timeline": "6+ месяцев"}
            }
          ]
        }
      },
      "risk_map": {
        "categories": [
          {"name": "Энергия", "score": 65, "trend": "down", "insight": "Дефицит железа"},
          {"name": "Гормональная", "score": 68, "trend": "down", "insight": "Перименопауза"},
          {"name": "Воспаление", "score": 72, "trend": "stable", "insight": "Умеренное воспаление"},
          {"name": "Сердечно-сосудистая", "score": 78, "trend": "stable", "insight": "Показатели в норме"},
          {"name": "Обмен веществ", "score": 80, "trend": "stable", "insight": "Глюкоза в норме"}
        ]
      },
      "aging_blockers": {
        "blockers": [
          {
            "name": "Дефицит железа",
            "impact_score": 68,
            "evidence": ["Ферритин 35 мкг/л (дефицит)", "Снижает энергию и когнитивные функции"],
            "recommendation": "Железо бисглицинат + увеличение красного мяса"
          },
          {
            "name": "Гормональный дисбаланс (перименопауза)",
            "impact_score": 65,
            "evidence": ["Эстрадиол снижен", "Приливы и перепады настроения"],
            "recommendation": "Фитоэстрогены + витамин D + стресс-менеджмент"
          },
          {
            "name": "Хроническое воспаление",
            "impact_score": 58,
            "evidence": ["CRP 3.8 мг/л", "Ускоряет износ тканей"],
            "recommendation": "Омега-3 + противовоспалительная диета"
          }
        ]
      }
    }
  }',
  'Стандартный демо-шаблон: 45 лет, умеренные проблемы со здоровьем, адаптация под пол'
);