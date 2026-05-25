## Да, план рабочий и сильно проще предыдущего

Логика верная: твой текущий VPS на reg.ru уже достаёт Supabase (ответ `HTTP/2 404` от cloudflare — это нормально, значит сеть до Frankfurt идёт). Значит отдельный зарубежный VPS не нужен — прокси поднимаем прямо на том же сервере через путь `/supabase` в nginx.

Делаем в 2 этапа: **(A) безопасные правки фронта в этом проекте**, **(B) настройка прокси на VPS (вне Lovable, делаешь руками в Coolify)**.

---

## Этап A. Правки в коде (что сделаю я в build mode)

### 1. `src/integrations/supabase/client.ts` — защита + нормализация

```ts
const RAW_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_URL = (RAW_URL ?? "").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
    "Set them in Coolify → Environment Variables."
  );
}
```

Зачем: если в Coolify забыли переменную — увидишь явную ошибку, а не молчаливое падение. Trailing slash убираем, чтобы `https://test.reage.life/supabase/` и `https://test.reage.life/supabase` работали одинаково.

⚠️ Файл помечен «автогенерируемый», но не меняем сигнатуру `createClient` и список env-переменных — Lovable это переживёт.

### 2. Новый файл `src/lib/supabaseUrl.ts` — общий helper

```ts
export const SUPABASE_BASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_BASE_URL}/functions/v1/${name}`;
}
```

### 3. Заменить 3 места на helper

- `src/lib/analyzeBiomarkers.ts` (строка 33) → `edgeFunctionUrl("report-orchestrator")`
- `src/pages/HealthAssistant.tsx` (строка 142) → `edgeFunctionUrl("health-assistant")`
- `src/components/admin/EditReportDialog.tsx` (строка 100) → `edgeFunctionUrl("report-qa")`

### 4. `.env.example` и `README.md` — обновить пример

```bash
# Прямой Supabase:   https://ilxgodhosirhhkffqryw.supabase.co
# Через прокси VPS:  https://test.reage.life/supabase
VITE_SUPABASE_URL=https://test.reage.life/supabase
```

### Что НЕ трогаю
- `src/integrations/supabase/types.ts` — автогенерируется
- `supabase/functions/**` — серверный код, использует серверный env `SUPABASE_URL`
- Бизнес-логика, auth flow, UI — ни одной строки
- `supabase/config.toml`

---

## Этап B. Настройка на VPS (делаешь ты в Coolify, после Sync to GitHub)

### Шаг 1. Поменять `nginx.conf` в проекте

Текущий файл:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

Новый — добавляем `location /supabase/`:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Прокси к Supabase для обхода блокировок РКН.
    # Всё, что приходит на /supabase/* — переписываем на https://<project>.supabase.co/*
    location /supabase/ {
        proxy_pass https://ilxgodhosirhhkffqryw.supabase.co/;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header Host ilxgodhosirhhkffqryw.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE / Realtime / long-polling
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        # WebSocket (для Realtime)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / { try_files $uri $uri/ /index.html; }
}
```

Ключевая строка: **`proxy_pass https://...supabase.co/;`** (со слэшем в конце!) — nginx срежет `/supabase` и подставит остаток пути. То есть `https://test.reage.life/supabase/auth/v1/token` → `https://ilxgodhosirhhkffqryw.supabase.co/auth/v1/token`.

### Шаг 2. В Coolify → Environment Variables

Сначала **не меняем** `VITE_SUPABASE_URL`, чтобы убедиться, что код не сломался. Redeploy → открыть `test.reage.life` через VPN → проверить логин/дашборд/AI.

Если ок — меняем:
```
VITE_SUPABASE_URL=https://test.reage.life/supabase
```
**Redeploy обязателен** (VITE_* вшивается в build).

### Шаг 3. Lovable Auth → Redirect URLs

Ничего менять не надо: redirect URL — это твой фронт (`test.reage.life/**`), а не Supabase URL. Auth-callbacks приходят на фронт, фронт делает запрос на `/supabase/auth/v1/...` через nginx.

### Шаг 4. Тест без VPN

Открыть `test.reage.life` с российского IP → DevTools → Network → должны быть только запросы на `test.reage.life`, **ни одного на `*.supabase.co`**.

### Откат за 30 секунд

В Coolify меняешь `VITE_SUPABASE_URL` обратно на `https://ilxgodhosirhhkffqryw.supabase.co`, Redeploy. nginx можно не трогать — он просто перестанет использоваться.

---

## Риски и почему план реалистичен

- ✅ **Auth/JWT** — заголовок `Authorization: Bearer ...` идёт сквозь nginx без изменений
- ✅ **Storage** — те же `/storage/v1/*` пути, прокси прозрачен
- ✅ **Edge functions** — `${SUPABASE_URL}/functions/v1/<name>` → через прокси
- ✅ **Realtime/SSE** — `proxy_buffering off` + WebSocket headers решают
- ⚠️ **Единственный нюанс**: если VPS reg.ru со временем тоже попадёт под раздачу к Supabase (CF блок) — придётся переезжать. Но сейчас работает, и архитектура от Caddy/зарубежного VPS отличается только одной строкой `proxy_pass` — мигрировать легко.

## Что от тебя нужно для approve

Просто нажми **Implement plan**. Я внесу правки Этапа A. Этап B (nginx + Coolify env) делаешь руками, я могу подсказывать по шагам.
