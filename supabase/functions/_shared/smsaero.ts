// Shared SMS Aero v2 client.
// Docs: https://smsaero.ru/api/

const BASE_URL = "https://gate.smsaero.ru/v2";

function getCreds() {
  const email = Deno.env.get("SMSAERO_EMAIL") ?? "";
  const apiKey = Deno.env.get("SMSAERO_API_KEY") ?? "";
  if (!email || !apiKey) {
    throw new Error("SMSAERO_EMAIL и SMSAERO_API_KEY не настроены");
  }
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
  const { email, apiKey } = getCreds();
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
  raw?: unknown;
};

export async function sendSms(params: {
  phone: string;
  text: string;
  sign?: string;
}): Promise<SendResult> {
  const { email, apiKey } = getCreds();
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

  const res = await fetch(`${BASE_URL}/sms/send`, {
    method: "POST",
    headers: {
      Authorization: authHeader(email, apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    return {
      ok: false,
      error: json?.message || `HTTP ${res.status}`,
      raw: json,
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
