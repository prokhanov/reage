Проблема в коде найдена: в `src/App.tsx` маршрут `/compliance` уже есть, но в боевом nginx-whitelist (`deploy/nginx/default.conf`) нет строки для `/compliance`. Поэтому `reage.life/compliance` попадает в `location / { return 404; }`.

План изменений:
1. В `deploy/nginx/default.conf` добавить точный whitelist-маршрут:
   ```nginx
   location = /compliance { try_files /index.html =404; }
   ```
2. Оставить существующий `location ^~ /legal/` без изменений — он уже покрывает `/legal/documents`, `/legal/requisites`, `/legal/privacy`, `/legal/terms`, `/legal/consent-data`, `/legal/consent-research`.
3. Ничего не менять в DNS, Lovable-доменах и общем SPA fallback.
4. После применения нужно вручную задеплоить обновлённый Docker/Coolify build на `reage.life`, потому что именно этот nginx-конфиг копируется в контейнер через `Dockerfile`.