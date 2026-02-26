

# Добавить секцию "Стратегия (Зоны риска)" в AI Settings

## Проблема

В таблице `ai_prompt_settings` есть 3 промпта стратегии:
- `risk_zones_risk_map` (на русском)
- `risk_zones_aging_blockers` (на русском)  
- `risk_zones_smart_priorities` (на английском — причина появления "Aging rate")

Но страница AI Settings (`src/pages/admin/AISettings.tsx`) их не показывает — нет соответствующей секции в UI. Промпты-"сироты".

## Решение

### Шаг 1: Добавить конфигурацию секции "Стратегия" в AISettings.tsx

Добавить новый массив `riskZoneSections` по аналогии с `reportSections`:

```typescript
const riskZoneSections = [
  { 
    id: 'risk_map', 
    name: 'Карта рисков', 
    emoji: '🗺️',
    description: 'Промпт для анализа карты рисков по системам организма',
    promptKey: 'risk_zones_risk_map'
  },
  { 
    id: 'aging_blockers', 
    name: 'Факторы старения', 
    emoji: '🧬',
    description: 'Промпт для определения факторов, тормозящих anti-aging прогресс',
    promptKey: 'risk_zones_aging_blockers'
  },
  { 
    id: 'smart_priorities', 
    name: 'Умные приоритеты', 
    emoji: '🎯',
    description: 'Промпт для генерации стратегических приоритетов и задач',
    promptKey: 'risk_zones_smart_priorities'
  }
];
```

### Шаг 2: Добавить секцию в JSX

Новый блок "Промпты стратегии (Зоны риска)" между секциями отчёта и категорий биомаркеров. Каждый промпт — одна карточка в аккордеоне с кнопкой "Редактировать" (как у остальных промптов).

### Шаг 3: После этого — отредактировать промпт

Когда секция появится в UI, можно будет открыть `risk_zones_smart_priorities` и переписать его на русский прямо через интерфейс. Или я могу сразу обновить его через базу данных.

## Что изменится

- На странице AI Settings появится новая секция с 3 промптами стратегии
- Можно будет редактировать эти промпты через UI
- Никаких изменений в базе данных или edge functions

## Файлы

- `src/pages/admin/AISettings.tsx` — добавить секцию (~60 строк)

