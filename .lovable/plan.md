**Задача:** задокументировать, что Result URL в кабинете Robokassa должен указывать на `https://api.reage.life/functions/v1/robokassa-result` (через Fly proxy), а не на прямой URL Supabase.

**Изменения:**
1. В `supabase/functions/robokassa-result/index.ts` — добавить комментарий в шапку файла с правильным URL и напоминанием про `verify_jwt = false`.
2. В `deploy/fly-proxy/README.md` — добавить раздел "Robokassa callback", описывающий, что Result URL должен быть `https://api.reage.life/functions/v1/robokassa-result`, метод POST, и что прямой Supabase URL не использовать.