// Admin-only endpoint for managing & testing Telegram bot.
// Actions: get_status, save, test_connection, test_event
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok && data?.ok, data, status: resp.status };
}

function sampleMessage(eventType: string): string {
  if (eventType === "user_registered") {
    return (
      "🧪 <b>[ТЕСТ]</b>\n" +
      "🆕 <b>Новая регистрация</b>\n" +
      "👤 Иван Иванов\n" +
      "📧 ivan@example.com\n" +
      "📱 +7 999 123-45-67\n" +
      "🕒 " + new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
    );
  }
  if (eventType === "subscription_paid") {
    return (
      "🧪 <b>[ТЕСТ]</b>\n" +
      "💰 <b>Новая оплата</b>\n" +
      "👤 Иван Иванов (ivan@example.com)\n" +
      "📦 Тариф: Премиум (годовой)\n" +
      "💵 120 000 ₽\n" +
      "🕒 " + new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
    );
  }
  return "🧪 [ТЕСТ] Уведомление " + eventType;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
  if (cErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

  const userId = claims.claims.sub;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check superadmin role
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isSuper = (roles ?? []).some((r) => r.role === "superadmin");
  if (!isSuper) return json({ error: "forbidden" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action;

  const { data: settings } = await admin
    .from("telegram_notification_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  if (!settings) return json({ error: "settings row missing" }, 500);

  switch (action) {
    case "get_status": {
      const tokenMasked = settings.bot_token
        ? settings.bot_token.slice(0, 6) + "…" + settings.bot_token.slice(-4)
        : "";
      return json({
        configured: !!settings.bot_token && !!settings.chat_id,
        is_active: settings.is_active,
        chat_id: settings.chat_id,
        bot_token_mask: tokenMasked,
        enabled_events: settings.enabled_events,
      });
    }

    case "save": {
      const update: Record<string, any> = {
        updated_by: userId,
      };
      if (typeof body.bot_token === "string" && body.bot_token.trim() && !body.bot_token.includes("…")) {
        update.bot_token = body.bot_token.trim();
      }
      if (typeof body.chat_id === "string") update.chat_id = body.chat_id.trim();
      if (typeof body.is_active === "boolean") update.is_active = body.is_active;
      if (body.enabled_events && typeof body.enabled_events === "object") {
        update.enabled_events = body.enabled_events;
      }
      const { error } = await admin
        .from("telegram_notification_settings")
        .update(update)
        .eq("singleton", true);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    case "test_connection": {
      const botToken = (typeof body.bot_token === "string" && body.bot_token.trim() && !body.bot_token.includes("…"))
        ? body.bot_token.trim()
        : settings.bot_token;
      const chatId = typeof body.chat_id === "string" && body.chat_id.trim()
        ? body.chat_id.trim()
        : settings.chat_id;
      if (!botToken) return json({ ok: false, error: "Bot token не задан" });

      // getMe
      const meResp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meResp.json().catch(() => ({}));
      if (!meResp.ok || !meData?.ok) {
        return json({ ok: false, error: meData?.description || "Неверный токен бота" });
      }
      const botName = meData.result?.username ? "@" + meData.result.username : meData.result?.first_name;

      if (!chatId) {
        return json({ ok: true, bot: botName, warning: "Chat ID не задан — сообщение не отправлено" });
      }

      const sent = await sendTelegram(
        botToken,
        chatId,
        `✅ <b>Подключение успешно</b>\nБот ${botName} готов отправлять уведомления.`
      );
      if (!sent.ok) {
        return json({ ok: false, bot: botName, error: sent.data?.description || `HTTP ${sent.status}` });
      }
      return json({ ok: true, bot: botName });
    }

    case "test_event": {
      const eventType = body.event_type;
      if (!eventType) return json({ error: "event_type required" }, 400);
      if (!settings.bot_token || !settings.chat_id) {
        return json({ ok: false, error: "Бот не настроен — сначала сохрани токен и chat_id" });
      }
      const text = sampleMessage(eventType);
      const sent = await sendTelegram(settings.bot_token, settings.chat_id, text);
      await admin.from("telegram_notification_log").insert({
        event_type: eventType,
        payload: { test: true },
        status: sent.ok ? "sent" : "failed",
        error: sent.ok ? null : (sent.data?.description || `HTTP ${sent.status}`),
        is_test: true,
      });
      if (!sent.ok) return json({ ok: false, error: sent.data?.description || `HTTP ${sent.status}` });
      return json({ ok: true });
    }

    default:
      return json({ error: "unknown action" }, 400);
  }
});
