// mint-preview-token
//
// Одна функция — два действия:
//   1) POST { reportId: "prokhanov" } → { token, url, expiresAt }
//      Минтит HMAC-токен для чистого превью отчёта. Только суперадмин.
//   2) POST { action: "verify", token } → { valid: boolean, reportId? }
//      Используется /internal/report-preview для проверки токена.
//
// Секреты (нужны только для рабочей генерации/проверки — до их создания
// функция ответит понятной ошибкой):
//   REPORT_PREVIEW_HMAC_SECRET — общий секрет для HMAC-SHA256.
//   PREVIEW_BASE_URL           — базовый URL фронтенда (без завершающего /),
//                                например https://reage.lovable.app.
//                                Используется только в URL, который отдаём
//                                клиенту, — сам токен от него не зависит.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_TTL_SEC = 15 * 60; // 15 минут
const encoder = new TextEncoder();

interface MintBody { reportId?: string; action?: "verify"; token?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("REPORT_PREVIEW_HMAC_SECRET");
  if (!secret) {
    return json({ error: "REPORT_PREVIEW_HMAC_SECRET is not configured" }, 501);
  }

  let body: MintBody = {};
  try {
    body = (await req.json()) as MintBody;
  } catch {
    body = {};
  }

  // ─── Ветка verify: НЕ требует авторизации. Проверяет только подпись/срок. ─
  if (body.action === "verify") {
    if (!body.token) return json({ valid: false }, 200);
    const parsed = await verifyToken(body.token, secret);
    return json({ valid: !!parsed, reportId: parsed?.reportId }, 200);
  }

  // ─── Ветка mint: только суперадмин. ────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id);
  const isSuper = (roles || []).some((r: any) => r.role === "superadmin");
  if (!isSuper) return json({ error: "forbidden" }, 403);

  const reportId = (body.reportId || "prokhanov").trim();
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = await signToken({ reportId, exp }, secret);
  const base = (Deno.env.get("PREVIEW_BASE_URL") || "").replace(/\/$/, "");
  const url = `${base}/internal/report-preview?token=${encodeURIComponent(token)}`;

  return json({ token, url, expiresAt: exp * 1000 }, 200);
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
  const arr =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Uint8Array {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function signToken(claims: TokenClaims, secret: string): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify(claims)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${b64url(sig)}`;
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
