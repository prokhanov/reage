

## Проблема: формула индекса здоровья слишком агрессивна

### Диагностика

Формула в `supabase/functions/analyze-biomarkers/index.ts`:

```text
rawHealthIndex = 100 - avgPenalty * 25

Штрафы по тирам:
  Оптимально  = 0
  Допустимо   = 3 * aging_weight (cap 10)
  Риск        = 10 * aging_weight (cap 10)
  Критично    = 20 * aging_weight (cap 10)
```

Проблема в комбинации двух факторов:

1. **Штраф "Допустимо" = 3 слишком велик** при множителе 25
2. **Множитель 25 слишком агрессивен**

Пример для пациента с 40 маркерами, где 20 оптимальных и 20 допустимых (все в норме!):
- totalPenalty = 20 * 3 = 60
- avgPenalty = 60/40 = 1.5
- **healthIndex = 100 - 1.5 * 25 = 62** --- для здорового человека!
- bioAge = chrono + (70-62) * 0.15 = chrono + 1.2

С longevity-нормами (узкие optimal диапазоны) большинство "нормальных" лабораторных значений попадают в "допустимо", и формула штрафует слишком сильно.

### Решение: перебалансировка штрафов и множителя

**Файл:** `supabase/functions/analyze-biomarkers/index.ts`

Изменения:
- Штраф "Допустимо": 3 → **1**
- Множитель: 25 → **15**
- Убрать cap 10 (он маскирует разницу между risk и critical)
- Штрафы risk и critical пропорционально скорректировать: risk = 5, critical = 15

```text
Новая шкала:
  Оптимально  = 0
  Допустимо   = 1 * aging_weight
  Риск        = 5 * aging_weight  
  Критично    = 15 * aging_weight

rawHealthIndex = 100 - avgPenalty * 15
```

### Ожидаемый результат (тот же пациент, 20 optimal + 20 acceptable):
- avgPenalty = 20*1/40 = 0.5
- **healthIndex = 100 - 0.5*15 = 92** (было 62)

Другие сценарии:
- Все оптимально → 100
- 70% optimal, 30% acceptable → 95
- 50% opt, 40% acc, 10% risk → 100 - (0.4+0.5)*15/1 = ~86
- Тяжёлый случай (30% risk, 10% critical) → ~45

Bio age тоже станет адекватнее, т.к. формула `chrono + (70 - healthIndex) * 0.15` при healthIndex=92 даст chrono - 3.3 (моложе).

### Файлы для изменения:
1. `supabase/functions/analyze-biomarkers/index.ts` — строки 1134-1159 (штрафы) и 1192 (множитель)
2. Передеплоить edge function

### Обновить memory
Обновить `biological-age-calculation-standard` с новыми штрафами.

