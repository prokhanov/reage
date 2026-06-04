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

EXPOSE 80
