## Проблемы на мобилке (/prescriptions)

По скриншоту 390px:
1. Карточки нутрицевтиков и блоков «Питание / Активность / Сон / Доп. консультации» имеют рамку + `p-6`, что вместе с боковыми отступами страницы (`px-4`) даёт двойную рамку и двойной отступ — та же проблема, что мы уже решили для биомаркеров и для отчёта.
2. Заголовки `h1` «Рекомендации» (`text-3xl`) и `h2` «Питание и коррекция образа жизни» (`text-2xl`) на 390px переносятся и съедают экран.
3. Между блоками слишком большие промежутки: `container py-8` + `space-y-6` + `TabsContent space-y-8`.
4. Метаданные «Создано / Статус» под нутрицевтиком прицеплены к карточке через `border ... border-t-0 -mt-4`. Когда у самой карточки на мобиле убрать рамку, этот футер «болтается» — его тоже надо обезрамить на мобиле.

Подход — тот же набор инструментов, что и для биомаркеров и для модалки отчёта: tailwind-модификатор `max-sm:` + `!`-важность, ничего не менять для десктопа.

## Что меняю

### `src/components/prescriptions/PrescriptionCard.tsx`
- На карточке (`rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6`) добавить на мобиле:
  `max-sm:!border-0 max-sm:!bg-transparent max-sm:!backdrop-blur-none max-sm:!p-0 max-sm:!rounded-none`.
- Блоку «Причина» (`p-3 rounded-md bg-primary/5 border border-primary/10`) оставить как есть — это внутренний акцент, не дублирует внешнюю рамку.

### `src/components/prescriptions/AdvisorySections.tsx`
- Трём lifestyle-карточкам (Питание / Физ. активность / Сон) и follow-up карточкам — тот же набор `max-sm:!border-0 max-sm:!bg-transparent max-sm:!backdrop-blur-none max-sm:!p-0 max-sm:!rounded-none`.
- H2 «Питание и коррекция образа жизни» и «Дополнительные консультации и обследования»: `text-2xl` → `text-xl sm:text-2xl`.
- Внешний `space-y-8` → `space-y-6 sm:space-y-8`.

### `src/pages/Prescriptions.tsx`
- Контейнер: `container mx-auto px-4 py-8 max-w-6xl space-y-6` → `... py-4 sm:py-8 ... space-y-4 sm:space-y-6`.
- H1 «Рекомендации» `text-3xl` → `text-2xl sm:text-3xl`, убрать пустой `<p>{"\n"}</p>` (даёт лишний воздух).
- H2 «Нутрицевтики (N)» `text-2xl` → `text-xl sm:text-2xl`.
- `TabsContent value="active" space-y-8` → `space-y-6 sm:space-y-8`.
- Футер карточки нутрицевтика (`flex items-center justify-between pt-4 px-6 pb-4 border-t border-border/30 -mt-4 rounded-b-lg border border-border/50 bg-card/50 backdrop-blur border-t-0`):
  - на мобиле убрать рамку и фоновые модификаторы: добавить `max-sm:!border-0 max-sm:!bg-transparent max-sm:!backdrop-blur-none max-sm:!px-0 max-sm:!pt-2 max-sm:!pb-0 max-sm:!mt-0 max-sm:!rounded-none`.

## Чего НЕ трогаю
- Десктоп-стили (всё под `sm:` или `max-sm:` важностью).
- Логику фильтрации/загрузки/мутаций.
- Баннер «Ожидайте звонка менеджера» — он на другой странице/уровне.
- Структуру вкладок Активные/Архив.

## Проверка
После правок — сделать playwright-скрин на 390×844 страницы `/prescriptions` и сравнить: рамок у карточек не должно быть, отступы между блоками заметно меньше, заголовки в одну строку или короче по высоте.
