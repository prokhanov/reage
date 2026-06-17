## Что делаем

Один UI-компонент анкеты на оба места: регистрацию и редактирование в профиле. Стиль — как в регистрации (карточки `rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6`).

## Файлы

1. **`src/components/medical/MedicalAnketaForm.tsx`** — новый. Полный UI анкеты (4 секции в карточках: хронические, операции, препараты, заметка). Контролируемый:
   - `value: { chronic: string[]; medications: string[]; operations: Record<string, unknown>; healthNote: string }`
   - `onChange: (patch) => void`
   - Внутри: чипы + кастомные input/Добавить, операции Да/Нет + поле деталей по `surgery_year`, textarea для заметки. Логика toggleChronic/toggleMed/setOperation и эксклюзивных опций («Нет хронических…», «Ничего из перечисленного») переезжает сюда.

2. **`src/components/register/RegisterStep3.tsx`** — упрощается до:
   - заголовок «История болезней» + подсказка,
   - `<MedicalAnketaForm value={...} onChange={...} />` (chronic мапится в `medicalHistory` формате `Хронические заболевания|<name>` для совместимости с триггером `handle_new_user`),
   - предупреждение, кнопки Назад/Отправить.

3. **`src/components/profile/EditMedicalHistoryDialog.tsx`** — внутри тот же `<MedicalAnketaForm />`. Удаляем подзаголовок «Те же поля, что и в анкете при регистрации». Логика сохранения (medical_history + profiles.medications/operations/health_note) остаётся.

4. **Фикс обводки инпута** в диалоге: `overflow-y-auto` обрезает focus ring `ring-2`. Исправляем горизонтальные отступы скролл-контейнера на `px-1` (вместо `pr-1`), чтобы 2px рамка инпута влезала с обеих сторон.

## Технические детали

- Константы (`CHRONIC_CHIPS`, `MEDICATIONS_CHIPS`, `OPERATIONS`, `CHRONIC_CATEGORY`) уже в `src/lib/medicalAnketa.ts` — оба места берут оттуда.
- `MedicalAnketaForm` не знает про БД и формат `category|condition`. Маппинг делает только `RegisterStep3` (для сохранения в metadata) и `EditMedicalHistoryDialog` (для записи в `medical_history`).
- В диалоге внутри `DialogContent max-w-2xl max-h-[85vh]` скролл-контейнер: `flex-1 overflow-y-auto space-y-6 px-1 py-1` — чтобы рамки и тени не обрезались по краям.
