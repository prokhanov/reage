# Унификация админских страниц

## Проблема

Сейчас каждая страница в `/admin/*` собрана по-своему:

| Страница | Обёртка | Заголовок |
|---|---|---|
| AISettings | `container mx-auto p-6 max-w-6xl` | `text-3xl` |
| AnalysisBookings | `container mx-auto p-6 space-y-6` (без max-w) | `text-3xl` |
| DataManagement | `container mx-auto px-4 py-8 max-w-6xl` | `text-3xl` |
| EmailSettings | `container mx-auto px-4 py-8 max-w-7xl` | `text-2xl` |
| LabLocations | `container max-w-7xl py-6` (без px) | `text-2xl` |
| MyAssignments | `container mx-auto p-6 space-y-6` | `text-3xl` |
| Patients | `container mx-auto px-4 py-8 max-w-6xl` | `text-3xl` |
| PaymentGatewaySettings | `container max-w-7xl mx-auto px-4 py-8` | `text-2xl md:text-3xl` |
| **SmsSettings** | **`space-y-6` — без контейнера и отступов вовсе** | `text-2xl` |
| SubscriptionPlans | `container max-w-7xl mx-auto py-8` (без px) | `text-3xl` |
| TelegramSettings | `container mx-auto p-6 space-y-6 max-w-4xl` | `text-3xl` |
| UserManagement | разный | разный |

Плюс зоопарк лоадеров: где-то `*Skeleton`-компонент, где-то inline `<Skeleton/>`, где-то `<Loader2 className="animate-spin" />` без обёртки.

## Решение

1. **Новый компонент `src/components/admin/AdminPageShell.tsx`** — единый каркас:
   - корневой `div`: `container mx-auto px-4 py-8 max-w-7xl space-y-6`
   - заголовок: `h1.text-3xl.font-bold.tracking-tight` + опциональное `description` (`text-muted-foreground`)
   - слот `actions` справа от заголовка (для кнопок типа «Добавить», «Сохранить»)
   - проп `loading` → отрисовывает стандартный набор `<Skeleton/>` (header + 3 карточки) вместо детей
   - проп `bare` (default `false`) — отключает контейнер/паддинги: нужен только для `PatientProfile`, который встраивается в режим «Просмотр кабинета пациента». В этом случае `PatientProfile` остаётся как есть и не оборачивается в Shell.

2. **Единый лоадер `src/components/admin/AdminPageLoader.tsx`** (используется внутри Shell, но также экспортируется для случаев частичной загрузки внутри табов). Заменяет inline `Loader2` спиннеры на странице.

3. **Применить ко всем страницам `/admin/*` кроме `PatientProfile`, `ScaleLabelsPreview`, `ReportVisualsTest`** (последние два — служебные превью, не трогаем):
   - AISettings, AnalysisBookings, DataManagement, EmailSettings, LabLocations, MyAssignments, Patients, PaymentGatewaySettings, SmsSettings, SubscriptionPlans, TelegramSettings, UserManagement.
   - В каждой: заменить корневой `<div>` на `<AdminPageShell title="…" description="…" actions={…} loading={…}>` и убрать дублирующиеся `h1`/обёртки.
   - Существующие специализированные скелетоны (`AISettingsSkeleton`, `DataManagementSkeleton`, `UserManagementSkeleton`, `PatientsListSkeleton`, `AnalysisBookingsSkeleton`) **оставляем** — передаём их в Shell через `loadingSkeleton` слот, чтобы не терять их верстку.

4. **PatientProfile не трогаем по корню** — там `p-6 space-y-6` нужен для встраивания в `ViewAsPatientContext`. Меняем только размер заголовка на тот же `text-3xl font-bold tracking-tight` (он и так такой).

## Что не меняется

- Никакой бизнес-логики, запросов, состояний, табов внутри страниц.
- Никаких правок в `DashboardLayout`, `AppSidebar`, `ViewAsPatientContext`, `PatientRoute`, `StaffRoute`.
- Режим «Просмотр как пациент» работает как раньше: его контейнер выше по дереву (`DashboardLayout`), а админские страницы в этом режиме не открываются.

## Технические детали

`AdminPageShell` (упрощённо):

```tsx
type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode; // если задан — рендерим его вместо дефолтного
  children: ReactNode;
};
```

Дефолтный скелетон: `Skeleton h-9 w-64` (заголовок) + 3× `Skeleton h-32 w-full` в `space-y-4`.

## Объём

~13 файлов: 2 новых компонента + правки шапок на 11 страницах. Логика, обработчики, табы, формы — без изменений.
