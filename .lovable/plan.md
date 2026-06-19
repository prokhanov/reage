## Цель

1. Поменять местами шаги «Подписка» и «О вас». Новый порядок:
   ```
   1. Аккаунт → 2. О вас → 3. Подписка → 4. Здоровье
   ```
2. Убрать рандомные дефолты пола / даты рождения в профиле, если шаг «О вас» ещё не пройден. Сейчас `handle_new_user` подставляет `gender='other'` и `birth_date='1990-01-01'`, из-за чего в профиле появляется «мужчина 35 лет». Должно быть `NULL`, пока пользователь сам не заполнит.

## Изменения

### 1. `src/pages/Register.tsx` — переставить шаги
В массиве `steps` поменять порядок (id 2 ↔ id 3), сохранить slug-маршруты, чтобы старые ссылки продолжали работать:

```ts
const steps = [
  { id: 1, slug: "account",  title: "Аккаунт",  description: "Создайте ваш аккаунт", icon: Mail },
  { id: 2, slug: "profile",  title: "О вас",     description: "Расскажите о себе",    icon: User },
  { id: 3, slug: "payment",  title: "Подписка",  description: "Оформление",            icon: Lock },
  { id: 4, slug: "health",   title: "Здоровье", description: "История болезней",     icon: Heart },
] as const;
```

Поменять рендер шагов в `<Card>`:
- `currentStep === 2` → `<RegisterStep2>` (О вас), `onNext={() => goToStep(3)}`, `onBack={() => goToStep(1)}`
- `currentStep === 3` → `<RegisterStep5>` (Подписка), `onSubmit` со `skipPayment` → `goToStep(4)`, `onBack={() => goToStep(2)}`
- `currentStep === 4` → `<RegisterStep3>` (Здоровье), `onNext={handleFinalSubmit}`, `onBack={() => goToStep(3)}`

Поменять `max-w-5xl` (широкая карточка для подписки): условие сменить на `currentStep === 3`.

Поменять toast после Шага 1: «Теперь расскажите о себе» вместо «Теперь выберите тариф».

### 2. `src/components/register/RegisterStep5.tsx` — обновить returnToStep
После оплаты регистрация продолжается со «Здоровья», а не «О вас»:
- Заменить `"reage:register:returnToStep"` значение `"profile"` → `"health"` (строка 93).

`SubscriptionSuccess.tsx` уже строит URL как `/register/${returnTo}` — менять не нужно.

### 3. БД — разрешить NULL в `profiles.gender` и `profiles.birth_date`
Миграция:
```sql
ALTER TABLE public.profiles ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN birth_date DROP NOT NULL;
```

### 4. `handle_new_user` — убрать рандомные дефолты
В триггере `public.handle_new_user`:
- `birth_date_value` → инициализировать `NULL` (а не `1990-01-01`), присваивать дату только если в metadata есть валидное `YYYY-MM-DD`.
- `gender_value` → инициализировать `NULL` (а не `'other'`), присваивать только если пришло `'male'|'female'|'other'`.
- В `INSERT INTO profiles` вставлять реальные `NULL`, если значений нет.

### 5. `src/pages/Register.tsx` → `handleFinalSubmit`
Убрать дефолт `"other"` при апдейте профиля:
```ts
gender: formData.gender || null,
```
(`birth_date` уже корректно ставится в `null`, если не заполнено.)

## Проверка

- `/register` → Шаг 1 (Аккаунт), после signUp → Шаг 2 (О вас), стрелка «Вперёд» → Шаг 3 (Подписка), оплата → редирект на Робокассу → возврат на `/register/health` (Шаг 4) → завершение.
- В Cloud → profiles: после регистрации без прохождения «О вас» поля `gender` / `birth_date` = `NULL`, в `/profile` отображается прочерк/«не указано» вместо «мужчина, 35 лет».
- Степ-индикаторы и progress-bar отображают новый порядок.

## Что НЕ меняется

- Slug-маршруты (`/register/profile`, `/register/payment`, `/register/health`) сохраняются — нумерация шагов меняется, URL — нет.
- Логика триггеров drip-серий, оплаты, авто-подтверждения email.
- UI компонентов `RegisterStep2/3/5` — внутри ничего не меняем.