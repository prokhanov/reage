// render-report-pdf
//
// Прокладка между админской песочницей и Fly-рендерером:
//   1) Проверяет, что вызывает суперадмин.
//   2) Минтит одноразовый HMAC-токен превью.
//   3) Дёргает POST $REPORT_RENDERER_URL/render с заголовком X-Render-Auth,
//      передавая URL превью.
//   4) Стримит бинарь PDF обратно в браузер.
//
// Секреты (создаются перед первым деплоем — см. README):
//   REPORT_PREVIEW_HMAC_SECRET   — общий с mint-preview-token, HMAC ключ.
//   PREVIEW_BASE_URL             — https://reage.life (production через Coolify) или test.reage.life
//   REPORT_RENDERER_URL          — https://reage-report-renderer.fly.dev
//   REPORT_RENDERER_AUTH_TOKEN   — совпадает с AUTH_TOKEN на Fly-стороне.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-debug-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_TTL_SEC = 15 * 60;
// Первый запуск Fly-машины + Chromium может занять заметно дольше обычного
// рендера. Держим лимит ниже типичного верхнего лимита edge-runtime, но не
// обрываем тяжёлый отчёт на 75-й секунде.
const RENDERER_TIMEOUT_MS = 135_000;
const RENDERER_WARMUP_TIMEOUT_MS = 10_000;
const PREVIEW_SUPPORT_TIMEOUT_MS = 25_000;
const encoder = new TextEncoder();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: {
    reportId?: string;
    clientRequestId?: string;
    report?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body — используем default
  }

  const requestId = req.headers.get("X-Debug-Request-Id") || body.clientRequestId || crypto.randomUUID();
  const startedAt = Date.now();
  const log = (...args: unknown[]) => console.log(`[render-report-pdf ${requestId}]`, ...args);
  const logError = (...args: unknown[]) => console.error(`[render-report-pdf ${requestId}]`, ...args);

  log("start", { method: req.method });

  const secret = Deno.env.get("REPORT_PREVIEW_HMAC_SECRET");
  const rendererUrl = (Deno.env.get("REPORT_RENDERER_URL") || "").replace(/\/$/, "");
  const rendererAuth = Deno.env.get("REPORT_RENDERER_AUTH_TOKEN");
  const previewBase = (Deno.env.get("PREVIEW_BASE_URL") || "").replace(/\/$/, "");

  if (!secret || !rendererUrl || !rendererAuth || !previewBase) {
    logError("renderer_not_configured", {
      REPORT_PREVIEW_HMAC_SECRET: !secret,
      REPORT_RENDERER_URL: !rendererUrl,
      REPORT_RENDERER_AUTH_TOKEN: !rendererAuth,
      PREVIEW_BASE_URL: !previewBase,
    });
    return json(
      {
        error: "renderer_not_configured",
        requestId,
        missing: {
          REPORT_PREVIEW_HMAC_SECRET: !secret,
          REPORT_RENDERER_URL: !rendererUrl,
          REPORT_RENDERER_AUTH_TOKEN: !rendererAuth,
          PREVIEW_BASE_URL: !previewBase,
        },
      },
      501,
    );
  }

  // Only superadmin
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    logError("unauthorized", userErr?.message || "no user");
    return json({ error: "unauthorized", requestId, details: userErr?.message || "no user" }, 401);
  }
  log("authenticated", { userId: userRes.user.id });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles, error: rolesErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id);
  if (rolesErr) {
    logError("roles_lookup_failed", rolesErr.message);
    return json({ error: "roles_lookup_failed", requestId, details: rolesErr.message }, 500);
  }
  const isSuper = (roles || []).some((r: any) => r.role === "superadmin");
  if (!isSuper) {
    logError("forbidden", { roles: (roles || []).map((r: any) => r.role) });
    return json({ error: "forbidden", requestId, roles: (roles || []).map((r: any) => r.role) }, 403);
  }

  const reportId = (body.reportId || "prokhanov").trim();
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = await signToken({ reportId, exp }, secret);
  const previewUrl = `${previewBase}/internal/report-preview?token=${encodeURIComponent(token)}`;

  // Если фронт передал текущий JSON редактора — кладём снимок в БД, чтобы
  // /internal/report-preview → fetch-report-snapshot отдал его по этому же
  // токену. Без снимка страница откатится на встроенный JSON (то есть на
  // последнюю опубликованную версию сайта — старое поведение).
  let snapshotStored = false;
  if (body.report && typeof body.report === "object") {
    const { error: snapErr } = await admin
      .from("report_preview_snapshots")
      .insert({
        token,
        report: body.report,
        expires_at: new Date(exp * 1000).toISOString(),
        created_by: userRes.user.id,
      });
    if (snapErr) {
      logError("snapshot_insert_failed", snapErr.message);
      return json(
        { error: "snapshot_insert_failed", requestId, details: snapErr.message },
        500,
      );
    }
    snapshotStored = true;
  }

  if (snapshotStored) {
    const support = await previewSupportsSnapshot(previewBase);
    if (!support.ok) {
      if (!support.blocking) {
        logError("preview_support_check_inconclusive_continue", support);
      } else {
        logError("preview_frontend_outdated", support);
        return json(
          {
            error: "preview_frontend_outdated",
            requestId,
            details:
              "Опубликованная preview-страница ещё не умеет читать свежий JSON-снимок отчёта. Иначе PDF снова будет старой версией.",
            previewBase,
            reason: support.reason,
          },
          409,
        );
      }
    }
  }

  log("calling_renderer", {
    reportId,
    rendererUrl,
    previewBase,
    previewPath: "/internal/report-preview",
    snapshotStored,
  });

  // Будим Fly-машину перед тяжёлым POST /render. Если warmup не успел — всё
  // равно продолжаем: основной render сам вернёт диагностируемую ошибку.
  try {
    const warmupController = new AbortController();
    const warmupTimeout = setTimeout(() => warmupController.abort(), RENDERER_WARMUP_TIMEOUT_MS);
    const warmupRes = await fetch(`${rendererUrl}/healthz`, { signal: warmupController.signal });
    clearTimeout(warmupTimeout);
    log("renderer_warmup", { status: warmupRes.status, elapsedMs: Date.now() - startedAt });
  } catch (e) {
    logError("renderer_warmup_failed", e instanceof Error ? e.message : String(e));
  }

  let flyRes: Response;
  const rendererController = new AbortController();
  const rendererTimeout = setTimeout(() => rendererController.abort(), RENDERER_TIMEOUT_MS);
  try {
    flyRes = await fetch(`${rendererUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Render-Auth": rendererAuth,
        "X-Debug-Request-Id": requestId,
      },
      body: JSON.stringify({ url: previewUrl, requestId }),
      signal: rendererController.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      logError("renderer_timeout", { timeoutMs: RENDERER_TIMEOUT_MS });
      return json(
        {
          error: "renderer_timeout",
          requestId,
          details: `Fly renderer did not respond within ${RENDERER_TIMEOUT_MS}ms`,
        },
        504,
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    logError("renderer_fetch_failed", message);
    return json({ error: "renderer_fetch_failed", requestId, details: message }, 502);
  } finally {
    clearTimeout(rendererTimeout);
  }

  log("renderer_response", {
    status: flyRes.status,
    contentType: flyRes.headers.get("content-type"),
    elapsedMs: Date.now() - startedAt,
  });

  if (!flyRes.ok) {
    const text = await flyRes.text();
    logError("renderer_failed", { status: flyRes.status, details: text.slice(0, 1000) });
    return json(
      { error: "renderer_failed", requestId, status: flyRes.status, details: text.slice(0, 1000) },
      502,
    );
  }

  const pdf = new Uint8Array(await flyRes.arrayBuffer());
  log("success", { bytes: pdf.byteLength, elapsedMs: Date.now() - startedAt });
  return new Response(pdf, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportId}-report.pdf"`,
    },
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TokenClaims { reportId: string; exp: number }

async function previewSupportsSnapshot(
  previewBase: string,
): Promise<{ ok: true } | { ok: false; reason: string; blocking: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_SUPPORT_TIMEOUT_MS);
  try {
    const htmlRes = await fetch(`${previewBase}/internal/report-preview`, {
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent": "ReAge-PDF-SupportCheck/1.0",
      },
      signal: controller.signal,
    });
    if (!htmlRes.ok) {
      return { ok: false, reason: `preview_html_http_${htmlRes.status}`, blocking: false };
    }
    const html = await htmlRes.text();
    const assetMatches = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/gi)]
      .map((m) => m[1])
      .filter(Boolean)
      .slice(0, 8);
    if (html.includes("fetch-report-snapshot")) return { ok: true };
    for (const asset of assetMatches) {
      if (!asset.endsWith(".js")) continue;
      const url = new URL(asset, previewBase).toString();
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) continue;
      const js = await res.text();
      if (js.includes("fetch-report-snapshot") || js.includes("snapshot_loaded")) {
        return { ok: true };
      }
    }
    return { ok: false, reason: "snapshot_loader_not_found_in_published_assets", blocking: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, reason: "preview_support_check_timeout", blocking: false };
    }
    return { ok: false, reason: e instanceof Error ? e.message : String(e), blocking: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(claims: TokenClaims, secret: string): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify(claims)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${b64url(sig)}`;
}
