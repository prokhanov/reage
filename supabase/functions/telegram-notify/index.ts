// Internal endpoint called by DB triggers via pg_net.
// Reads settings, formats event payload, sends to Telegram, logs result.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function formatAmount(n: unknown): string {
  const num = Number(n);
  if (!isFinite(num)) return String(n ?? "");
  return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
}

const STATUS_LABELS: Record<string, string> = {
  waiting_call: "Ожидает звонка",
  no_answer: "Не дозвонились",
  not_scheduled: "Не назначен",
  scheduled: "Назначен",
  received: "Получен",
  collected: "Обрабатывается",
  uploaded: "Загружен",
};

function applyBookingVars(template: string, payload: Record<string, any>): string {
  const date = payload.booking_date ? String(payload.booking_date) : "";
  const time = payload.booking_time ? String(payload.booking_time).slice(0, 5) : "";
  const vars: Record<string, string> = {
    patient: escapeHtml(payload.name || "—"),
    email: escapeHtml(payload.email || "—"),
    phone: escapeHtml(payload.phone || "—"),
    date: escapeHtml(date),
    time: escapeHtml(time),
    address: escapeHtml(payload.address || "—"),
    status: escapeHtml(STATUS_LABELS[String(payload.status)] || String(payload.status || "—")),
    url: escapeHtml(payload.url || "https://reage.life/profile"),
  };
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function buildMessage(
  eventType: string,
  payload: Record<string, any>,
  isTest = false,
  bookingTemplates: Record<string, string> | null = null,
): string {
  const prefix = isTest ? "🧪 <b>[ТЕСТ]</b>\n" : "";
  const e = (v: unknown) => escapeHtml(v);

  switch (eventType) {
    case "user_registered": {
      const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "—";
      return (
        prefix +
        "🆕 <b>Новая регистрация</b>\n" +
        `👤 ${e(name)}\n` +
        `📧 ${e(payload.email || "—")}\n` +
        `📱 ${e(payload.phone || "—")}\n` +
        `🕒 ${e(formatDate(payload.created_at))}`
      );
    }
    case "subscription_paid": {
      const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ") || payload.email || "—";
      return (
        prefix +
        "💰 <b>Новая оплата</b>\n" +
        `👤 ${e(name)} (${e(payload.email || "—")})\n` +
        `📦 Тариф: ${e(payload.plan_name || payload.plan_type || "—")}\n` +
        `💵 ${e(formatAmount(payload.amount))}\n` +
        (payload.payment_method ? `💳 ${e(payload.payment_method)}\n` : "") +
        `🕒 ${e(formatDate(payload.start_date || new Date().toISOString()))}`
      );
    }
    case "booking_status_changed": {
      // Prefer custom per-status template from settings if available
      const key: string | null = payload.template_key || null;
      const tplText = key && bookingTemplates && typeof bookingTemplates[key] === "string"
        ? bookingTemplates[key]
        : null;
      if (tplText && tplText.trim()) {
        return prefix + applyBookingVars(tplText, payload);
      }

      const statusLabel = STATUS_LABELS[String(payload.status)] || String(payload.status || "—");
      return (
        prefix +
        "📅 <b>Запись на анализ</b>\n" +
        `👤 ${e(payload.name || "—")} (${e(payload.email || "—")})\n` +
        `📱 ${e(payload.phone || "—")}\n` +
        `🗓 ${e(payload.booking_date || "—")} ${e((payload.booking_time || "").slice(0,5))}\n` +
        `📍 ${e(payload.address || "—")}\n` +
        `🏷 Статус: <b>${e(statusLabel)}</b>`
      );
    }
    case "sms_low_balance": {
      const balance = Number(payload.balance);
      const threshold = Number(payload.threshold);
      const tpl: string | null = payload.template || null;
      const vars: Record<string, string> = {
        balance: isFinite(balance) ? balance.toFixed(2) : String(payload.balance ?? "—"),
        threshold: isFinite(threshold) ? String(threshold) : String(payload.threshold ?? "—"),
      };
      if (tpl && tpl.trim()) {
        return prefix + tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
      }
      return (
        prefix +
        "⚠️ <b>Низкий баланс SMS Aero</b>\n" +
        `Остаток: <b>${e(vars.balance)} ₽</b>\n` +
        `Порог: ${e(vars.threshold)} ₽`
      );
    }
    default:
      return prefix + `📣 <b>${e(eventType)}</b>\n<pre>${e(JSON.stringify(payload, null, 2))}</pre>`;
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const eventType: string = body.event_type;
    const payload = body.payload ?? {};
    const isTest = !!body.is_test;

    if (!eventType) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load settings
    const { data: settings, error: sErr } = await supabase
      .from("telegram_notification_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    if (sErr || !settings) {
      return new Response(JSON.stringify({ error: "settings not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify internal secret (allow bypass when called by superadmin via test endpoint — that uses telegram-settings, not here)
    const provided = req.headers.get("x-internal-secret");
    if (!provided || provided !== settings.internal_secret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.is_active || !settings.bot_token || !settings.chat_id) {
      await supabase.from("telegram_notification_log").insert({
        event_type: eventType,
        payload,
        status: "skipped",
        error: "not configured or inactive",
        is_test: isTest,
      });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabled = (settings.enabled_events ?? {})[eventType];
    if (!isTest && !enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "event disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = buildMessage(eventType, payload, isTest, (settings as any).booking_templates ?? null);

    const tgResp = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const tgData = await tgResp.json().catch(() => ({}));

    const ok = tgResp.ok && tgData?.ok;
    await supabase.from("telegram_notification_log").insert({
      event_type: eventType,
      payload,
      status: ok ? "sent" : "failed",
      error: ok ? null : (tgData?.description || `HTTP ${tgResp.status}`),
      is_test: isTest,
    });

    return new Response(JSON.stringify({ ok, telegram: tgData }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("telegram-notify error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
