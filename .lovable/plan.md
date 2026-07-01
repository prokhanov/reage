## Проблемы

1. **Демо-режим показывается сотрудникам.** Переключатель в `src/pages/Profile.tsx` и логика в `DemoModeContext` не учитывают роль. У Проханова (superadmin и doctor) в БД `demo_mode_enabled=true` — контент подменяется демо-данными.
2. **Стафф авто-подтверждается при регистрации.** `supabase/functions/register-staff/index.ts` ставит одновременно `email_confirm: true` (Supabase `auth.users.email_confirmed_at`) и `email_verified: true` (`profiles`). Письмо подтверждения не отправляется — нарушает правило «два флага + верификация через нашу ссылку».
3. **Профиль стаффа показывает пациентские блоки.** `Profile.tsx` безусловно рендерит «Анкета здоровья», «История болезней», «Паспортные данные», «Следующий анализ», «Демо-режим» для любой роли.

## Что делаю

### Демо-режим — только для пациентов

- **UI (`src/pages/Profile.tsx`):** карточку «Демо-режим» и связанные проверки (`hasAnalyses`, `nextAnalysisDate`) показывать только когда `useUserRole().isPatient === true` и `!isRoleLoading`.
- **Контекст (`src/contexts/DemoModeContext.tsx`):**
  - в `fetchDemoModeStatus` перед включением проверять роль просматриваемого `userId` (запрос в `user_roles`); если не пациент — `setDemoMode(false)`, `setDemoData(null)` и мягко сбрасывать `profiles.demo_mode_enabled=false`;
  - в `toggleDemoMode` возвращать ошибку с тостом «Демо-режим доступен только пациентам» для не-пациентов.
- **Данные:** миграция-очистка `UPDATE profiles SET demo_mode_enabled=false WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role='patient')` — отключит демо у всех сотрудников, включая обе учётки Проханова (superadmin, doctor).

### Регистрация стаффа — без авто-подтверждения email

В `supabase/functions/register-staff/index.ts`:
- убрать `email_confirm: true` из `createUser` → `auth.users.email_confirmed_at` остаётся NULL;
- убрать `email_verified: true` из `profilePayload` (по умолчанию `false`);
- после успешного создания и назначения роли вызывать существующий `supabase.functions.invoke('send-verification-email', { body: { user_id: userId, email } })` — тот же общий шаблон, что и для пациентов;
- логин не блокируем — верификация не блокирующая, как в остальном проекте.

**Учётку `a.prokhanov@me.com` не трогаем** — оставляем как есть, чинится только для будущих регистраций.

### Профиль сотрудника — без пациентских блоков

В `src/pages/Profile.tsx`:
- подтянуть `useUserRole()`, ввести `isPatient`;
- пока `isRoleLoading` — `ProfileSkeleton`;
- только для пациентов рендерить: «Анкета здоровья» (`MedicalAnketaCard`), «История болезней», «Паспортные данные», «Следующий анализ», «Демо-режим»;
- всегда для всех: имя, ФИО, email/телефон, дата рождения, пол, смена пароля, выход.

## Файлы

- `supabase/functions/register-staff/index.ts` — убрать оба флага авто-подтверждения, добавить вызов `send-verification-email`.
- `src/contexts/DemoModeContext.tsx` — проверка роли, самоочистка `demo_mode_enabled` для не-пациентов, гард в `toggleDemoMode`.
- `src/pages/Profile.tsx` — скрыть пациентские секции для стаффа через `useUserRole`.
- Миграция (SQL): сброс `demo_mode_enabled=false` всем не-пациентам.
