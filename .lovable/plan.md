
## Аудит и унификация тостов

### Текущая ситуация

- **Две системы одновременно**: `useToast` (shadcn) — в 89 файлах; `sonner` — в 4 файлах (`admin/DataManagement.tsx`, `admin/ReportVisualsTest.tsx`, `admin/DaySlotsManager.tsx`). У них разный API и разный внешний вид.
- В `App.tsx` импортируется `Sonner` Toaster, но **не рендерится** — то есть `toast.success(...)` из тех 4 файлов сейчас вообще не показывается пользователю.
- Жёстко зашитых английских строк в литералах тостов нет. Но в ~85 местах `description` выводит сырой `error.message` от Supabase Auth / Postgres / Edge runtime — это и есть «непонятные английские надписи».

### Что сделаем

#### 1. Единый компонент — `sonner`

Sonner красивее, мобильнее, поддерживает `promise`, стек, swipe-to-dismiss. Переходим на него полностью.

- В `App.tsx`: убираем `<Toaster />` (shadcn), оставляем единственный `<Sonner />` с нашими настройками (позиция `top-center` на мобиле / `bottom-right` на десктопе, тема из `next-themes`, `richColors`, `closeButton`).
- В `src/components/ui/sonner.tsx` донастраиваем визуал под наш дизайн-токен (radius, shadow, padding) — один источник правды для внешнего вида.

#### 2. Тонкая обёртка `src/lib/toast.ts`

Единая логика вызова, чтобы по всему коду был один и тот же API:

```ts
notify.success(title, description?)
notify.error(title, errorOrDescription?)   // авто-перевод error.message
notify.info(title, description?)
notify.warning(title, description?)
notify.promise(promise, { loading, success, error })
```

`notify.error` внутри прогоняет аргумент через `translateError` (см. ниже), так что нельзя случайно показать сырой английский `e.message`.

#### 3. Словарь переводов `src/lib/errorMessages.ts`

Функция `translateError(err: unknown, fallback?: string): string` распознаёт по подстрокам/кодам типичные ошибки Supabase Auth, Postgres, Storage, Edge runtime:

| Английский оригинал | Русский перевод |
|---|---|
| Invalid login credentials | Неверный email или пароль |
| Email not confirmed | Email ещё не подтверждён |
| User already registered | Пользователь с таким email уже зарегистрирован |
| Password should be at least N characters | Пароль должен содержать минимум N символов |
| New password should be different from the old password | Новый пароль должен отличаться от текущего |
| weak_password / Password is known to be weak | Этот пароль слишком простой. Выберите другой |
| Email rate limit exceeded | Слишком много писем. Попробуйте через пару минут |
| For security purposes, you can only request this after N seconds | В целях безопасности повторите попытку через N сек |
| Token has expired or is invalid | Ссылка устарела. Запросите новую |
| Unable to validate email address: invalid format | Некорректный формат email |
| User not found | Пользователь не найден |
| duplicate key value violates unique constraint | Запись с такими данными уже существует |
| new row violates row-level security policy / permission denied | Недостаточно прав для этого действия |
| null value in column ... violates not-null constraint | Заполните обязательное поле |
| value too long for type ... | Значение слишком длинное |
| foreign key constraint ... | Невозможно: запись связана с другими данными |
| Failed to fetch / NetworkError / FunctionsHttpError | Не удалось связаться с сервером. Проверьте интернет |
| Payload too large | Файл слишком большой |
| The resource already exists | Файл с таким именем уже существует |
| JSON parse error / Unexpected end of JSON input | Сервер вернул некорректный ответ. Попробуйте ещё раз |

Для нераспознанной ошибки возвращается `fallback` (или общее «Что-то пошло не так. Попробуйте ещё раз»). Сырой английский `message` пользователю **никогда** не показывается; он только пишется в `console.error` для разработчика.

#### 4. Массовая замена по всему коду

- Все `import { useToast } from "@/hooks/use-toast"` и `import { toast } from "sonner"` → `import { notify } from "@/lib/toast"`.
- `toast({ title, description, variant: "destructive" })` → `notify.error(title, errorOrText)`.
- `toast({ title, description })` → `notify.success(title, description)` (или `.info` по смыслу).
- `description: error.message` → `notify.error("Не удалось <действие>", error)` (с осмысленным заголовком).

Файлы (96 шт.), сгруппировано:
- **hooks**: `usePromoCodes`, `usePromoSettings`, `usePricing`, `useAISettings`, `useAvailabilitySlots`, `usePlans`, `usePlanBiomarkers`, `useChatConversations`
- **pages**: `Auth`, `Register`, `RegisterStaff`, `ResetPassword`, `Onboarding`, `Subscription`, `MyState`, `HealthStrategy`, `HealthAssistant`, `Recommendations`, `Prescriptions`, `AnalysisDetail`, `Analyses`, `Trends`, `Biomarkers`, `Profile`, и весь `pages/admin/*`
- **components**: `PassportDataDialog`, `CallbackRequestDialog`, `SubscriptionRequiredDialog`, `PasswordResetTokenHandler`, `subscription/*`, `profile/*`, `admin/*` (включая email-папку), `auth/VerificationDialogs`, `analysis/AnalysisBookingBanner` и др.

#### 5. Чистка

- Удаляем `src/hooks/use-toast.ts` и `src/components/ui/toaster.tsx` (shadcn-toaster), чтобы исключить рецидив.
- В корне `App.tsx` остаётся ровно один `<Sonner />`.

### Проверка после рефакторинга

- `rg "from \"@/hooks/use-toast\""` → 0
- `rg "from \"sonner\"" src` → только `src/lib/toast.ts` и `src/components/ui/sonner.tsx`
- `rg "description:\s*\w+\??\.message"` → 0
- Сборка зелёная, ручной тест: неверный пароль на `/auth`, дубль промокода, отвалившийся интернет — везде русский, единый вид.

### Что НЕ трогаем

- Литералы заголовков на русском («Сохранено», «Промокод создан» и т.п.) — оставляем как есть.
- Тексты внутри edge-функций — отдельная задача, скажете — пройдусь.
