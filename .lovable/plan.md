## Проблема

После «Выход» Алину (роль `patient`) выкидывает на `/profile`, страница не грузит данные — вместо чистого выхода на лендинг/логин.

## Причина

Гонка после `signOut()`:

1. `AppSidebar.handleLogout` зовёт `signOut()` и потом `navigate("/")`.
2. На `/` рендерится `Index.tsx`. У него ещё может быть закешированная сессия (или `getSessionWithTimeout` падает в таймаут) → срабатывает `redirectByRole` → `navigate("/dashboard")`.
3. `/dashboard` обёрнут в `<PatientRoute>`. Тот зовёт `supabase.auth.getUser()`, получает `user = null` → ставит `state = "denied"` → **`<Navigate to="/profile" replace />`**.
4. `/profile` сам по себе живёт под `ProtectedRoute`, но из‑за тех же таймаутов/гонок успевает отрендериться раньше, чем `ProtectedRoute` отправит на `/auth`. В итоге пользователь видит пустой `/profile` с 403 `session_not_found` в сети (видно в auth‑логах для `reage.lovable.app`).

То же самое поведение в `StaffRoute` и `AdminModuleRoute` — при отсутствии пользователя они тоже редиректят на `/profile`, что усиливает петлю.

На `reage.life` (apex) тайминги/куки складываются иначе, и `ProtectedRoute` успевает первым → лендинг/логин. На `test.reage` (preview) — нет.

## Что меняем (только фронт, без бизнес‑логики)

### 1. `src/components/PatientRoute.tsx`
- Если `user === null` (не залогинен) — возвращать `<Navigate to="/auth" replace />` вместо «denied → /profile».
- «denied» (залогинен, но не пациент) оставить как есть → `/profile`.

### 2. `src/components/StaffRoute.tsx`
- Аналогично: при `user === null` → `<Navigate to="/auth" replace />`.

### 3. `src/components/AdminModuleRoute.tsx`
- Аналогично: при `user === null` → `<Navigate to="/auth" replace />`.

### 4. `src/components/AppSidebar.tsx` — `handleLogout`
- После `await supabase.auth.signOut()` дополнительно:
  - `queryClient.clear()` (а не только invalidate `userRole`) — чтобы кеши не тянули стейл‑данные на следующей странице.
  - `navigate("/", { replace: true })` — заменяем историю, чтобы «Назад» не возвращал в защищённую зону.
- Тот же блок применить в `src/pages/Profile.tsx` `handleLogout` (там тоже `signOut` + `navigate("/")`).

## Что НЕ трогаем

- `ProtectedRoute`, `Index.tsx`, генерацию отчётов, бэкенд, edge‑функции — без изменений.
- Логика «denied для не‑пациента → /profile» остаётся: это валидный кейс (залогинен под другой ролью).

## Результат

После «Выход» пользователь всегда попадает на `/` (лендинг) или `/auth`, без промежуточного пустого `/profile` с 403‑ошибками.
