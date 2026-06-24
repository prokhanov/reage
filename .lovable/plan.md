## Проблемы (мобилка 390px, `/recommendations`)

**Экран списка**
- Заголовок `text-3xl` градиентом — перенос с уродливым межсловным растяжением.
- Таблица 3-колоночная: «Действия» обрезается («Действ»), корзина уезжает за край, дата ломается на 3 строки, бейдж «Подтверждён» налезает на колонку «Разделов», нет видимой CTA «Открыть».

**Диалог просмотра отчёта**
- `DialogContent` `h-[90vh] w-[95vw]` + жёсткий `w-64` sidebar «Содержание» съедает большую часть экрана 390px → контент сжат в ~110px → «не читается из-за меню».
- Шапка модала `px-8 py-6` и заголовок `text-2xl` градиент — добивают мобильную ширину.

## Что меняю (только `src/pages/Recommendations.tsx`)

### Список
- Заголовок `text-2xl md:text-3xl leading-tight`, подзаголовок `text-sm`.
- На мобиле (`md:hidden`) — карточки вместо таблицы:
  - `rounded-2xl border-primary/20 bg-card/50 p-4`, клик по карточке = `handleView`.
  - Дата `text-base font-semibold` в одну строку + `AnalysisStatusBadge` рядом.
  - Подстрока «Разделов: N» `text-xs text-muted-foreground`.
  - Нижний ряд `flex items-center justify-between`: кнопка «Открыть отчёт» (`bg-gradient-primary h-9 rounded-xl` + `Eye`), справа `Edit`/`Trash2` `variant="ghost" size="icon"` со `stopPropagation`.
- На десктопе (`hidden md:block`) оставляю текущую `<Card><Table>` без изменений.

### Диалог
- `DialogContent`: `h-[100dvh] w-screen max-w-none rounded-none p-0 sm:h-[90vh] sm:w-[95vw] sm:max-w-7xl sm:rounded-lg`.
- Корневой flex: `flex h-full min-h-0 flex-col md:flex-row`.
- Сайдбар «Содержание» прячу на мобиле (`hidden md:flex`).
- В шапке контента добавляю кнопку-триггер «Содержание» (`List` icon), открывающую `<Sheet side="left">` с тем же списком секций; клик по пункту → `scrollToSection` + закрытие sheet.
- Шапка контента: `px-4 sm:px-8 py-3 sm:py-6`, `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
  - Слева на мобиле: кнопка «Содержание» + `text-base` заголовок «Отчёт от {дата}»; на десктопе — текущий `DialogTitle text-2xl` градиент + `DialogDescription`.
  - Справа: «Скачать PDF» на мобиле иконкой (`Download` + `sr-only` подпись), на десктопе как сейчас.
- Контент: `px-4 sm:px-8 py-4 sm:py-6`; заголовки секций `text-xl sm:text-2xl`; обёртки `p-4 sm:p-6`.

### Не трогаю
- `handleView`, `handleEdit`, `handleDeleteClick`, `handleExportPDF`, snapshot-рендеринг, нутрицевтики, advisory — без изменений.

### Импорты
- `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger` из `@/components/ui/sheet`.
- Иконки `Eye`, `List` из `lucide-react`.

### Проверка
- Playwright @ 390×844: карточки читаются, иконки не обрезаны; диалог во весь экран, меню скрыто за кнопкой, текст отчёта на полную ширину.
