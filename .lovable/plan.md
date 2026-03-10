

## Проблема: два источника веса, отчёты берут устаревший

### Как это работает сейчас

Вес хранится в **двух местах**:
1. **`profiles.weight`** — статичное поле, заполняется при регистрации и обновляется при добавлении веса через WeightTracker
2. **`weight_history`** — таблица с историей измерений, каждая запись = одно взвешивание

**Дашборд (WeightTracker)** берёт последнюю запись из `weight_history` → показывает **51 кг**.

**Админка (PatientProfile, PatientInfoDialog)** берёт `profiles.weight` → показывает **2 кг**.

**Отчёты (analyze-biomarkers, analyze-risk-zones, health-assistant)** тоже берут `profiles.weight` → в отчёт попадает **2 кг**.

### Почему разошлись данные

Скорее всего, 2 кг было введено при регистрации (опечатка). Потом 51 кг добавили через WeightTracker или админом напрямую в `weight_history`, но `profiles.weight` не обновился (ошибка сохранения, или запись была вставлена напрямую в БД).

WeightTracker при сохранении обновляет оба места, но если вес попал в `weight_history` другим путём (например, через админку или напрямую в БД), `profiles.weight` остаётся старым.

### План исправления

**1. Edge function `analyze-biomarkers/index.ts`** (~строки 114-118, 254-257, 315-317, 358-360)
- После получения профиля — дополнительно запросить последний вес из `weight_history`
- Использовать `latestWeight ?? profile.weight` для BMI и всех текстов отчёта

**2. Edge function `analyze-risk-zones/index.ts`** (строка 78)
- Уже загружает `weight_history` (строка 64), но НЕ использует
- Заменить `profile?.weight` на `weightHistory[0]?.weight ?? profile?.weight` в строке 78

**3. Edge function `health-assistant/index.ts`** (строка 231)
- Добавить запрос `weight_history` (последняя запись)
- Использовать `latestWeight ?? profile.weight`

**4. Админка: `PatientProfile.tsx`** (строка 293) и `PatientInfoDialog.tsx`** (строка 330)
- Загружать последний вес из `weight_history` и показывать его вместо `profiles.weight`

**5. Исправить данные Алины**
- SQL-миграция: обновить `profiles.weight` на актуальный вес из последней записи `weight_history` для всех пользователей, у которых эти значения расходятся

**6. Добавить триггер синхронизации** (предотвращение повторения проблемы)
- DB trigger на `weight_history` INSERT: автоматически обновляет `profiles.weight` последним значением

### Итого: 3 edge functions + 2 UI-компонента + 1 миграция с триггером

