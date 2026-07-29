## Проблема

Сейчас `src/App.tsx` статически импортирует **все ~50 страниц** приложения (весь ЛК пациента, вся админка, отчёты, юридические страницы, редактор отчёта с pdf.js). Rollup обязан собрать всё это в **один главный чанк** — `index-*.js` весит **6.7 МБ несжатыми / ~2.4 МБ gzip**.

Проверено на текущем проде:

- `App.tsx:26` — `import Recommendations` → тянет `ReportV2Dialog` → `ReportV2Editor` → `ReportPdfView` → `pdfjs-dist` (тот самый `Iterator.prototype.join`, который валил iOS 17.5).
- `App.tsx:36` зачк— `DemoReport` — та же цепочка.
- `App.tsx:41-56` — 16 админских страниц (AISettings, DataManagement, PromoCodes, EmailSettings и т.д.), ни одна из них не нужна анонимному посетителю "/".

Поэтому посетитель лендинга скачивает и парсит код редактора отчётов, всей админки, всех дашбордов — даже если он никогда туда не пойдёт. На слабом мобильном 3G это +3–5 секунд к TTI, а на старых движках дополнительно вызывает крах ещё до маунта React.

## Что делаем

Переводим **все роуты, кроме публичного лендинга и лёгких статических страниц**, на `React.lazy` + `Suspense`. Лендинг (`Index`) и его прямые «спутники» (`LandingV2`, `NotFound`) оставляем статикой, чтобы первый экран не терял ни миллисекунды.

### Категории роутов и как их резать

**Оставляем статикой** (нужно на первом рендере "/"):

- `Index`, `LandingV2`, `NotFound`
- провайдеры и guard-компоненты (`ProtectedRoute`, `PatientRoute`, `StaffRoute`, `AdminModuleRoute`, `SuperAdminRoute`, `OnboardingGate`, `DashboardLayout`, `RegisterGuardProvider`, `RouteMeta`, `YandexMetrika`, `JivoVisibility`) — они уже маленькие и нужны сразу.

**Переводим на `lazy()**` — три группы чанков:

1. **Auth / регистрация / публичные утилиты** (грузятся при переходе на `/auth`, `/register`, `/reset-password`, `/verify-email`, `/unsubscribe`, `/lifestyle-test`, `/prep`, `/faq`, `/register-staff`):
  - `Auth`, `Register`, `RegisterStaff`, `ResetPassword`, `VerifyEmail`, `Unsubscribe`, `LifestyleTest`, `AnalysisPrep`, `Faq`, `Onboarding`.
2. **ЛК пациента** (`patient` chunk — грузится после логина):
  - `Dashboard`, `Profile`, `Analyses`, `AnalysisDetail`, `AnalysesPrint`, `Biomarkers`, `Recommendations`, `Prescriptions`, `Trends`, `MyState`, `HealthAssistant`, `Subscription`, `SubscriptionSuccess`, `SubscriptionFail`, `HealthStrategy`, `ExampleReport`, `DemoReport`.
  - **Именно этот чанк унесёт `pdfjs-dist**` — он больше не будет в главном бандле.
3. **Админка** (`admin` chunk — грузится только при заходе в `/admin/*`):
  - `AISettings`, `DataManagement`, `Patients`, `PatientProfile`, `UserManagement`, `AnalysisBookings`, `MyAssignments`, `SubscriptionPlans`, `PaymentGatewaySettings`, `ReportVisualsTest`, `ScaleLabelsPreview`, `EmailSettings`, `SmsSettings`, `TelegramSettings`, `LabLocations`, `PromoCodes`.
4. **Юридические страницы** (`legal` chunk — редко посещаются):
  - `Requisites`, `PrivacyPolicy`, `TermsOfService`, `ConsentData`, `ConsentResearch`, `Documents`, `Compliance`.
5. **Внутренние страницы под сервисные интеграции**:
  - `ReportPreview` (Playwright для PDF-рендера) и `ReportV2Standalone` (открытие отчёта в новой вкладке) — тоже `lazy`, попадут в тот же чанк, что и pdf/редактор отчёта.

### Как это выглядит в коде

Внутри `src/App.tsx` заменяем все нужные `import X from "./pages/X"` на:

```ts
import { lazy, Suspense } from "react";
const Dashboard = lazy(() => import("./pages/Dashboard"));
// …и так далее по списку выше
```

Оборачиваем `<Routes>` (или блок каждой группы) в **один общий `<Suspense fallback={<RouteFallback />}>**`. `RouteFallback` — тот же ring-спиннер (`Loader2`), что мы уже используем на лендинге и в админке (`AdminModuleRoute`), чтобы визуально не появлялось нового элемента.

Для контроля именования чанков (чтобы в диагностике было понятно, что тормозит) можно использовать группировку через `manualChunks` в `vite.config.ts`, но это опционально — Rollup и сам сгруппирует.

## Что это даст

- Главный чанк `index-*.js` для лендинга: с **~6.7 МБ → ожидаемо ~1.5–2 МБ** (React + router + провайдеры + `Index.tsx` с его секциями).
- `pdfjs-dist` (~1.5 МБ) уезжает в отдельный чанк, который скачивается **только** при открытии отчёта — лендинг перестаёт его тянуть.
- Первый экран быстрее на слабых сетях (3G/EDGE в регионах), меньше нагрузки на парсер JS на старых Android.
- Уменьшается риск повторения инцидентов вроде `ReferenceError: Can't find variable: Iterator` — тяжёлые библиотеки просто не выполняются на лендинге.

## Технические детали

- Всё остаётся под тем же `BrowserRouter` — SPA-навигация без изменений, никаких SSR.
- `default export` у страниц уже есть — `React.lazy` требует именно default, дополнительных правок в самих pages не нужно.
- Guard-компоненты (`ProtectedRoute`, `AdminModuleRoute` и т.п.) продолжают работать как обёртки — они рендерятся синхронно, а внутренний `<Component />` подгружается lazy.
- `EmailVerificationListener`, `RouteMeta`, `YandexMetrika`, `JivoVisibility` не трогаем.
- Полифилл `Iterator` в `index.html` **оставляем** — он страхует не только pdf.js, но и любую другую библиотеку, которая может прийти в будущем.

## Что НЕ входит в этот план

- Не трогаем `Index.tsx` и его внутренние `lazy`-секции — они уже подгружаются постепенно.
- Не меняем контракты страниц, роуты и логику авторизации.
- Не занимаемся дальнейшей оптимизацией внутри отдельных страниц (можно отдельно после — например, `Recommendations` → `ReportV2Dialog` можно ещё раз разбить).
- Не меняем `target` сборки — уже сделано ранее.

## Проверка после реализации

1. Соберём прод-бандл и убедимся, что `pdfjs`, `recharts`, `framer-motion` (тяжёлые) не сидят в `index-*.js`, а лежат в отдельных чанках.
2. Откроем "/" на iPhone 17.5.1 — лендинг должен грузиться быстрее и без обращений к `Iterator`.
3. Пройдёмся по ключевым переходам (`/auth`, `/dashboard`, `/admin/patients`, `/recommendations`) — проверим, что `Suspense`-фаллбэк отображается корректно и ничего не мерцает.