// fetch-report-snapshot
//
// Публичный endpoint для страницы /internal/report-preview: отдаёт снимок
// JSON-отчёта по HMAC-токену, который сгенерировала render-report-pdf.
//
// Логика:
//   1) Принимает { token } без авторизации.
//   2) Проверяет подпись HMAC-SHA256 и срок годности claims.exp.
//   3) Достаёт snapshot из public.report_preview_snapshots по ключу-токену.
//   4) Отдаёт { report } или 404, если снимка нет (тогда фронт откатывается
//      на встроенный prokhanovReport.json).
//
// Секреты:
//   REPORT_PREVIEW_HMAC_SECRET — общий с render-report-pdf.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("REPORT_PREVIEW_HMAC_SECRET");
  if (!secret) return json({ error: "hmac_not_configured" }, 501);

  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body
  }
  const token = (body.token || "").trim();
  if (!token) return json({ error: "token_missing" }, 400);

  const claims = await verifyToken(token, secret);
  if (!claims) return json({ error: "invalid_token" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin
    .from("report_preview_snapshots")
    .select("report, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("[fetch-report-snapshot] db_error", error.message);
    return json({ error: "db_error", details: error.message }, 500);
  }
  if (!data) return json({ error: "snapshot_not_found" }, 404);
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return json({ error: "snapshot_expired" }, 410);
  }

  return json({ report: data.report, reportId: claims.reportId }, 200);
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TokenClaims { reportId: string; exp: number; snapshotId?: string }

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function fromB64url(input: string): Uint8Array {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenClaims | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    fromB64url(sig),
    encoder.encode(payload),
  );
  if (!ok) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as TokenClaims;
    if (!claims.exp || Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
