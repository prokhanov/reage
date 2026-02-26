

# Восстановление утерянных демо-данных

## Что произошло

Предыдущий SQL UPDATE (замена "Aging rate" → "Скорость старения" в male_data) случайно перезаписал `female_data`, удалив из неё ключевые поля.

## Текущее состояние данных

| Поле | male_data | female_data |
|---|---|---|
| profile | Есть | **УТЕРЯНО** |
| analyses (4 шт) | Есть (с detailed biomarkers_metadata) | **УТЕРЯНО** |
| biomarkers (316 шт) | Есть | **УТЕРЯНО** |
| risk_zones | Есть | Есть |
| prescriptions | Есть (11 шт) | Есть (11 шт) |
| recommendations | Есть | Есть |
| symptoms | Отсутствует (потеряно ранее, в миграции #3) | **УТЕРЯНО** |
| weight_history | Отсутствует (потеряно ранее, в миграции #3) | **УТЕРЯНО** |

## Что нужно восстановить

### 1. female_data — profile, analyses, biomarkers

Источник: миграция `20251112071725` (строки 343–679) содержит полную female_data с profile, 4 analyses и 71×4=284 biomarkers. Но в ней нет detailed `biomarkers_metadata` (с category_scores), которые есть в текущей male_data. Нужно:

- Восстановить `profile` (Мария Иванова, female, 1980-03-20, 68 кг, 165 см)
- Восстановить `analyses` (4 штуки с biological_age и health_index) + сгенерировать `biomarkers_metadata` с category_scores аналогично тому, что сейчас есть в male_data
- Восстановить `biomarkers` (71 код × 4 анализа = 284 записи)

### 2. symptoms и weight_history (для обоих полов)

Эти поля были в оригинальной миграции `20251112054506`, но были стёрты ещё при миграции `20251112071725` (полная перезапись). Нужно вернуть:

**male**: 3 симптома (Усталость, Пробуждения, Фокусировка) + 4 записи веса (87→85 кг)
**female**: 4 симптома (Приливы, Настроение, Усталость, Либидо) + 4 записи веса (69.5→68 кг)

## Техническая реализация

3 SQL UPDATE через insert tool (не миграция — это данные):

1. `UPDATE demo_data_templates SET female_data = jsonb_set(jsonb_set(jsonb_set(female_data, '{profile}', '...'), '{analyses}', '...'), '{biomarkers}', '...')` — восстановить profile + analyses + biomarkers из миграции
2. `UPDATE demo_data_templates SET male_data = jsonb_set(jsonb_set(male_data, '{symptoms}', '...'), '{weight_history}', '...')` — добавить symptoms и weight_history для male
3. `UPDATE demo_data_templates SET female_data = jsonb_set(jsonb_set(female_data, '{symptoms}', '...'), '{weight_history}', '...')` — добавить symptoms и weight_history для female

## Изменений в коде нет

Код (`useDemoMode.ts`) уже обрабатывает все эти поля — нужно только вернуть данные в БД.

