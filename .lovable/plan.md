# Единое окно паспортных данных

Сейчас существуют два диалога, делающих одно и то же:

- `src/components/PassportDataDialog.tsx` — используется в баннере `PassportReminderCard`. Стилизован лучше (gradient-кнопка, скругления, описание про лабораторию).
- `src/components/profile/EditPassportDialog.tsx` — используется на странице Профиль. По функционалу идентичен, но проще.

Оба читают/пишут одни и те же поля `profiles.passport_series` / `passport_number`, оба используют общий `PassportFields` + `isPassportValid`.

## Изменения

1. **`src/pages/Profile.tsx`**
   - Заменить импорт:
     - `import { EditPassportDialog } from "@/components/profile/EditPassportDialog";` → `import { PassportDataDialog } from "@/components/PassportDataDialog";`
   - Заменить рендер диалога (около строки 553):
     ```tsx
     <PassportDataDialog
       open={editPassportOpen}
       onOpenChange={setEditPassportOpen}
       onSaved={() => loadProfile()}
     />
     ```
   - Пропы `userId`, `initialSeries`, `initialNumber` не нужны — `PassportDataDialog` сам подтягивает текущие данные через `useViewAsUser().getUserId()` при открытии (это даже надёжнее, т. к. учитывает режим «view as»).

2. **Удалить** `src/components/profile/EditPassportDialog.tsx` (больше нигде не используется — проверено по `rg`).

## Чего НЕ делаем

- Не меняем `PassportDataDialog` визуально — он уже хорошо выглядит.
- Не трогаем `PassportFields`, `PassportReminderCard`, баннер.
- Не меняем логику сохранения / валидации.

## Проверка

- Открыть Профиль → нажать «Заполнить» / «Редактировать» в карточке Паспортные данные → убедиться, что открывается то же окно, что и из баннера, серия/номер подтягиваются, сохранение работает, по успеху карточка обновляется.
- Запустить typecheck/build (автоматически).
