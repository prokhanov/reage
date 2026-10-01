// Receives operator replies from the Telegram support group and delivers them to the website chat.
import { createClient } from "npm:@supabase/supabase-js@2";
import { tg } from "../_shared/support-tg.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: s } = await db.from("telegram_notification_settings")
    .select("support_bot_token, support_chat_id, support_webhook_secret").eq("singleton", true).maybeSingle();
  if (!s?.support_bot_token || req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== s.support_webhook_secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();

    // Operator edited a reply in Telegram — update the text on the site
    const em = update.edited_message;
    if (em) {
      if (String(em.chat?.id) === String(s.support_chat_id) && !em.from?.is_bot) {
        const newText = String(em.text ?? em.caption ?? "").trim();
        if (newText && !newText.startsWith("//")) {
          const { data: upd } = await db.from("support_messages").update({ text: newText })
            .eq("tg_message_id", em.message_id).eq("direction", "operator").select("id");
          if (upd?.length) {
            await tg(s.support_bot_token, "setMessageReaction", {
              chat_id: em.chat.id, message_id: em.message_id, reaction: [{ type: "emoji", emoji: "✍" }],
            });
          }
        }
      }
      return new Response("ok");
    }

    const m = update.message;
    if (!m?.chat?.id || m.from?.is_bot) return new Response("ok");
    const text: string = (m.text ?? m.caption ?? "").trim();
    const chatId = String(m.chat.id);

    if (/^\/id(@\w+)?$/.test(text)) {
      await tg(s.support_bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: `id этой группы: ${chatId}`,
      });
      return new Response("ok");
    }

    if (chatId !== String(s.support_chat_id) || !m.message_thread_id) return new Response("ok");
    // Service events (topic created/renamed/closed/reopened, pins, joins) — ignore
    if (m.forum_topic_created || m.forum_topic_edited || m.forum_topic_closed || m.forum_topic_reopened ||
        m.pinned_message || m.new_chat_members || m.left_chat_member) return new Response("ok");
    if (text.startsWith("//")) return new Response("ok");

    // /del as a reply to own answer — remove it from the site (Telegram doesn't notify bots about deletions)
    if (/^\/(del|delete|удалить)(@\w+)?$/i.test(text)) {
      const target = m.reply_to_message;
      const isRealReply = target && target.message_id !== m.message_thread_id;
      let removed = 0;
      if (isRealReply) {
        const { data: del } = await db.from("support_messages").delete()
          .eq("tg_message_id", target.message_id).eq("direction", "operator").select("id");
        removed = del?.length ?? 0;
      }
      if (removed) {
        await tg(s.support_bot_token, "deleteMessage", { chat_id: m.chat.id, message_id: target.message_id });
        await tg(s.support_bot_token, "deleteMessage", { chat_id: m.chat.id, message_id: m.message_id });
      } else {
        await tg(s.support_bot_token, "sendMessage", {
          chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
          text: "Чтобы удалить ответ у посетителя, ответьте командой /del на сам свой ответ.",
        });
      }
      return new Response("ok");
    }

    const { data: conv } = await db.from("support_conversations").select("id, email, name")
      .eq("tg_topic_id", m.message_thread_id).maybeSingle();
    if (!conv) {
      if (text) await tg(s.support_bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: "⚠️ Эта тема не связана с посетителем сайта (старая или пересозданная) — ответ не доставлен. Пишите в актуальную тему посетителя.",
      });
      return new Response("ok");
    }
    if (!text) {
      await tg(s.support_bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: "⚠️ Посетителю доставляется только текст. Файлы, фото, стикеры и голосовые не передаются — напишите словами.",
      });
      return new Response("ok");
    }

    const { data: inserted, error } = await db.from("support_messages").insert({
      conversation_id: conv.id, direction: "operator", text, tg_message_id: m.message_id,
    }).select("id").single();

    if (error) {
      await tg(s.support_bot_token, "sendMessage", {
        chat_id: m.chat.id, message_thread_id: m.message_thread_id, reply_to_message_id: m.message_id,
        text: "⚠️ Ответ не доставлен посетителю — попробуйте ещё раз.",
      });
      return new Response("ok");
    }

    await tg(s.support_bot_token, "setMessageReaction", {
      chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👍" }],
    });

    // Email is sent later by support-email-digest, only if the reply stays unread (batched).
    return new Response("ok");
  } catch (e) {
    console.error("support-telegram-webhook error", e);
    return new Response("ok");
  }
});
