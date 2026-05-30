## Проблема

После «Выход» пользователя крутит в петле `/dashboard ↔ /profile` (видно на `test.reage`).

## Причина (после предыдущего фикса)

Гонка сохранилась, потому что `handleLogout` ведёт на `/`, а `Index.tsx` имеет роль‑роутер: если `getSession()` мгновенно вернул ещё не очищенную локальную сессию (или ушёл в таймаут с фоновой проверкой), Index делает `navigate("/dashboard")`. Дальше:

- `/dashboard` рендерит `<PatientRoute>` (внутри `<ProtectedRoute>`). При null‑сессии `ProtectedRoute` асинхронно отправит на `/auth`, но `PatientRoute` уже успевает побежать к `getUser()` и при пустом юзере (фикс ранее) уходит на `/auth` — а до этого мог моргнуть и `/profile`.
- В реальности пользователь видит мигание `/dashboard` → `/profile` → `/dashboard` → …

Корень проблемы — то, что выход маршрутизируется через `Index`, у которого нет защиты от устаревшего кэша сессии.

## Что меняем (только фронт)

### 1. `src/components/AppSidebar.tsx` — `handleLogout`
- Навигировать сразу на `/auth`, минуя `Index` и его роль‑роутер:
  ```ts
  await supabase.auth.signOut();
  queryClient.clear();
  toast({ title: "Вы вышли из системы" });
  navigate("/auth", { replace: true });
  ```

### 2. `src/pages/Profile.tsx` — `handleLogout`
- То же: `navigate("/auth", { replace: true })` после `signOut + queryClient.clear`.

### 3. `src/pages/RegisterStaff.tsx` — `signOut`
- Если используется как «выход» из staff‑регистрации с переходом на главную, оставить как было; здесь ничего не трогаем (вне сценария жалобы).

### 4. `src/pages/Index.tsx` — защита от стейл‑сессии (страховка)
- В `redirectByRole` перед навигацией выполнить дополнительную проверку `supabase.auth.getUser()`; если `user === null` — остаться на лендинге, не редиректить на `/dashboard`.
- Это убирает риск повторного попадания в защищённую зону при любых будущих сценариях, где logout проходит через `/`.

## Что НЕ трогаем

- `PatientRoute / StaffRoute / AdminModuleRoute` — уже исправлены в прошлой итерации (unauth → `/auth`).
- `ProtectedRoute`, edge‑функции, бэкенд, пайплайн отчётов.

## Результат

После «Выход» пользователь сразу попадает на `/auth` без промежуточных `/dashboard` и `/profile` и без миганий.
