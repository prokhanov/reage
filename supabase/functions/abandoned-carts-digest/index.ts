// abandoned-carts-digest: ежедневная сводка брошенных корзин гостей в report bot (09:00 МСК).
// Вызывается pg_cron с заголовком x-internal-secret = telegram_notification_settings.internal_secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ₽`;
const MSK = 3 * 3600e3;
const fmtDT = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + MSK);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};
const fmtD = (t: number) => {
  const d = new Date(t + MSK);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const fmtPhone = (p: string) =>
  p.length === 11 ? `+7 ${p.slice(1, 4)} ${p.slice(4, 7)}-${p.slice(7, 9)}-${p.slice(9)}` : p;
const isTestEmail = (e: string | null) => !!e && /@(example\.(com|org|net)|test\.(com|ru))$/i.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { data: settings } = await admin.from("telegram_notification_settings")
      .select("bot_token, chat_id, is_active, enabled_events, internal_secret").eq("singleton", true).maybeSingle();
    if (!settings || req.headers.get("x-internal-secret") !== settings.internal_secret) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!settings.is_active || !settings.bot_token || !settings.chat_id) return json({ skipped: "telegram_inactive" });
    if ((settings.enabled_events as Record<string, boolean> | null)?.abandoned_digest === false) {
      return json({ skipped: "disabled" });
    }

    // Окно: вчера 09:00 МСК — сегодня 09:00 МСК (06:00 UTC).
    const now = new Date();
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0)
      - (now.getUTCHours() < 6 ? 864e5 : 0);
    const start = end - 864e5;
    const dayKey = new Date(end + MSK).toISOString().slice(0, 10);
    const eventType = `abandoned_digest:${dayKey}`;

    const { data: already } = await admin.from("telegram_notification_log")
      .select("id").eq("event_type", eventType).eq("status", "sent").limit(1);
    if (already && already.length) return json({ skipped: "already_sent", day: dayKey });

    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();

    const [{ data: leads }, { data: paid }, { data: prices }] = await Promise.all([
      admin.from("checkup_cart_leads").select("*").in("status", ["incomplete", "checkout"])
        .gte("updated_at", startIso).lt("updated_at", endIso).order("updated_at", { ascending: false }),
      // Оплаты с начала окна до текущего момента — кто оплатил позже, тоже не брошен.
      admin.from("energy_orders").select("email, phone, is_test").eq("status", "paid").gte("paid_at", startIso),
      admin.from("checkup_prices").select("slug, title"),
    ]);

    const titles = new Map((prices ?? []).map((p) => [p.slug, String(p.title).replace(/^ReAge\s+/i, "")]));
    const digits = (p: string | null) => {
      const d = (p ?? "").replace(/\D/g, "");
      return d.length === 11 ? "7" + d.slice(1) : d.length === 10 ? "7" + d : "";
    };
    const paidEmails = new Set((paid ?? []).map((o) => (o.email ?? "").toLowerCase()).filter(Boolean));
    const paidPhones = new Set((paid ?? []).map((o) => digits(o.phone)).filter(Boolean));

    // Группировка по человеку: телефон, иначе email. Берём самую свежую корзину.
    const groups = new Map<string, any>();
    for (const l of leads ?? []) {
      if (isTestEmail(l.email)) continue;
      const ph = digits(l.phone);
      const em = (l.email ?? "").toLowerCase();
      if ((ph && paidPhones.has(ph)) || (em && paidEmails.has(em))) continue;
      const key = ph || em;
      if (!key) continue;
      const ex = groups.get(key) ?? (em ? [...groups.values()].find((g) => g._em === em) : undefined);
      if (ex) {
        ex.email ||= l.email; ex.phone ||= l.phone;
        ex.last_name ||= l.last_name; ex.first_name ||= l.first_name; ex.middle_name ||= l.middle_name;
        if (l.status === "checkout") ex.status = "checkout";
        continue;
      }
      groups.set(key, { ...l, _em: em });
    }
    const list = [...groups.values()];

    const header = `🛒 <b>Брошенные корзины за сутки</b> (${fmtD(start)} 09:00 – ${fmtD(end)} 09:00)`;
    const parts: string[] = [];
    if (!list.length) {
      parts.push(`🛒 Брошенных корзин за сутки нет (${fmtD(start)} 09:00 – ${fmtD(end)} 09:00)`);
    } else {
      const sum = list.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const blocks = list.map((l, i) => {
        const fio = [l.last_name, l.first_name, l.middle_name].filter(Boolean).join(" ");
        const lines = [`<b>${i + 1}. ${fio ? esc(fio) : "ФИО не указано"}</b>`];
        const contacts = [l.phone ? `📱 ${fmtPhone(digits(l.phone) || l.phone)}` : "", l.email ? `📧 ${esc(l.email)}` : ""].filter(Boolean);
        lines.push("   " + contacts.join(" · "));
        const bundles: string[] = l.bundles ?? [];
        lines.push(bundles.length
          ? `   🧪 ${esc(bundles.map((b) => titles.get(b) ?? b).join(", "))}${Number(l.amount) ? ` — ${rub(Number(l.amount))}` : ""}`
          : "   🧪 Корзина пуста");
        if (bundles.length) {
          if (l.location_type === "home") lines.push(`   🏠 Выезд на дом${l.clinic_address ? `: ${esc(l.clinic_address)}` : ""} (+2 990 ₽)`);
          else if (l.clinic_title) lines.push(`   🏥 Клиника: ${esc(l.clinic_title)}`);
        }
        if (l.consult) lines.push(`   👨‍⚕️ Консультация врача${l.consult_price ? `: +${rub(Number(l.consult_price))}` : ""}`);
        if (l.promo_code) lines.push(`   🏷 Промокод: ${esc(l.promo_code)}`);
        const utm = l.utm && typeof l.utm === "object"
          ? [l.utm.utm_source, l.utm.utm_medium].filter(Boolean).join(" / ") : "";
        lines.push(`   📄 ${esc(l.page ?? "—")} · ${utm ? `UTM: ${esc(utm)}` : "прямой заход"}`);
        lines.push(`   🕒 ${fmtDT(l.updated_at)}${l.status === "checkout" ? " · ушёл на оплату, не оплатил" : ""}`);
        return lines.join("\n");
      });
      const footer = "\nОткрыть в админке: reage.life/admin/checkups → Заказы";
      let cur = `${header}\n\nВсего: ${list.length} · на сумму ${rub(sum)}`;
      for (const b of blocks) {
        if ((cur + "\n\n" + b).length > 3800) { parts.push(cur); cur = b; } else cur += "\n\n" + b;
      }
      parts.push(cur + footer);
    }

    let error: string | null = null;
    for (const text of parts) {
      const r = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: settings.chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (!r.ok) { error = `[${r.status}] ${await r.text()}`; break; }
    }
    await admin.from("telegram_notification_log").insert({
      event_type: eventType, payload: { count: list.length, parts: parts.length }, status: error ? "failed" : "sent", error,
    });
    if (error) console.error("digest send failed", error);
    return json({ ok: !error, count: list.length, day: dayKey, error });
  } catch (e) {
    console.error("abandoned-carts-digest", e);
    return json({ error: String(e) }, 500);
  }
});
