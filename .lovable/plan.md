Проблема найдена: в React роут `/prep` уже есть, sitemap тоже обновлён, но боевой Coolify использует `deploy/nginx/default.conf` с whitelist SPA-маршрутов. В этом whitelist нет `/prep`, поэтому nginx отдаёт настоящий 404 до загрузки приложения.

План исправления:

1. Обновить `deploy/nginx/default.conf`
   - Добавить `location = /prep { try_files /index.html =404; }` в блок публичных SPA-маршрутов.
   - Заодно синхронизировать whitelist с `src/App.tsx` и добавить отсутствующий публичный `/unsubscribe`, чтобы он не сломался так же.

2. Проверить соответствие маршрутов
   - Убедиться, что `src/App.tsx`, `public/sitemap.xml`, `scripts/generate-sitemap.ts` уже указывают на `/prep`.
   - Не менять URL повторно.

3. После правки
   - Нужно пересобрать/перезапустить деплой в Coolify, потому что nginx-конфиг попадает в Docker-образ на этапе сборки.

Технически причина такая:

```text
reage.life/prep
  -> Coolify nginx
  -> deploy/nginx/default.conf
  -> /prep отсутствует в whitelist
  -> nginx return 404
  -> React Router даже не запускается
```

После добавления `/prep` в whitelist nginx будет отдавать `index.html`, и уже React Router покажет страницу памятки.