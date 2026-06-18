# Унификация внутренних элементов админки

После прохода по содержимому страниц вижу 4 конкретные несогласованности. Логику и состав вкладок не трогаю — только классы и общие компоненты.

## 1. TabsList — единый паттерн

Сейчас:
| Страница | className TabsList |
|---|---|
| DataManagement | `grid w-full max-w-3xl grid-cols-4` |
| UserManagement | `grid w-full grid-cols-2` |
| EmailSettings | `w-full flex-wrap justify-start` |
| SmsSettings | `flex-wrap` |
| PaymentGatewaySettings | `flex-wrap h-auto` |
| SubscriptionPlans | `mb-6` |
| AnalysisBookings, LabLocations, TelegramSettings | без className |

Делаю **один паттерн для основных табов страницы**:
```
className="w-full justify-start flex-wrap h-auto"
```
Заголовки табов (`TabsTrigger`) уже одинаковые — оставляю.
Внутренние/вложенные `TabsList` (внутри карточек — EmailSettings, SmsSettings) остаются `w-full justify-start overflow-x-auto` (как сейчас).

## 2. Заголовки секций/групп внутри карточек

Сейчас в одной странице соседствуют `text-xl font-semibold`, `text-lg font-semibold`, `font-semibold text-lg`. Делаю единый стиль для подзаголовков внутри страницы:
```
className="text-lg font-semibold"
```
Применяю в AISettings (h2: `text-xl` → `text-lg`) и причёсываю порядок классов в DataManagement.
`CardTitle` шадсиэновский трогать не буду — он уже консистентен; уберу только лишние `text-base` оверрайды у AISettings карточек промптов (там это делает их меньше остальных).

## 3. Единый компонент для status-баннеров

Сейчас в `SmsSettings`, `TelegramSettings`, `EmailSettings` тремя разными способами нарисован один и тот же «результат проверки/подключения»:
```
<div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${ok ? "bg-green-500/10 ..." : "bg-destructive/10 ..."}`}>
```

Сделаю общий `src/components/admin/StatusBanner.tsx`:
```tsx
type Variant = "success" | "error" | "info" | "warning";
<StatusBanner variant="success" icon={CheckCircle2}>...</StatusBanner>
```
Семантические токены: success → `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`, error → `bg-destructive/10 text-destructive`, info → `bg-muted text-muted-foreground`, warning → `bg-amber-500/10 text-amber-700 dark:text-amber-400`. Заменю 5 ручных мест.

## 4. Иконки в заголовках H1

Сейчас только LabLocations кладёт иконку рядом с H1 (`MapPin h-7 w-7`). Остальные страницы — без иконки. Чтобы не выбиваться, **уберу иконку из LabLocations H1** и оставлю просто текст. Иконки на TabsTrigger и в CardHeader остаются.

## Что НЕ меняю

- Логику, запросы, состояния, табличные данные, формы.
- `PatientProfile`, `ScaleLabelsPreview`, `ReportVisualsTest`.
- Режим «Просмотр кабинета пациента» — он не пересекается с этими правками.
- Шрифт/цвета (используются текущие токены).
- Существующие специализированные скелетоны и `Skeleton`-загрузки.

## Объём

~1 новый компонент (`StatusBanner`) + точечные правки className в 8 файлах. Без рефакторинга разметки.
