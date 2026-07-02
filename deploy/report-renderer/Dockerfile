# Playwright-образ содержит Chromium + системные шрифты и все нужные libs.
# Версия пиньится параллельно с "playwright" в package.json.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Кладём зависимости отдельно, чтобы кэш слоя не терялся при правке server.js
COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
