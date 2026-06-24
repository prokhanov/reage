## 1. Экран выбора тарифа — улучшения для мобильной версии

Файлы: `src/pages/Subscription.tsx`, `src/components/subscription/PlanCard.tsx`, `src/components/subscription/PromoCodeField.tsx`.

**Subscription.tsx (hero + переключатель периодов):**
- Уменьшить вертикальные отступы: `py-8 md:py-12` → `py-4 md:py-12`, `mb-12` → `mb-6 md:mb-12` для hero и переключателя.
- Иконка-кружок: `w-12 h-12 md:w-20 md:h-20`, иконка внутри `h-6 w-6 md:h-10 md:w-10`, `mb-2 md:mb-4`.
- Заголовок: `text-2xl md:text-5xl leading-tight`, подзаголовок `text-sm md:text-lg px-2`.
- ToggleGroup периодов: сделать full-width grid на мобиле (`grid grid-cols-2 sm:inline-flex` если периодов 4, иначе `grid-cols-N`), кнопки `px-2 md:px-6 text-sm` чтобы не переносились.
- Trust indicators: `gap-x-4 gap-y-2 text-xs md:text-sm`.

**PlanCard.tsx (главная боль на мобиле):**
- Padding: `CardHeader` `pb-3 md:pb-4`, `CardContent` `space-y-3 md:space-y-4`, `CardFooter pt-4 md:pt-6`.
- Имя тарифа: `text-xl md:text-2xl mb-1 md:mb-2`.
- Описание: убрать `min-h-[40px]` на мобиле (`md:min-h-[40px]`) — съедает место в стопке.
- Цена: `text-3xl md:text-4xl`, перечёркнутая `text-xl md:text-2xl mr-1 md:mr-2`.
- «Экономия / +N мес»: `text-xs md:text-sm pt-1 md:pt-2`.
- Список фич: `text-[13px] md:text-sm`, иконка `w-4 h-4 md:w-5 md:h-5`, gap `gap-1.5 md:gap-2`.
- Кнопка `Оформить`: оставить `h-12`, но `text-sm md:text-base`.
- Бейдж `-top-3` уже ок; добавить `whitespace-nowrap max-w-[90%] truncate`.
- На грид: `gap-4 md:gap-6 lg:gap-8` (сейчас `gap-6` слишком много на мобиле для одной колонки — отступы между большими карточками увеличивают скролл).

**PromoCodeField.tsx:**
- В режиме ввода `flex gap-2` ломается на узком экране (3 кнопки). Сделать `flex-col sm:flex-row`, кнопки `flex-1 sm:flex-none`, input на отдельной строке (`w-full`).
- Applied-карточка: `px-3 py-2.5 md:px-4 md:py-3`, текст метаданных `text-[11px] md:text-xs`.

## 2. ActiveSubscription — привязка к админке тарифов

Сейчас запрос в `Subscription.tsx` тянет только `display_name, description, features`. Админка (`SubscriptionPlans.tsx` + `useSubscriptionPlans`) редактирует ещё `badge_text`, `badge_color`, `comparison_highlights`, период/цены через `subscription_pricing`.

**Что меняется:**

`src/pages/Subscription.tsx` — расширить select активной подписки:
```ts
subscription_plans (
  display_name, description, features,
  badge_text, badge_color, comparison_highlights
)
```
Дополнительно отдельным запросом или join подтянуть `subscription_pricing` записи для `plan_id` подписки, чтобы взять `period_display` соответствующий `subscription.plan_type` (сейчас период маппится локальным словарём в `getPeriodLabel`, что игнорирует админскую редактуру `period_display`).

`src/components/subscription/ActiveSubscription.tsx`:
- Типы пропов расширить новыми полями плюс опциональный `period_display`.
- В шапке карточки рядом с `Badge "Активна"` показывать `badge_text` плана с учётом `badge_color` (как в `PlanCard`), если задан.
- Поле «Период/тариф»: вместо локального словаря показывать `period_display` из админки (fallback на текущий словарь).
- Под фичами добавить блок **Что выделяет ваш тариф** из `comparison_highlights` (label/value, grid 1/2 колонки), если массив непустой.
- Источник `features` уже из плана — оставить.

Никаких изменений в БД и админке не требуется, читаем уже существующие поля.

## Технические детали

- Запрос активной подписки расширяется в `Subscription.tsx` (внутри `useQuery`), дополнительно делается lookup `subscription_pricing` по `(plan_id = subscription.plan_id, ...)` — выбираем запись с `duration_months`, совпадающим по периоду оплаты (используем поле `plan_type` или, если его не хватает, добавляем выборку всех pricing для плана и подбираем по сумме `amount === subscription.amount`).
- `PlanCard` и `ActiveSubscription` без изменений бизнес-логики — только tailwind-классы и рендер дополнительных полей плана.
- `PromoCodeField` сохраняет API (`applied`, `onApplied`, `context`), меняется только разметка inline-формы.

## Что НЕ трогаем

- Логика оплаты, robokassa, промокоды, RLS, миграции.
- Дизайн десктопа — все правки через `md:`-варианты.
- Компонент `ActiveSubscription` остаётся ответственным только за отображение; никакой бизнес-логики не добавляем.
