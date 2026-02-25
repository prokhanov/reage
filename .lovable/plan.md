

# Адаптация биологических возрастов в risk_zones

## Проблема
Стратегия показывает "43.5 → 42 года" (шаблонные значения), хотя дашборд показывает адаптированный биовозраст (например, 24.5 для 26-летнего).

## Изменение

**Файл:** `src/hooks/useDemoMode.ts`, после строки 88 (после блока замены хронологического возраста)

Добавить ~12 строк: берём биовозрасты из шаблонных и адаптированных анализов, вычисляем дельту, заменяем в `risk_zones`:

```typescript
// Adapt biological age references in risk_zones
if (adaptedRiskZones && adaptedAnalyses.length > 0) {
  const templateAnalyses = genderData.analyses || [];
  const lastTemplateBio = templateAnalyses[templateAnalyses.length - 1]?.biological_age;
  const lastAdaptedBio = adaptedAnalyses[adaptedAnalyses.length - 1]?.biological_age;

  if (lastTemplateBio && lastAdaptedBio && lastTemplateBio !== lastAdaptedBio) {
    const delta = lastAdaptedBio - lastTemplateBio;
    const templateTarget = 42;
    const adaptedTarget = Math.round((templateTarget + delta) * 10) / 10;

    let riskZonesStr = JSON.stringify(adaptedRiskZones);
    riskZonesStr = riskZonesStr
      .replace(/43\.5/g, String(Math.round(lastAdaptedBio * 10) / 10))
      .replace(/42 года/g, `${adaptedTarget} года`);
    adaptedRiskZones = JSON.parse(riskZonesStr);
  }
}
```

Коллизий нет: `43.5` уникально, `42 года` не совпадает с "42 нг/мл". Интерпретации биомаркеров не затрагиваются — меняются только числа биовозраста.

