// Every minute: emails visitors their unread operator replies in ONE letter per conversation.
// A reply is emailed only if the visitor hasn't read it within DELAY and isn't currently on the site.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DELAY_MIN = 5;
const ONLINE_SEC = 60;

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SERVICE_KEY}`) return new Response("Unauthorized", { status: 401 });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  const cutoff = new Date(Date.now() - DELAY_MIN * 60_000).toISOString();
  const { data: msgs, error } = await db.from("support_messages")
    .select("id, conversation_id, text, created_at")
    .eq("direction", "operator").eq("emailed", false).eq("read_by_visitor", false)
    .order("created_at").limit(500);
  if (error) return new Response(error.message, { status: 500 });

  const byConv = new Map<string, typeof msgs>();
  for (const m of msgs ?? []) {
    if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
    byConv.get(m.conversation_id)!.push(m);
  }

  let sent = 0;
  for (const [convId, list] of byConv) {
    // wait until the newest reply is DELAY old, so a burst of replies goes in one letter
    if (list[list.length - 1].created_at > cutoff) continue;
    const { data: conv } = await db.from("support_conversations").select("email, name, last_seen_at").eq("id", convId).maybeSingle();
    const ids = list.map((m) => m.id);
    if (!conv?.email) { await db.from("support_messages").update({ emailed: true }).in("id", ids); continue; }
    if (conv.last_seen_at && Date.now() - new Date(conv.last_seen_at).getTime() < ONLINE_SEC * 1000) continue;

    const { error: mailErr } = await db.functions.invoke("send-transactional-email", {
      body: {
        templateName: "support-reply",
        recipientEmail: conv.email,
        idempotencyKey: `support-digest-${ids[ids.length - 1]}`,
        templateData: { name: conv.name, messages: list.map((m) => m.text) },
      },
    });
    if (mailErr) { console.error("digest email failed", convId, mailErr); continue; }
    await db.from("support_messages").update({ emailed: true }).in("id", ids);
    sent++;
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
});
