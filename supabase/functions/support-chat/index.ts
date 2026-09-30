// Website support chat: visitor side + admin setup actions.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { tg, esc } from "../_shared/support-tg.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Token = z.string().min(16).max(80);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("history"), token: Token, markRead: z.boolean().optional() }),
  z.object({ action: z.literal("send"), token: Token, text: z.string().trim().min(1).max(4000), page: z.string().max(500).optional() }),
  z.object({
    action: z.literal("contact"), token: Token,
    name: z.string().trim().min(1).max(150), email: z.string().trim().email().max(255),
    phone: z.string().trim().max(32).optional(),
  }),
  z.object({ action: z.literal("admin_status") }),
  z.object({ action: z.literal("admin_save"), chat_id: z.string().trim().max(40) }),
  z.object({ action: z.literal("admin_webhook") }),
]);

const THANKS = "Спасибо! Мы ответим в ближайшее время — здесь в чате и на вашу почту.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const email = parsed.error.issues.some((i) => i.path[0] === "email");
      return json({ error: email ? "Проверьте адрес почты" : "Некорректный запрос" }, 400);
    }
    const body = parsed.data;

    // Optional logged-in user
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await db.auth.getUser(auth.slice(7));
      userId = data?.user?.id ?? null;
    }

    const { data: settings } = await db.from("telegram_notification_settings").select("*").eq("singleton", true).maybeSingle();
    const s: any = settings ?? {};

    // ---------- admin ----------
    if (body.action.startsWith("admin_")) {
      if (!userId) return json({ error: "unauthorized" }, 401);
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", userId);
      if (!(roles ?? []).some((r) => r.role === "superadmin")) return json({ error: "forbidden" }, 403);
      if (body.action === "admin_save") {
        await db.from("telegram_notification_settings").update({ support_chat_id: body.chat_id || null }).eq("singleton", true);
        return json({ ok: true });
      }
      if (body.action === "admin_webhook") {
        if (!s.bot_token) return json({ error: "Сначала укажите токен бота" }, 400);
        const r = await tg(s.bot_token, "setWebhook", {
          url: `${SUPABASE_URL}/functions/v1/support-telegram-webhook`,
          secret_token: s.support_webhook_secret,
          allowed_updates: ["message"],
        });
        return json({ ok: r.ok, error: r.ok ? undefined : r.data?.description });
      }
      const info = s.bot_token ? await tg(s.bot_token, "getWebhookInfo", {}) : null;
      return json({ chat_id: s.support_chat_id ?? "", webhook_url: info?.data?.result?.url ?? "", last_error: info?.data?.result?.last_error_message ?? "" });
    }

    // ---------- visitor ----------
    let { data: conv } = await db.from("support_conversations").select("*").eq("visitor_token", body.token).maybeSingle();

    if (body.action === "history") {
      if (!conv) return json({ messages: [], hasContact: !!userId });
      const upd: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
      await db.from("support_conversations").update(upd).eq("id", conv.id);
      if (body.markRead) {
        await db.from("support_messages").update({ read_by_visitor: true }).eq("conversation_id", conv.id).eq("read_by_visitor", false);
      }
      const { data: msgs } = await db.from("support_messages")
        .select("id, direction, text, created_at, read_by_visitor")
        .eq("conversation_id", conv.id).order("created_at").limit(500);
      return json({ messages: msgs ?? [], hasContact: !!(conv.email || conv.user_id) });
    }

    if (!s.bot_token || !s.support_chat_id) return json({ error: "Чат временно недоступен" }, 503);
    const chatId = s.support_chat_id;

    if (!conv) {
      let prof: any = null;
      if (userId) {
        const { data } = await db.from("profiles").select("first_name,last_name,email,phone").eq("id", userId).maybeSingle();
        prof = data;
      }
      const name = prof ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") || null : null;
      const { data: created, error } = await db.from("support_conversations").insert({
        visitor_token: body.token, user_id: userId, name, email: prof?.email ?? null, phone: prof?.phone ?? null,
        page: body.action === "send" ? body.page ?? null : null,
      }).select().single();
      if (error) throw error;
      conv = created;
    }

    const ensureTopic = async () => {
      if (conv.tg_topic_id) return conv.tg_topic_id as number;
      const title = (conv.name || conv.email || `Гость ${conv.id.slice(0, 4)}`).slice(0, 120);
      const r = await tg(s.bot_token, "createForumTopic", { chat_id: chatId, name: title });
      if (!r.ok) throw new Error("topic: " + (r.data?.description ?? "failed"));
      const topicId = r.data.result.message_thread_id as number;
      await db.from("support_conversations").update({ tg_topic_id: topicId }).eq("id", conv.id);
      conv.tg_topic_id = topicId;
      await tg(s.bot_token, "sendMessage", {
        chat_id: chatId, message_thread_id: topicId, parse_mode: "HTML",
        text: `🆕 <b>Новый посетитель</b>\n👤 ${conv.user_id ? `id ${esc(conv.user_id)}` : "гость"}\n` +
          (conv.name ? `Имя: ${esc(conv.name)}\n` : "") +
          `📧 ${esc(conv.email || "—")}\n` + (conv.phone ? `📱 ${esc(conv.phone)}\n` : "") +
          `🔗 ${esc(conv.page || "—")}`,
      });
      return topicId;
    };

    if (body.action === "send") {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await db.from("support_messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id).eq("direction", "visitor").gte("created_at", since);
      if ((count ?? 0) >= 8) return json({ error: "Подождите минуту" }, 429);

      const topicId = await ensureTopic();
      const r = await tg(s.bot_token, "sendMessage", { chat_id: chatId, message_thread_id: topicId, text: body.text });
      if (!r.ok) return json({ error: "Сообщение не отправилось. Проверьте соединение и повторите" }, 502);
      await db.from("support_messages").insert({ conversation_id: conv.id, direction: "visitor", text: body.text, tg_message_id: r.data.result.message_id, read_by_visitor: true });
      await db.from("support_conversations").update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conv.id);
      return json({ ok: true });
    }

    // contact
    await db.from("support_conversations").update({ name: body.name, email: body.email.toLowerCase(), phone: body.phone || null }).eq("id", conv.id);
    Object.assign(conv, { name: body.name, email: body.email.toLowerCase(), phone: body.phone || null });
    const topicId = await ensureTopic();
    await tg(s.bot_token, "editForumTopic", { chat_id: chatId, message_thread_id: topicId, name: body.name.slice(0, 120) });
    await tg(s.bot_token, "sendMessage", {
      chat_id: chatId, message_thread_id: topicId, parse_mode: "HTML",
      text: `📇 <b>Контакты</b>\n👤 ${esc(body.name)}\n📧 ${esc(body.email)}\n📱 ${esc(body.phone || "—")}`,
    });
    await db.from("support_messages").insert({ conversation_id: conv.id, direction: "system", text: THANKS, read_by_visitor: true });
    return json({ ok: true });
  } catch (e) {
    console.error("support-chat error", e);
    return json({ error: "Сообщение не отправилось. Проверьте соединение и повторите" }, 500);
  }
});
