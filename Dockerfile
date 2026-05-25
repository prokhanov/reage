FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsx scripts/generate-sitemap.ts && npm run build

FROM alpine:latest

RUN apk add --no-cache haproxy busybox-extras

COPY --from=build /app/dist /www
COPY haproxy.cfg /etc/haproxy/haproxy.cfg

EXPOSE 80

CMD sh -c "httpd -f -p 127.0.0.1:8080 -h /www & haproxy -f /etc/haproxy/haproxy.cfg"
