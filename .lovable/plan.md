
# План: Добавить отображение reason в диалоге EditReportDialog

## Проблема

В диалоге "Редактирование отчета" (`EditReportDialog.tsx`) интерфейс `Prescription` уже содержит поле `reason`, но оно не выводится в UI секции "Назначения".

## Решение

Добавить блок отображения `reason` между заголовком назначения и полем `effect`.

## Изменения

**Файл:** `src/components/admin/EditReportDialog.tsx`

**Строки:** 322-327

Добавить перед блоком `{prescription.effect && ...}`:

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

## Результат

- В диалоге редактирования отчёта для каждого назначения будет показана причина (какой биомаркер вызвал рекомендацию)
- Стиль идентичен странице Recommendations
