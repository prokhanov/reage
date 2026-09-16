FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsx scripts/generate-sitemap.ts && npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# nginx-конфиг с whitelist SPA-маршрутов.
# Зачем: без whitelist nginx отдаёт index.html со статусом 200 на любой путь,
# включая несуществующие — это soft 404, на который ругается Яндекс.
# Правило: при добавлении/удалении роута в src/App.tsx синхронизируй список ниже.
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

# Архивируем ассеты сборки, чтобы старые хэшированные CSS/JS не пропадали после
# деплоя (нужно Вебвизору и клиентам со старым закэшированным index.html).
COPY deploy/nginx/40-archive-assets.sh /docker-entrypoint.d/40-archive-assets.sh
RUN chmod +x /docker-entrypoint.d/40-archive-assets.sh && mkdir -p /var/www/assets-archive

EXPOSE 80
