/**
 * Проверка: каждый публичный маршрут из src/App.tsx есть в whitelist nginx
 * (deploy/nginx/default.conf). Иначе на проде страница отдаёт 404.
 * Запускается автоматически перед сборкой (prebuild).
 */
import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const conf = readFileSync("deploy/nginx/default.conf", "utf8");

const routes = [...app.matchAll(/path="(\/[^"]*)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== "*" && !p.includes("*"));

const exact = new Set(
  [...conf.matchAll(/location\s*=\s*(\/\S*)\s*\{/g)].map((m) => m[1]),
);
const prefixes = [...conf.matchAll(/location\s*\^~\s*(\/\S*)\s*\{/g)].map(
  (m) => m[1],
);
// Регулярные location для статики/верификаций — их не проверяем.

const missing = routes.filter((route) => {
  const base = route.split("/:")[0] || "/";
  if (exact.has(route) || exact.has(base)) return false;
  return !prefixes.some((p) => route.startsWith(p) || `${base}/`.startsWith(p));
});

if (missing.length > 0) {
  console.error(
    `\n[nginx] Маршруты отсутствуют в deploy/nginx/default.conf — на проде будет 404:\n` +
      missing.map((r) => `  location = ${r} { try_files /index.html =404; }`).join("\n") +
      `\n`,
  );
  process.exit(1);
}

console.log(`[nginx] whitelist OK (${routes.length} маршрутов проверено)`);
