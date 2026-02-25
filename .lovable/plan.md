

# Исправление "NaN%" в трендах SystemRatingsCard

## Проблема

В `calculateTrends()` (строка ~95) значения `oldScores` и `newScores` берутся из `category_scores`, но после обновления демо-данных scores хранятся как объекты `{ score: number, impact: string, key_markers: string[] }`, а не как числа. Код делит на объект вместо числа → `NaN`.

```typescript
// Строки 100-101: получаем объект вместо числа
const oldScore = oldScores[cat.name]; // { score: 83, impact: "...", key_markers: [...] }
const newScore = newScores[cat.name]; // { score: 85, impact: "...", key_markers: [...] }
// Строка 105: NaN
const change = newScore - oldScore; // object - object = NaN
```

## Решение

В `src/components/dashboard/SystemRatingsCard.ts`, в функции `calculateTrends()` (~строки 100-101), извлекать `.score` из объекта так же, как уже сделано в `loadCategories()` (~строки 44-53):

```typescript
const rawOld = oldScores[cat.name];
const oldScore = typeof rawOld === 'object' && rawOld !== null && 'score' in rawOld 
  ? rawOld.score : (typeof rawOld === 'number' ? rawOld : null);

const rawNew = newScores[cat.name];  
const newScore = typeof rawNew === 'object' && rawNew !== null && 'score' in rawNew
  ? rawNew.score : (typeof rawNew === 'number' ? rawNew : null);
```

И добавить проверку `oldScore === 0` чтобы не делить на ноль:

```typescript
if (oldScore === null || newScore === null || oldScore === 0) return;
```

Один файл, ~10 строк изменений.

