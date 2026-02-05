
# План: Добавить отображение причины (reason) в назначениях отчёта

## Проблема

В секции "Назначения" на странице отчёта (`Recommendations.tsx`) не отображается поле `reason` — причина назначения (какой биомаркер вызвал это назначение).

Данные есть в БД:
```
reason: "Малоновый диальдегид: 2.8 мкмоль/л (норма: ?-2.5 мкмоль/л) — повышенный уровень маркера оксидативного стресса."
```

Но интерфейс `Prescription` и UI не включают это поле.

## Решение

### 1. Обновить интерфейс Prescription

**Файл:** `src/pages/Recommendations.tsx` (строки 46-52)

```typescript
interface Prescription {
  id: string;
  prescription: string;
  reason: string | null;  // ← добавить
  effect: string;
  control_date: string;
  status: "on_review" | "confirmed";
}
```

### 2. Добавить отображение reason в UI

**Файл:** `src/pages/Recommendations.tsx` (после строки 893)

Добавить блок отображения причины между заголовком назначения и эффектом:

```tsx
{prescription.reason && (
  <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mb-3">
    <span className="text-primary mt-0.5">📊</span>
    <p className="text-sm text-foreground leading-relaxed">
      <span className="font-medium">Причина:</span> {prescription.reason}
    </p>
  </div>
)}
```

### 3. Обновить демо-данные

Если используется демо-режим, добавить `reason` в маппинг демо-данных (строки 217-223).

## Результат

После изменений:
- В секции "Назначения" отчёта будет отображаться причина (какой биомаркер)
- Стиль совпадает с отображением на странице `/prescriptions`
- Пользователь видит полную информацию о назначении
