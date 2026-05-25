FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsx scripts/generate-sitemap.ts && npm run build

FROM alpine:latest

RUN apk add --no-cache haproxy nginx

COPY --from=build /app/dist /usr/share/nginx/html
COPY haproxy.cfg /etc/haproxy/haproxy.cfg

EXPOSE 80

CMD ["sh", "-c", "nginx && exec haproxy -f /etc/haproxy/haproxy.cfg"]
