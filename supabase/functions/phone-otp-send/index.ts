import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendSms, normalizePhone } from "../_shared/smsaero.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_SALT = SERVICE_ROLE.slice(0, 32);

const RESEND_COOLDOWN_SEC = 60;
const CODE_TTL_MIN = 5;
const MAX_PER_DAY = 10;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  // 4-digit code, 1000-9999
  return String(1000 + Math.floor(Math.random() * 9000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone: rawPhone } = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(rawPhone || ""));
    if (phone.length !== 11 || !phone.startsWith("7")) {
      return new Response(JSON.stringify({ ok: false, error: "Некорректный номер телефона" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (profErr) {
      console.error("[phone-otp-send] profile lookup error", profErr.message);
      return new Response(JSON.stringify({ ok: false, error: "Ошибка сервера" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ ok: false, error: "Пользователь с таким номером не найден. Проверьте введённый номер или попробуйте авторизоваться по email." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("phone_otp_codes")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", sinceDay)
      .order("created_at", { ascending: false });

    if (recent && recent.length >= MAX_PER_DAY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Превышен дневной лимит SMS. Попробуйте завтра." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (recent && recent.length > 0) {
      const lastMs = new Date(recent[0].created_at).getTime();
      const diffSec = Math.floor((Date.now() - lastMs) / 1000);
      if (diffSec < RESEND_COOLDOWN_SEC) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Подождите ${RESEND_COOLDOWN_SEC - diffSec} сек. до повторной отправки`,
            resendInSec: RESEND_COOLDOWN_SEC - diffSec,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3. Generate + persist
    const code = generateCode();
    const codeHash = await sha256(`${code}:${phone}:${APP_SALT}`);
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("phone_otp_codes").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("[phone-otp-send] insert error", insErr.message);
      return new Response(JSON.stringify({ error: "Не удалось сохранить код" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Send SMS
    const text = `Ваш код для входа в ReAge: ${code}. Никому не сообщайте.`;
    const sendRes = await sendSms({ phone, text });
    if (!sendRes.ok) {
      console.error("[phone-otp-send] sms send failed", sendRes.error);
      return new Response(
        JSON.stringify({ error: "Не удалось отправить SMS. Попробуйте позже." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, resendInSec: RESEND_COOLDOWN_SEC, ttlMin: CODE_TTL_MIN }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[phone-otp-send] unexpected", e);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
