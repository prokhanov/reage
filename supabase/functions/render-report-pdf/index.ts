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
//   PREVIEW_BASE_URL             — https://reage.lovable.app (или test.reage.life)
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
const encoder = new TextEncoder();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("X-Debug-Request-Id") || crypto.randomUUID();
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

  let body: { reportId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body — используем default
  }
  const reportId = (body.reportId || "prokhanov").trim();
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = await signToken({ reportId, exp }, secret);
  const previewUrl = `${previewBase}/internal/report-preview?token=${encodeURIComponent(token)}`;
  log("calling_renderer", {
    reportId,
    rendererUrl,
    previewBase,
    previewPath: "/internal/report-preview",
  });

  let flyRes: Response;
  try {
    flyRes = await fetch(`${rendererUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Render-Auth": rendererAuth,
        "X-Debug-Request-Id": requestId,
      },
      body: JSON.stringify({ url: previewUrl, requestId }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logError("renderer_fetch_failed", message);
    return json({ error: "renderer_fetch_failed", requestId, details: message }, 502);
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
