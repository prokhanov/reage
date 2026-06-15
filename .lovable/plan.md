
# Интеграция Робокассы — финальный план

Прокси `api.reage.life` уже работает на Fly — новый поднимать не надо.

---

## Что вам нужно сделать в кабинете Робокассы

### 1. Магазин
- **«Мои магазины»** → ваш магазин → скопировать **MerchantLogin**.

### 2. Боевые пароли
**«Технические настройки»** → **«Пароли»** → колонка **«Боевые»**:
- **Пароль #1** — подпись платёжных ссылок.
- **Пароль #2** — проверка подписи ResultURL.
- Пароль #3 — пока не нужен.

### 3. URL-адреса

| Поле | Значение | Метод |
|---|---|---|
| **Result URL** | `https://api.reage.life/functions/v1/robokassa-result` | `POST` |
| **Success URL** | `https://reage.life/subscription/success` | `GET` |
| **Fail URL** | `https://reage.life/subscription/fail` | `GET` |

### 4. Режим
Магазин в **боевом** режиме, тестовые пароли игнорируем.

### 5. Чеки (54-ФЗ)
Не подключаем сейчас, возвращаемся к этому сразу после первого успешного платежа.

### Чек-лист
1. MerchantLogin
2. Боевой Пароль #1
3. Боевой Пароль #2
4. Result/Success/Fail URL сохранены
5. Магазин в боевом режиме

Когда готово — открою защищённую форму для трёх секретов: `ROBOKASSA_MERCHANT_LOGIN`, `ROBOKASSA_PASSWORD_1`, `ROBOKASSA_PASSWORD_2`.

---

## Что я сделаю в проекте

### 1. База данных

**`payment_orders`**
- `inv_id` (bigint, unique), `user_id`, `plan_id`, `pricing_id`
- `out_sum` (numeric), `paid_amount` (numeric, nullable)
- `status` ∈ `pending | paid | failed`
- `robokassa_signature` (text, nullable)
- `raw_callback` (jsonb, nullable)
- `paid_at`, `created_at`, `updated_at`
- RLS: пользователь видит только свои; запись/обновление — только service role.

**`payment_callback_log`** (отдельный лог всех вызовов ResultURL, включая невалидные)
- `inv_id` (nullable), `signature_valid` (bool), `error` (text), `raw_body` (jsonb), `headers` (jsonb), `created_at`.
- Чтение — только superadmin.

**RLS на `subscriptions` (закрываем текущую дыру)**
- Клиент может вставлять/обновлять только со `status = 'pending'`.
- Перевод в `active` — только service role (через `robokassa-result`).

### 2. Edge-функции

**`robokassa-create-payment`** (требует JWT)
- Проверяет авторизацию.
- Создаёт `payment_orders` со статусом `pending`.
- Подпись (без `Receipt`, без `shp_*`):
  `md5(MerchantLogin:OutSum:InvId:Password1)`
- В коде заранее зашита точка расширения: если появятся `shp_*`, они добавляются в подпись в **алфавитном порядке**:
  `md5(MerchantLogin:OutSum:InvId:Password1:shp_xxx=...:shp_yyy=...)`
- Возвращает URL `https://auth.robokassa.ru/Merchant/Index.aspx?...`.

**`robokassa-result`** (без JWT, POST form-urlencoded — серверный вызов Робокассы, CORS не нужен)
- Парсит `OutSum`, `InvId`, `SignatureValue`, опциональные `shp_*`.
- Считает ожидаемую подпись: `md5(OutSum:InvId:Password2[:shp_*])`.
- При несовпадении → запись в `payment_callback_log` (signature_valid=false) и ответ `bad sign` (НЕ `OK`).
- При совпадении:
  - **Идемпотентность по `InvId`**: если заказ уже `paid` — отвечаем `OK<InvId>`, не дублируем активацию.
  - Иначе: проверяем `paid_amount == out_sum`; помечаем заказ `paid`, ставим `paid_at`, активируем/создаём `subscriptions` (service role).
  - Лог в `payment_callback_log` (signature_valid=true).
- Ответ строго `Content-Type: text/plain`, тело: `OK<InvId>`.

### 3. Frontend
- `src/pages/Subscription.tsx` → `handleSelectPlan` **больше не пишет** в `subscriptions`: вызывает `robokassa-create-payment` и `window.location.href = url`.
- Новые страницы:
  - `src/pages/SubscriptionSuccess.tsx` → `/subscription/success` — опрашивает БД с экспоненциальным бэкоффом, ждёт пока ResultURL дойдёт и подписка станет `active`.
  - `src/pages/SubscriptionFail.tsx` → `/subscription/fail` — информационная страница, ссылка вернуться к выбору тарифа.
- Никакой активации на этих страницах — только отображение статуса.

### 4. Роутинг — обязательно обновляю **оба** места

#### `src/App.tsx`
Добавить роуты:
```tsx
<Route path="/subscription/success" element={<SubscriptionSuccess />} />
<Route path="/subscription/fail" element={<SubscriptionFail />} />
```

#### `deploy/nginx/default.conf` (боевой `reage.life`, как сегодня делали с `/compliance`)
В whitelist SPA-маршрутов добавить:
```nginx
location = /subscription/success { try_files /index.html =404; }
location = /subscription/fail    { try_files /index.html =404; }
```
Без этого боевой nginx будет отдавать 404 на прямой заход / refresh / редирект от Робокассы. После мержа Coolify пересоберёт контейнер и подхватит конфиг.

Прокси `api.reage.life` уже форвардит `/functions/v1/*` в Supabase — ResultURL заработает сразу, никаких правок инфраструктуры не нужно.

### 5. Тестирование
1. Реальный платёж 10–50 ₽ с боевой карты.
2. Проверяю цепочку: ResultURL пришёл → подпись валидна → `payment_orders.status=paid` → `subscriptions.status=active` → редирект на `/subscription/success` → страница увидела активную подписку.
3. `payment_callback_log` чистый, ответ `OK<InvId>` подтверждён в истории Робокассы (не «не доставлен»).

### 6. Дальше (после первого успешного платежа)
- Блок `Receipt` (54-ФЗ) — пересчёт подписи: `MerchantLogin:OutSum:InvId:Receipt:Password1`.
- Пароль #3 + XML для возвратов из админки.
- Telegram-уведомление о платеже из `robokassa-result`.

---

**Подтвердите — и я начинаю с миграции БД и формы секретов.**
