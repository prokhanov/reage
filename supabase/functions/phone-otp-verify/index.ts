import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizePhone } from "../_shared/smsaero.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_SALT = SERVICE_ROLE.slice(0, 32);

const MAX_ATTEMPTS = 5;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone: rawPhone, code: rawCode } = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(rawPhone || ""));
    const code = String(rawCode || "").trim();

    if (phone.length !== 11 || !/^\d{4}$/.test(code)) {
      return new Response(JSON.stringify({ ok: false, error: "Некорректные данные" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: row, error: selErr } = await admin
      .from("phone_otp_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) {
      console.error("[phone-otp-verify] select error", selErr.message);
      return new Response(JSON.stringify({ ok: false, error: "Ошибка сервера" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!row) {
      return new Response(
        JSON.stringify({ ok: false, error: "Код истёк или не найден. Запросите новый." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await admin
        .from("phone_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      return new Response(
        JSON.stringify({ ok: false, error: "Слишком много попыток. Запросите новый код." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expected = await sha256(`${code}:${phone}:${APP_SALT}`);
    if (expected !== row.code_hash) {
      await admin
        .from("phone_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return new Response(
        JSON.stringify({ ok: false, error: "Неверный код", attemptsLeft: MAX_ATTEMPTS - row.attempts - 1 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Consume
    await admin
      .from("phone_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // Find user
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: "Не удалось найти аккаунт. Обратитесь в поддержку." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate magic-link, return token_hash for client-side verifyOtp
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });

    if (linkErr || !linkData) {
      console.error("[phone-otp-verify] generateLink error", linkErr?.message);
      return new Response(JSON.stringify({ error: "Не удалось создать сессию" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenHash =
      (linkData as any)?.properties?.hashed_token ||
      (linkData as any)?.hashed_token;

    if (!tokenHash) {
      console.error("[phone-otp-verify] no hashed_token in response");
      return new Response(JSON.stringify({ error: "Не удалось создать сессию" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, email: profile.email, token_hash: tokenHash }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[phone-otp-verify] unexpected", e);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
