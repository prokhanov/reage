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
  const requestId = req.headers["x-debug-request-id"] || req.body?.requestId || crypto.randomUUID();
  const startedAt = Date.now();
  const log = (message, extra = {}) => req.log.info({ requestId, ...extra }, message);
  const logError = (message, extra = {}) => req.log.error({ requestId, ...extra }, message);

  const authHeader = req.headers["x-render-auth"];
  if (!AUTH_TOKEN || authHeader !== AUTH_TOKEN) {
    logError("unauthorized_render_request", { hasAuthToken: Boolean(AUTH_TOKEN), hasHeader: Boolean(authHeader) });
    return reply.code(401).send({ error: "unauthorized" });
  }
  const body = req.body || {};
  const url = typeof body.url === "string" ? body.url : "";
  if (!/^https?:\/\//i.test(url)) {
    logError("invalid_url", { urlType: typeof body.url });
    return reply.code(400).send({ error: "invalid_url" });
  }

  log("render_start", { targetOrigin: new URL(url).origin, targetPath: new URL(url).pathname });

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 }, // ~A4 96dpi
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    log("browser_console", { type: msg.type(), text: msg.text().slice(0, 1000) });
  });
  page.on("pageerror", (err) => {
    logError("browser_pageerror", { message: err.message, stack: err.stack?.slice(0, 2000) });
  });
  page.on("requestfailed", (request) => {
    logError("browser_request_failed", {
      url: request.url().slice(0, 1000),
      method: request.method(),
      failure: request.failure()?.errorText,
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      logError("browser_bad_response", {
        url: response.url().slice(0, 1000),
        status: response.status(),
      });
    }
  });

  try {
    log("goto_start");
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    log("goto_done", { elapsedMs: Date.now() - startedAt, pageUrl: page.url() });
    // Ждём сигнал от ReportDocument: шрифты + rAF + 50ms задержка.
    log("wait_report_ready_start");
    await page.waitForFunction(() => window.__reportReady === true, {
      timeout: NAV_TIMEOUT_MS,
    });
    log("wait_report_ready_done", { elapsedMs: Date.now() - startedAt });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      timeout: PDF_TIMEOUT_MS,
    });
    log("pdf_done", { bytes: pdf.length, elapsedMs: Date.now() - startedAt });
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Length", pdf.length);
    return reply.send(pdf);
  } catch (err) {
    logError("render_failed", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
      elapsedMs: Date.now() - startedAt,
      pageUrl: page.url(),
    });
    return reply.code(500).send({
      error: "render_failed",
      requestId,
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
