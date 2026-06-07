import { writeFileSync } from "fs";
import { resolve } from "path";

// VITE_APP_URL задаётся в окружении деплоя (Coolify/VPS). При отсутствии
// используем боевой домен — это сохраняет поведение для Lovable preview
// и текущего хостинга на reage.life без изменений.
const BASE_URL = process.env.VITE_APP_URL || "https://reage.life";
const NOINDEX = process.env.VITE_NOINDEX === "true";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/example-report", changefreq: "weekly", priority: "0.8" },
  { path: "/prep", changefreq: "monthly", priority: "0.7" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries, base=${BASE_URL})`);

// robots.txt: на тестовом домене (VITE_NOINDEX=true) закрываем индексацию
// целиком, чтобы Google не схватил тестовую копию. На боевом — стандартный
// набор разрешений.
const robotsTxt = NOINDEX
  ? `User-agent: *\nDisallow: /\n`
  : `User-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: Twitterbot\nAllow: /\n\nUser-agent: facebookexternalhit\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
writeFileSync(resolve("public/robots.txt"), robotsTxt);
console.log(`robots.txt written (noindex=${NOINDEX})`);
