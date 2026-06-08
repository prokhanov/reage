// SMS Aero webhook: получает фактический статус доставки SMS и обновляет sms_send_log.
// Public endpoint (verify_jwt = false). Защищён секретом в query-параметре `token`.
//
// SMS Aero может звать webhook как GET (query-параметры), так и POST (form/JSON).
// Поддерживаем оба варианта.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Маппинг статусов SMS Aero (v2) -> наш внутренний статус.
// Числовые коды: https://smsaero.ru/api/  (status, deliveryStatus).
// Строковые значения встречаются как "delivery", "wrongnumber", "expired" и т.п.
function mapStatus(raw: string | number | undefined | null): {
  status: string;
  delivered: boolean;
  reason?: string;
} {
  const s = String(raw ?? "").toLowerCase().trim();
  // Числовые коды в callback SMS Aero:
  // 0 queue, 1 delivered, 2 not delivered, 3 expired, 4 wrong number,
  // 6 rejected (по их док-ции коды callback и API send различаются).
  const numericMap: Record<string, { status: string; delivered: boolean; reason?: string }> = {
    "0": { status: "queued", delivered: false },
    "1": { status: "delivered", delivered: true },
    "2": { status: "undelivered", delivered: false, reason: "Не доставлено" },
    "3": { status: "expired", delivered: false, reason: "Истёк срок доставки" },
    "4": { status: "wrongnumber", delivered: false, reason: "Неверный номер" },
    "5": { status: "failed", delivered: false, reason: "Ошибка отправки" },
    "6": { status: "rejected", delivered: false, reason: "Отклонено оператором" },
    "8": { status: "delivered", delivered: true },
    "9": { status: "delivered", delivered: true },
  };
  if (numericMap[s]) return numericMap[s];

  if (s === "delivery" || s === "delivered") return { status: "delivered", delivered: true };
  if (s === "wrongnumber" || s === "wrong_number") return { status: "wrongnumber", delivered: false, reason: "Неверный номер" };
  if (s === "expired") return { status: "expired", delivered: false, reason: "Истёк срок доставки" };
  if (s === "undelivered" || s === "not_delivered") return { status: "undelivered", delivered: false, reason: "Не доставлено" };
  if (s === "rejected" || s === "reject") return { status: "rejected", delivered: false, reason: "Отклонено оператором" };
  if (s === "failed" || s === "fail") return { status: "failed", delivered: false, reason: "Ошибка отправки" };
  if (s === "queued" || s === "queue") return { status: "queued", delivered: false };
  if (s === "sent" || s === "moderation") return { status: s, delivered: false };

  return { status: s || "unknown", delivered: false };
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams) params[k] = v;
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        const body = await req.json();
        if (body && typeof body === "object") {
          for (const [k, v] of Object.entries(body)) params[k] = String(v as any);
        }
      } else {
        const text = await req.text();
        if (text) {
          const usp = new URLSearchParams(text);
          for (const [k, v] of usp) params[k] = v;
        }
      }
    } catch {
      // ignore body parse errors
    }
  }
  return params;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const expected = Deno.env.get("SMSAERO_WEBHOOK_SECRET") ?? "";
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = await readParams(req);
    const providerMessageId = String(params.id ?? params.message_id ?? "");
    const rawStatus = params.status ?? params.deliveryStatus ?? params.delivery_status;

    if (!providerMessageId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapped = mapStatus(rawStatus);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const updates: Record<string, unknown> = {
      status: mapped.status,
      provider_status: String(rawStatus ?? ""),
    };
    if (mapped.delivered) updates.delivered_at = new Date().toISOString();
    if (mapped.reason) updates.error_message = mapped.reason;

    const { error, data } = await supabase
      .from("sms_send_log")
      .update(updates)
      .eq("provider_message_id", providerMessageId)
      .select("id");

    if (error) {
      console.error("sms-aero-webhook update error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, updated: data?.length ?? 0, status: mapped.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sms-aero-webhook fatal:", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
