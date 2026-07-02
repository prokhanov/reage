// reage-report-renderer
//
// Единственный эндпоинт:
//   POST /render
//     Header:  X-Render-Auth: <AUTH_TOKEN>
//     Body:    { "url": "https://reage.lovable.app/internal/report-preview?token=..." }
//     Return:  application/pdf
//
// Никакой очереди, storage, БД. Один синхронный вызов Chromium.

import Fastify from "fastify";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT || 8080);
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 60_000);
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 60_000);

if (!AUTH_TOKEN) {
  console.warn("[boot] AUTH_TOKEN is empty — /render will refuse all requests");
}

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || "info" },
  bodyLimit: 2 * 1024 * 1024,
});

// Один browser-инстанс на весь процесс, каждый рендер — новый context/page.
// Fly auto_stop_machines сам погасит инстанс при простое.
let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserPromise;
}

app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));

app.post("/render", async (req, reply) => {
  const authHeader = req.headers["x-render-auth"];
  if (!AUTH_TOKEN || authHeader !== AUTH_TOKEN) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const body = req.body || {};
  const url = typeof body.url === "string" ? body.url : "";
  if (!/^https?:\/\//i.test(url)) {
    return reply.code(400).send({ error: "invalid_url" });
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 }, // ~A4 96dpi
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    // Ждём сигнал от ReportDocument: шрифты + rAF + 50ms задержка.
    await page.waitForFunction(() => window.__reportReady === true, {
      timeout: NAV_TIMEOUT_MS,
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      timeout: PDF_TIMEOUT_MS,
    });
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Length", pdf.length);
    return reply.send(pdf);
  } catch (err) {
    req.log.error({ err: String(err) }, "render_failed");
    return reply.code(500).send({
      error: "render_failed",
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
});

app.listen({ host: "0.0.0.0", port: PORT }).then(() => {
  app.log.info(`report-renderer listening on :${PORT}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Мягкое завершение при SIGTERM (fly rolling deploy)
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, async () => {
    app.log.info(`${sig} received — shutting down`);
    try {
      if (browserPromise) (await browserPromise).close();
    } catch {
      // ignore
    }
    process.exit(0);
  });
}
