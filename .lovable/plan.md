## Проблема

Ошибки **HTTP 406 / PGRST116** в Network — это не сеть и не Россия. PostgREST возвращает 406, когда клиент шлёт `Accept: application/vnd.pgrst.object+json` (это даёт `.single()`), а в базе для запроса 0 строк. Запрос отрабатывает за 3–10 мс, всё ок на стороне инфраструктуры.

Для текущего пользователя `d950e0d2-...`:
- нет ни одного анализа → `analyses ... .single()` → 406
- в `profiles` нет height/weight (или строки) → 406
- нет ближайшей записи на анализ → 406
- не superadmin → 406
- нет admin permission на `patients` → 406

В коде эти ошибки попадают в `try/catch` хуков и компонентов Dashboard, переводят его в error-состояние, и страница «Моё здоровье» не отрисовывается.

## Решение

Заменить `.single()` на `.maybeSingle()` в местах, где «0 строк» — это валидный сценарий, а не ошибка. Это снимет 406, вернёт `data: null`, и компоненты будут штатно показывать «пусто» вместо краша.

## Файлы для правки

1. `src/hooks/useDemoMode.ts`
   - запрос `analyses ... limit(1).single()` → `.maybeSingle()` (нет анализов = norm)
   - запрос `profiles select height,weight ... .single()` → `.maybeSingle()`
   - проверить остальные `.single()` в файле (строки ~130, ~172, ~187, ~196)

2. `src/hooks/useSuperAdminCheck.ts` (стр. 22)
   - `user_roles ... role=eq.superadmin .single()` → `.maybeSingle()`

3. `src/hooks/usePatientModuleAccess.ts` (стр. 25, 43, 58)
   - проверки `user_roles` и `admin_permissions` → `.maybeSingle()`

4. `src/hooks/useScheduledBookingsCount.ts` и `src/components/dashboard/NextAnalysisCard.tsx`
   - запрос ближайшей записи `analysis_bookings ... booking_date=gte ... limit(1).single()` → `.maybeSingle()`

5. Заодно пройтись по остальным файлам из списка ниже и поправить `.single()` там, где 0 строк не ошибка (роуты ролей `StaffRoute`, `SuperAdminRoute`, `PatientRoute`, `AppSidebar`, `useUserRole`, `useEmailConfirmation`, `useEmailVerificationHandler`, `Auth.tsx`, `Index.tsx`):
   ```
   src/components/StaffRoute.tsx
   src/components/SuperAdminRoute.tsx
   src/components/PatientRoute.tsx
   src/components/AppSidebar.tsx
   src/hooks/useUserRole.ts
   src/hooks/useEmailConfirmation.ts
   src/hooks/useEmailVerificationHandler.ts
   src/pages/Auth.tsx
   src/pages/Index.tsx
   ```
   В каждом — заменить `.single()` → `.maybeSingle()` в SELECT, обработать `data === null` явно (вернуть `false` / пустое состояние / редирект, как уже подразумевалось).

## Что НЕ трогаем

- nginx / прокси-конфиг — он работает корректно.
- `.single()` после INSERT/UPDATE с `.select()` — там строка гарантирована.
- Запросы на админ-страницах, где сущность по id точно должна существовать (`PatientProfile`, `EditReportDialog` и т.п.) — оставляем `.single()`, чтобы реально ловить баги.

## Проверка

1. Открыть `/dashboard` под пользователем без анализов — страница должна отрисоваться (пустое состояние), без 406 в Network.
2. Открыть `/admin/patients` под не-superadmin — 406 на `user_roles`/`admin_permissions` пропадут.
3. Существующие пользователи с данными — поведение не меняется.
