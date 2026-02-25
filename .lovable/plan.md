

## Проблема

Поле `expected_effect_years` добавлено в AI-схему для генерации реальных данных и в UI-компонент `AgingBlockers.tsx`, но **не добавлено в демо-данные** в таблице `demo_data_templates`. Демо-блокеры не содержат это поле — поэтому в демо-режиме "Ожидаемый эффект" не отображается.

## Решение

Обновить JSON в `demo_data_templates` — добавить `expected_effect_years` к каждому блокеру в обоих профилях (male и female).

### Мужской профиль — значения:

| Блокер | impact_score | expected_effect_years |
|--------|-------------|----------------------|
| Остаточное воспаление | 7 | 1.5 |
| Недостаточная физическая активность | 6 | 1.2 |
| Хронический стресс | 5 | 0.8 |
| Недостаточное восстановление | 5 | 0.7 |
| Дефицит витамина D | 4 | 0.5 |

### Женский профиль — аналогично, значения подобрать по impact_score.

## Файлы

1. **SQL UPDATE** `demo_data_templates` — добавить `expected_effect_years` в каждый блокер для `male_data.risk_zones.aging_blockers.blockers` и `female_data.risk_zones.aging_blockers.blockers`

Изменений в коде не требуется — компонент `AgingBlockers.tsx` уже обрабатывает это поле через `blocker.expected_effect_years != null`.

