// Receives operator replies from the Telegram support group and delivers them to the website chat.
import { createClient } from "npm:@supabase/supabase-js@2";
import { tg } from "../_shared/support-tg.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: s } = await db.from("telegram_notification_settings")
    .select("bot_token, support_chat_id, support_webhook_secret").eq("singleton", true).maybeSingle();
  if (!s?.bot_token || req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== s.support_webhook_secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    const m = update.message;
    if (!m?.chat?.id || m.from?.is_bot) return new Response("ok");
    const text: string = (m.text ?? m.caption ?? "").trim();
    const chatId = String(m.chat.id);

    if (/^\/id(@\w+)?$/.test(text)) {
      await tg(s.bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: `id этой группы: ${chatId}`,
      });
      return new Response("ok");
    }

    if (chatId !== String(s.support_chat_id) || !m.message_thread_id || m.forum_topic_created) return new Response("ok");
    if (!text || text.startsWith("//")) return new Response("ok");

    const { data: conv } = await db.from("support_conversations").select("id, email, name")
      .eq("tg_topic_id", m.message_thread_id).maybeSingle();
    if (!conv) return new Response("ok");

    const { data: inserted, error } = await db.from("support_messages").insert({
      conversation_id: conv.id, direction: "operator", text, tg_message_id: m.message_id,
    }).select("id").single();

    if (error) {
      await tg(s.bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: "⚠️ Ответ не доставлен посетителю — попробуйте ещё раз.",
      });
      return new Response("ok");
    }

    await tg(s.bot_token, "setMessageReaction", {
      chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👍" }],
    });

    if (conv.email) {
      const { error: mailErr } = await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: "support-reply",
          recipientEmail: conv.email,
          idempotencyKey: `support-reply-${inserted.id}`,
          templateData: { name: conv.name, message: text },
        },
      });
      if (mailErr) console.error("support reply email failed", mailErr);
      else await db.from("support_messages").update({ emailed: true }).eq("id", inserted.id);
    }
    return new Response("ok");
  } catch (e) {
    console.error("support-telegram-webhook error", e);
    return new Response("ok");
  }
});
