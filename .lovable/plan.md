## Диагноз

Схема БД и типы совпадают с данными формы (`birth_date` `date` ← `format(d,"yyyy-MM-dd")`, `weight/height` `numeric` ← `Number(...)`, `medications` `text[]` ← `string[]`, `operations` `jsonb`, `gender` `text`). Форматной ошибки, которая бы молча роняла UPDATE, нет.

Реальная причина потери данных в `src/pages/Onboarding.tsx`:
- Сохранение в `profiles` вызывается **только** в `finalize()` (Шаг 3). Шаги 1 и 2 держат данные в React-стейте.
- Если пользователь обновил страницу / вернулся браузером / открыл онбординг заново, стейт сбрасывается, а на Шаге 3 «Заполнить позже» отправляется пустой апдейт. `saveOnboardingData` пропускает пустые поля → БД остаётся с `null`.
- Дополнительно UPDATE идёт без `.select()`, так что мы не замечаем, если RLS/rowcount=0 не тронули строку.

## Правки

**`src/lib/onboarding/saveOnboardingData.ts`**
- Явные приведения и валидация значений перед записью:
  - `weight`/`height`: включать только если `Number.isFinite(n) && n > 0`.
  - `birth_date`: включать только если `isValid(date)`.
- `.update(...).eq("id", userId).select("id, birth_date, weight, height, gender, first_name").maybeSingle()`; если ответ `null` — бросаем понятную ошибку («UPDATE не затронул строку — проверьте авторизацию»).
- В `console.info` логируем реально вернувшиеся значения ключевых полей (для отлова будущих регрессий без гаданий).

**`src/pages/Onboarding.tsx`**
- Автосохранение при клике «Далее» на Шагах 1 и 2: `await saveOnboardingData(userId, formData, { skipComplete: true })`. При ошибке — тост и остаёмся на шаге.
- В `finalize()` перед сохранением sanity-check: если `formData.gender/birth_date/weight/height` пусты, дочитываем `profiles`; если и там пусто — тост «Заполните Шаг 1» и `goToStep(1)` вместо тихого «Заполнить позже» с пустотой.

Файлы: `src/pages/Onboarding.tsx`, `src/lib/onboarding/saveOnboardingData.ts`. Миграции и RLS не трогаю.
