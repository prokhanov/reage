// Shared SMS Aero v2 client.
// Docs: https://smsaero.ru/api/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const BASE_URL = "https://gate.smsaero.ru/v2";

let cachedCreds: { email: string; apiKey: string; at: number } | null = null;
const CRED_TTL_MS = 30_000;

async function getCreds(): Promise<{ email: string; apiKey: string }> {
  if (cachedCreds && Date.now() - cachedCreds.at < CRED_TTL_MS) {
    return { email: cachedCreds.email, apiKey: cachedCreds.apiKey };
  }

  let email = "";
  let apiKey = "";

  // Try DB first (admin-configurable account).
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (url && srk) {
      const admin = createClient(url, srk, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await admin
        .from("sms_sender_settings")
        .select("api_email, api_key")
        .limit(1)
        .maybeSingle();
      if (data) {
        email = (data as any).api_email?.trim() || "";
        apiKey = (data as any).api_key?.trim() || "";
      }
    }
  } catch (_) {
    // ignore, fallback to env
  }

  // Fallback to environment secrets.
  if (!email) email = Deno.env.get("SMSAERO_EMAIL") ?? "";
  if (!apiKey) apiKey = Deno.env.get("SMSAERO_API_KEY") ?? "";

  if (!email || !apiKey) {
    throw new Error("SMSAERO_EMAIL и SMSAERO_API_KEY не настроены");
  }

  cachedCreds = { email, apiKey, at: Date.now() };
  return { email, apiKey };
}

function authHeader(email: string, apiKey: string): string {
  return "Basic " + btoa(`${email}:${apiKey}`);
}

/** Normalize phone to digits-only, starting with country code. */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) digits = "7" + digits.slice(1);
  return digits;
}

export async function checkAuth(): Promise<{ ok: boolean; balance?: number; error?: string }> {
  // Bust cache so admins see immediate effect of credential changes.
  cachedCreds = null;
  const { email, apiKey } = await getCreds();
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "GET",
    headers: { Authorization: authHeader(email, apiKey) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    return { ok: false, error: json?.message || `HTTP ${res.status}` };
  }
  // Fetch balance separately (best-effort)
  let balance: number | undefined;
  try {
    const balRes = await fetch(`${BASE_URL}/balance`, {
      method: "GET",
      headers: { Authorization: authHeader(email, apiKey) },
    });
    const balJson = await balRes.json().catch(() => ({}));
    if (balRes.ok && typeof balJson?.data?.balance === "number") {
      balance = balJson.data.balance;
    }
  } catch (_) {
    // ignore
  }
  return { ok: true, balance };
}

export type SendResult = {
  ok: boolean;
  providerMessageId?: string;
  status?: string;
  error?: string;
  fallback?: boolean;
  raw?: unknown;
};

function extractProviderMessage(payload: any, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const candidates = [
    payload.message,
    payload.error,
    payload?.data?.message,
    payload?.data?.error,
    Array.isArray(payload?.data) ? payload.data[0]?.message : undefined,
    Array.isArray(payload?.data) ? payload.data[0]?.error : undefined,
  ];
  const message = candidates.find((value) => typeof value === "string" && value.trim());
  return message ? String(message).trim() : fallback;
}

function isTemporarySmsError(status: number, message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    status >= 500 ||
    normalized.includes("service unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("temporary unavailable") ||
    normalized.includes("временно недоступ") ||
    normalized.includes("сервис временно") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("bad gateway") ||
    normalized.includes("gateway timeout")
  );
}

function toUserSmsError(status: number, providerMessage: string): { error: string; fallback: boolean } {
  if (isTemporarySmsError(status, providerMessage)) {
    return { error: "Сервис SMS временно недоступен. Попробуйте позже.", fallback: true };
  }

  if (/validation error/i.test(providerMessage)) {
    return { error: "SMS-сервис не принял номер. Проверьте номер или попробуйте другой.", fallback: false };
  }

  return { error: providerMessage || "Не удалось отправить SMS. Попробуйте позже.", fallback: false };
}

export async function sendSms(params: {
  phone: string;
  text: string;
  sign?: string;
}): Promise<SendResult> {
  const { email, apiKey } = await getCreds();
  const number = normalizePhone(params.phone);
  if (!number) return { ok: false, error: "Пустой номер телефона" };

  // SMS Aero требует sign. Если своя подпись не подтверждена — используем дефолтную "SMS Aero".
  const sign = params.sign && params.sign.trim() ? params.sign.trim() : "SMS Aero";
  const body: Record<string, unknown> = {
    number,
    text: params.text,
    sign,
    channel: "DIRECT",
  };

  // Привязываем callback для получения реального статуса доставки.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const webhookSecret = Deno.env.get("SMSAERO_WEBHOOK_SECRET") ?? "";
  if (supabaseUrl && webhookSecret) {
    body.callbackUrl = `${supabaseUrl}/functions/v1/sms-aero-webhook?token=${encodeURIComponent(webhookSecret)}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/sms/send`, {
      method: "POST",
      headers: {
        Authorization: authHeader(email, apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return {
      ok: false,
      status: "network_error",
      error: "Сервис SMS временно недоступен. Попробуйте позже.",
      fallback: true,
      raw: { message },
    };
  }

  const responseText = await res.text().catch(() => "");
  const json: any = responseText ? (() => {
    try { return JSON.parse(responseText); } catch (_) { return {}; }
  })() : {};

  if (!res.ok || json?.success === false) {
    const providerMessage = extractProviderMessage(json, responseText || `HTTP ${res.status}`);
    const normalized = toUserSmsError(res.status, providerMessage);
    return {
      ok: false,
      status: String(res.status),
      error: normalized.error,
      fallback: normalized.fallback,
      raw: json && Object.keys(json).length > 0 ? json : { message: responseText },
    };
  }
  // data is an object (single send) or array
  const data = Array.isArray(json?.data) ? json.data[0] : json?.data;
  return {
    ok: true,
    providerMessageId: data?.id ? String(data.id) : undefined,
    status: data?.status ? String(data.status) : "queued",
    raw: json,
  };
}

/** Render `{{var}}` placeholders in body using provided variables map. */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
