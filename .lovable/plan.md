## Цели

1. На шаге «Подписка» в регистрации убрать форму ввода карты и подключить реальный поток Робокассы (тот же, что на `/subscription`).
2. Сделать каждый шаг регистрации доступным по прямой ссылке (`/register/account`, `/register/payment`, `/register/profile`, `/register/health`).
3. После возврата с Робокассы пользователь попадает на следующий шаг регистрации (профиль), а не на дашборд.
4. Шаг оплаты доступен для просмотра всегда; если подписка уже активна, он становится неактивным и показывает «Вы уже оплатили тариф X».

## Что меняем

### 1. Маршрутизация регистрации
- В `src/App.tsx` маршрут `/register` остаётся, плюс добавляем `/register/:step` где `step ∈ {account, payment, profile, health}`.
- В `src/pages/Register.tsx` `currentStep` синхронизируется с URL через `useParams`/`navigate`. Кнопки «Назад/Далее» вызывают `navigate(`/register/${nextSlug}`)`.
- Состояние формы (`formData`, `selectedPlan`) персистится в `localStorage` (`reage:register:draft`) — переживает перезагрузку и возврат с Робокассы.
- Прямой переход на шаг, для которого нет нужных данных в форме, мягко редиректит на предыдущий незаполненный шаг (без агрессивной блокировки — пользователь сам решает).

### 2. Аккаунт создаётся в конце шага 1 (а не в финале)
Робокасса требует авторизованного пользователя (`robokassa-create-payment` валидирует Bearer JWT). Поэтому:
- При нажатии «Далее» на шаге `account` после валидации телефона/email вызываем `supabase.auth.signUp` с тем минимумом метаданных, что уже есть (имя, фамилия, телефон, email). Остальное (`birth_date`, `weight`, `medical_history`, …) допишется в профиль позже — отдельным `update` после шага `profile`/`health`.
- В `handle_new_user` (БД) уже есть дефолты для отсутствующих полей и сценарий `INSERT … ON CONFLICT (id) DO UPDATE`, так что повторные апдейты после регистрации сработают корректно через обычный `profiles.update` из клиента.
- Если signUp вернул «email exists» — показываем тост и предлагаем войти, шаг не продвигаем.
- Если сессия уже есть при заходе на `/register/account`, шаг показывается в read-only режиме «Аккаунт создан» с кнопкой «Далее».

### 3. Шаг «Подписка» (`/register/payment`) — новая логика
Файл `src/components/register/RegisterStep5.tsx`:
- Удаляем поля номера карты / имени / срока / CVV и связанный state `cardNumber/cardName/expiryDate/cvv`, утилиты `formatCardNumber/formatExpiryDate`, проверку `isCardValid`, иконку `CreditCard` и весь блок «Данные карты».
- Кнопка «Оплатить N ₽» вызывает `supabase.functions.invoke("robokassa-create-payment", { body: { planId, pricingId } })` — точно та же логика, что в `src/pages/Subscription.tsx::handleSelectPlan`. Перед редиректом сохраняем в `localStorage` `reage:register:returnToStep = "profile"`, чтобы после возврата страница успеха увела на нужный шаг.
- При успехе делаем `window.location.href = data.url` (уход на Робокассу).
- Кнопка «Пропустить» сохраняется (для случая, когда пользователь хочет дозаполнить профиль без оплаты прямо сейчас) и просто переводит на `/register/profile` с `selectedPlan.skipPayment=true`.
- Проверка активной подписки: при монтировании страницы делаем запрос `subscriptions where user_id = me and status='active'`. Если нашли — рендерим read-only состояние:
  - Заголовок «Вы уже оплатили тариф <display_name>».
  - Дата окончания.
  - Кнопки «Назад» и «Далее» (на `/register/profile`).
  - Карточки тарифов / кнопка оплаты не показываются.

### 4. Возврат с Робокассы → следующий шаг
`src/pages/SubscriptionSuccess.tsx`:
- После того как `status === "active"` (подписка активирована), читаем `localStorage.getItem("reage:register:returnToStep")`. Если оно равно `"profile"` — удаляем ключ и `navigate("/register/profile", { replace: true })` вместо текущего «В Контрольную панель».
- Для `admin_test` и таймаута поведение не меняем (текущие сообщения).

`src/pages/SubscriptionFail.tsx`:
- Если есть `reage:register:returnToStep`, добавляем дополнительную кнопку «Вернуться к выбору тарифа в регистрации» → `/register/payment` (ключ не удаляем, чтобы повторная оплата тоже вела обратно в регистрацию).

### 5. Финальный шаг (`/register/health`)
- Сейчас `handleFinalSubmit` делает `supabase.auth.signUp`. Меняем: пользователь уже создан на шаге 1, поэтому здесь делаем `profiles.update` + дополняем `medical_history`, `weight_history`, и (если есть `selectedPlan.skipPayment===false` и подписки всё ещё нет — на случай странного состояния) можно повторно предложить оплату; иначе просто навигация на `/dashboard` + confetti.

## Технические заметки (для разработчика)

- Никаких изменений в `robokassa-create-payment` / `robokassa-result` / `payment_orders` / `subscriptions` — повторно используем существующий поток.
- `handle_new_user` уже создаёт `subscriptions` со статусом `pending` при отсутствии плана — это нормально, при успешной оплате `robokassa-result` создаст новую `active` подписку, и проверка в шаге оплаты найдёт её.
- localStorage-ключи: `reage:register:draft` (formData + selectedPlan + completedSteps), `reage:register:returnToStep`.
- Все клиентские изменения; миграции БД, edge-функции и `supabase/config.toml` не трогаем.

## Файлы, которые правим

- `src/App.tsx` — добавить параметризованный маршрут.
- `src/pages/Register.tsx` — URL-синхронизация шагов, персист в localStorage, signUp в конце шага 1, финальный submit без signUp.
- `src/components/register/RegisterStep5.tsx` — удалить форму карты, подключить Робокассу, read-only при активной подписке.
- `src/pages/SubscriptionSuccess.tsx` — редирект на `/register/profile` при наличии `returnToStep`.
- `src/pages/SubscriptionFail.tsx` — доп. кнопка возврата в регистрацию.

## Что НЕ делаем

- Не меняем порядок шагов и тексты других шагов.
- Не трогаем `Subscription.tsx` (страница оплаты для уже зарегистрированных пользователей).
- Не трогаем серверную часть Робокассы.
