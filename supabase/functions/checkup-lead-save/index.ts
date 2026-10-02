// checkup-lead-save: фоновое сохранение незавершённой корзины гостя (без входа).
// Клиенту ничего не возвращаем по сути — всегда 200/204, ошибки молча логируем.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

const s = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const lastHit = new Map<string, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return ok();
    const token = s(body.token, 100);
    if (!token || token.length < 16) return ok();

    // Вошедших не трогаем: у них данные есть в профиле.
    const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (auth && auth.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(auth.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.sub && payload?.role === "authenticated") return ok();
      } catch { /* anon */ }
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = Date.now();
    if (now - (lastHit.get(tokenHash) ?? 0) < 700) return ok();
    lastHit.set(tokenHash, now);
    if (lastHit.size > 5000) lastHit.clear();

    const email = s(body.email, 254);
    const emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
    const phoneDigits = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const phone = phoneDigits.length === 11 ? phoneDigits : null;
    if (!emailOk && !phone) return ok();

    const birth = s(body.birthDate, 10);
    const bundles = Array.isArray(body.bundles)
      ? body.bundles.filter((b): b is string => typeof b === "string").slice(0, 20).map((b) => b.slice(0, 60))
      : [];
    const amount = Number(body.amount);
    const utm = body.utm && typeof body.utm === "object" ? body.utm : null;

    const { data: existing } = await admin.from("checkup_cart_leads").select("id, status").eq("token_hash", tokenHash).maybeSingle();
    if (existing && existing.status !== "incomplete") return ok();

    const row = {
      token_hash: tokenHash,
      email: emailOk,
      phone,
      last_name: s(body.lastName, 80),
      first_name: s(body.firstName, 80),
      middle_name: s(body.middleName, 80),
      birth_date: birth && /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : null,
      bundles,
      clinic_title: s(body.clinicTitle, 200),
      clinic_address: s(body.clinicAddress, 300),
      location_type: body.locationType === "home" ? "home" : "clinic",
      promo_code: s(body.promoCode, 40),
      amount: Number.isFinite(amount) && amount >= 0 && amount < 10_000_000 ? amount : null,
      page: s(body.page, 300),
      utm,
      ym_client_id: typeof body.ymClientId === "string" && /^\d{1,32}$/.test(body.ymClientId) ? body.ymClientId : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("checkup_cart_leads").upsert(row, { onConflict: "token_hash" });
    if (error) console.error("lead upsert", error.message);

    // Изредка чистим старые незавершённые записи (>90 дней).
    if (Math.random() < 0.02) {
      await admin.from("checkup_cart_leads").delete().eq("status", "incomplete")
        .lt("updated_at", new Date(now - 90 * 864e5).toISOString());
    }
    return ok();
  } catch (e) {
    console.error("checkup-lead-save", e);
    return ok();
  }
});
