## Что делаем
На моб/планшетe (< lg) sticky-панель в просмотре отчёта (`ReportV2Editor.tsx`) переделываем:

- Позиция: `sticky top-0` с `-mx-4 -mt-4 px-4 py-2` (компенсируем родительский `p-4` в `ReportV2Dialog`), чтобы панель прилипала к самому верху дилога, край-в-край.
- Фон: полностью непрозрачный `bg-background` (без `bg-muted/30`, без `backdrop-blur`, без opacity), тонкая нижняя граница `border-b border-border`, `shadow-sm`.
- Слева: селект разделов на всю доступную ширину (`flex-1`).
- Справа: две иконочные кнопки в ряд:
  - `⋮` (Lucide `MoreVertical`) — открывает Popover c пунктами:
    - «В новом окне» (только в `compact` режиме, как сейчас)
    - «Скачать PDF»
    - «Обновить страницы» + «Постранично/Потоком» (в не-`compact` режиме, чтобы не потерять функционал)
  - `✕` (Lucide `X`) — закрывает диалог.
- На десктопе (`lg:`) поведение остаётся прежним: панель с этими же кнопками в ряд, без kebab и без крестика (крестик и так есть у `DialogContent`).

## Как передать «закрыть»
`ReportV2Editor` сейчас не знает про диалог. Добавляем опциональный проп `onClose?: () => void`:
- В `ReportV2Dialog` пробрасываем `onClose={() => onOpenChange(false)}`.
- В `ReportV2Standalone` не пробрасываем — крестик там не показываем.
- В `Recommendations.tsx`/других местах где `ReportV2Editor` рендерится без диалога — тоже не пробрасываем.

## Файлы
1. `src/components/reportV2/ReportV2Editor.tsx`
   - Добавить проп `onClose`.
   - Импорт `MoreVertical`, `X`; `Popover`, `PopoverTrigger`, `PopoverContent` из `@/components/ui/popover`.
   - Переписать `toolbarWrap`: sticky top-0, непрозрачный фон, «раздвинуть» на края, справа kebab + ✕ (моб) / прежние inline-кнопки (`lg:flex`).
   - Извлечь общий список действий (`refreshPagination`, `paginated toggle`, `openInNewWindow`, `downloadPdf`) в массив/фрагмент, чтобы использовать и в inline-виде, и внутри Popover.
2. `src/components/reportV2/ReportV2Dialog.tsx`
   - Передать `onClose={() => onOpenChange(false)}` в `ReportV2Editor`.
   - Скрыть встроенный крестик у `DialogContent` (обычно есть по-умолчанию): либо оставить как есть если он и так спрятан, либо убедиться, что мы не рисуем два ✕. Проверить в момент имплементации.

## Что не трогаем
- Сайдбар с разделами (`ReportSectionNav` `sidebar` variant) на десктопе.
- Логику скролла/`useActiveSection`.
- Всё, что не касается верхней панели.

## Проверка
Playwright 390×844 и 820×1180, `/internal/report-v2?...`:
- панель у самого верха, непрозрачная, край-в-край;
- kebab открывает меню с «В новом окне» и «Скачать PDF»;
- ✕ (в диалоговом контексте) закрывает диалог.
