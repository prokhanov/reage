

## Добавить отображение оптимальной зоны в общем режиме

### Проблема
В режиме «Общие диапазоны» между полями optimal_min и optimal_max нет визуального блока, показывающего текущую оптимальную зону. В возрастных диапазонах такой блок есть (`🟢 Оптимальная зона: X — Y`).

### Решение
Добавить аналогичный блок между секциями optimal_min (строка 1426) и optimal_max (строка 1428) в общем режиме. Блок будет показывать 3 колонки (Общий, Мужчины, Женщины) с динамическим отображением текущих значений из `editingBiomarker`.

### Изменение: `src/pages/admin/DataManagement.tsx`

Между строками 1426 и 1428 вставить блок:

```tsx
<div className="rounded-lg border border-status-optimal/30 bg-status-optimal/10 p-3 text-center">
  <div className="grid grid-cols-3 gap-3">
    <div>
      <Label className="text-[10px] text-muted-foreground">Общий</Label>
      <p className="text-xs font-semibold text-status-optimal">
        🟢 {fmtRange(editingBiomarker?.optimal_min, editingBiomarker?.optimal_max)}
      </p>
    </div>
    <div>
      <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
      <p className="text-xs font-semibold text-status-optimal">
        🟢 {fmtRange(editingBiomarker?.optimal_min_male, editingBiomarker?.optimal_max_male)}
      </p>
    </div>
    <div>
      <Label className="text-[10px] text-muted-foreground">Женщины</Label>
      <p className="text-xs font-semibold text-status-optimal">
        🟢 {fmtRange(editingBiomarker?.optimal_min_female, editingBiomarker?.optimal_max_female)}
      </p>
    </div>
  </div>
</div>
```

Функция `fmtRange` уже определена в возрастном режиме (строка 1527). Нужно вынести её выше, чтобы она была доступна и в общем режиме, или определить inline-версию.

