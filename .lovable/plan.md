## Что сохранить

В production используется прокси `https://api.reage.life` как `SUPABASE_URL` для обхода блокировок РКН (прямые `*.supabase.co` могут быть недоступны из РФ).

## Действия

1. Создать файл памяти `mem://infrastructure/supabase-proxy-rkn-bypass.md` (type: feature) с описанием:
   - Production `SUPABASE_URL = https://api.reage.life`
   - Все ссылки в письмах и редиректы — только на пользовательские домены (`reage.life` / `test.reage.life`), не на `*.supabase.co`
   - Не хардкодить `*.supabase.co` — использовать env `SUPABASE_URL`
   - При отладке edge functions учитывать, что клиент ходит через прокси

2. Обновить `mem://index.md` — добавить в **Core** строку:
   > Production SUPABASE_URL = https://api.reage.life (прокси для обхода блокировок РКН). Не использовать *.supabase.co в письмах/ссылках/хардкоде.
   
   И добавить ссылку на новый файл в раздел **Memories**.

## Что НЕ делается

- Никакие файлы кода не меняются.
- Edge functions, конфиги, домены — не трогаем.

Переключите в build mode — сохраню.