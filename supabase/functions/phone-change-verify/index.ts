import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_SALT = SERVICE_ROLE.slice(0, 32);

const MAX_ATTEMPTS = 5;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeIntl(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "Не авторизован" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ ok: false, error: "Не авторизован" }, 401);
    const userId = userRes.user.id;

    const { phone: rawPhone, code: rawCode } = await req.json().catch(() => ({}));
    const phone = normalizeIntl(String(rawPhone || ""));
    const code = String(rawCode || "").trim();

    if (phone.length < 10 || !/^\d{4}$/.test(code)) {
      return json({ ok: false, error: "Некорректные данные" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: row, error: selErr } = await admin
      .from("phone_otp_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", userId)
      .eq("phone", phone)
      .eq("purpose", "change")
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) {
      console.error("[phone-change-verify] select error", selErr.message);
      return json({ ok: false, error: "Ошибка сервера" }, 500);
    }
    if (!row) {
      return json({ ok: false, error: "Код истёк или не найден. Запросите новый." });
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await admin
        .from("phone_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      return json({ ok: false, error: "Слишком много попыток. Запросите новый код." });
    }

    const expected = await sha256(`${code}:${phone}:${APP_SALT}`);
    if (expected !== row.code_hash) {
      await admin
        .from("phone_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return json({
        ok: false,
        error: "Неверный код",
        attemptsLeft: MAX_ATTEMPTS - row.attempts - 1,
      });
    }

    // Double-check phone isn't taken by another user
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing && existing.id !== userId) {
      return json({ ok: false, error: "Номер уже занят другим пользователем" });
    }

    // Consume code
    await admin
      .from("phone_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // Update profile
    const { error: updErr } = await admin
      .from("profiles")
      .update({ phone, phone_verified_at: new Date().toISOString() })
      .eq("id", userId);

    if (updErr) {
      console.error("[phone-change-verify] update error", updErr.message);
      return json({ ok: false, error: "Не удалось обновить профиль" }, 500);
    }

    return json({ ok: true, phone });
  } catch (e) {
    console.error("[phone-change-verify] unexpected", e);
    return json({ ok: false, error: "Внутренняя ошибка" }, 500);
  }
});
