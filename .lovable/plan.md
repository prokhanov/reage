

# Вынос хардкод-промптов в AI Settings

## Что захардкожено сейчас

В `analyze-biomarkers/index.ts` есть два блока текста, которые не редактируются через AI Settings:

### 1. `globalBiomarkersContext` (строки 473-482)
Инструкции для AI: «не рекомендуй сдавать маркеры которые есть», «запрет противоречий» и т.д. Сейчас это строковый литерал в коде. Нужно вынести в `ai_prompt_settings` с ключом `global_biomarkers_instructions`.

### 2. Инструкция формата JSON для назначений (строка 930)
Текст `"Важно: Верни ТОЛЬКО валидный JSON..."` — дописывается к системному промпту назначений. Этот блок технический (формат ответа), его логичнее оставить в коде, т.к. изменение формата сломает парсер.

## План

### A. Создать запись `global_biomarkers_instructions` в `ai_prompt_settings`

INSERT с текстом из текущего хардкода (инструкции про кросс-ссылки, запрет противоречий, проверку дефицитов).

### B. Обновить edge function

Заменить хардкод `globalBiomarkersContext` на загрузку из `prompts['global_biomarkers_instructions']` с fallback на текущий текст.

Формат:
```typescript
const globalBiomarkersInstructions = prompts['global_biomarkers_instructions'] || `ВАЖНО: ...`;

const globalBiomarkersContext = `
ПОЛНЫЙ СПИСОК ВСЕХ СДАННЫХ БИОМАРКЕРОВ ПАЦИЕНТА:
${globalBiomarkersSummary}

${globalBiomarkersInstructions}
`.trim();
```

### C. Добавить в AISettings.tsx секцию для этого промпта

Добавить в `standaloneSections` новый элемент:
```typescript
{
  id: 'global_biomarkers',
  name: 'Контекст биомаркеров',
  emoji: '🔬',
  description: 'Инструкции для AI при работе с полным списком маркеров (кросс-ссылки, запрет противоречий)',
  promptKey: 'global_biomarkers_instructions',
  group: 'report'
}
```

### Объём
- 1 INSERT в `ai_prompt_settings`
- 1 правка в edge function (3 строки)
- 1 правка в AISettings.tsx (добавить секцию)

