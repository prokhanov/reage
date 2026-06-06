import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendSms } from "../_shared/smsaero.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_SALT = SERVICE_ROLE.slice(0, 32);

const RESEND_COOLDOWN_SEC = 60;
const CODE_TTL_MIN = 5;
const MAX_PER_DAY = 10;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
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
    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "Не авторизован" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ ok: false, error: "Не авторизован" }, 401);
    const userId = userRes.user.id;

    const { phone: rawPhone } = await req.json().catch(() => ({}));
    const phone = normalizeIntl(String(rawPhone || ""));
    if (phone.length < 10 || phone.length > 15) {
      return json({ ok: false, error: "Некорректный номер телефона" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check phone not taken by other user
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing && existing.id !== userId) {
      return json({ ok: false, error: "Номер уже занят другим пользователем" });
    }

    // Rate limits — by user+phone+purpose
    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("phone_otp_codes")
      .select("created_at")
      .eq("user_id", userId)
      .eq("purpose", "change")
      .gte("created_at", sinceDay)
      .order("created_at", { ascending: false });

    if (recent && recent.length >= MAX_PER_DAY) {
      return json({ ok: false, error: "Превышен дневной лимит SMS. Попробуйте завтра." });
    }
    if (recent && recent.length > 0) {
      const lastMs = new Date(recent[0].created_at).getTime();
      const diffSec = Math.floor((Date.now() - lastMs) / 1000);
      if (diffSec < RESEND_COOLDOWN_SEC) {
        return json({
          ok: false,
          error: `Подождите ${RESEND_COOLDOWN_SEC - diffSec} сек. до повторной отправки`,
          resendInSec: RESEND_COOLDOWN_SEC - diffSec,
        });
      }
    }

    const code = generateCode();
    const codeHash = await sha256(`${code}:${phone}:${APP_SALT}`);
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("phone_otp_codes").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      purpose: "change",
      user_id: userId,
    });
    if (insErr) {
      console.error("[phone-change-send] insert error", insErr.message);
      return json({ ok: false, error: "Не удалось сохранить код" }, 500);
    }

    const text = `Ваш код подтверждения номера в ReAge: ${code}. Никому не сообщайте.`;
    const messageId = `phone-change-${crypto.randomUUID()}`;

    await admin.from("sms_send_log").insert({
      message_id: messageId,
      template_name: "phone_change_otp",
      recipient_phone: phone,
      body_text: text,
      status: "pending",
      provider: "smsaero",
      metadata: { user_id: userId, purpose: "change" },
    });

    const sendRes = await sendSms({ phone, text });

    await admin.from("sms_send_log").insert({
      message_id: messageId,
      template_name: "phone_change_otp",
      recipient_phone: phone,
      body_text: text,
      status: sendRes.ok ? "sent" : "failed",
      provider: "smsaero",
      provider_message_id: sendRes.providerMessageId,
      error_message: sendRes.ok ? null : (sendRes.error ?? "Unknown error"),
      metadata: { user_id: userId, purpose: "change", provider_status: sendRes.status },
    });

    if (!sendRes.ok) {
      console.error("[phone-change-send] sms send failed", sendRes.error);
      return json({ ok: false, error: "Не удалось отправить SMS. Попробуйте позже." }, 502);
    }

    return json({ ok: true, resendInSec: RESEND_COOLDOWN_SEC, ttlMin: CODE_TTL_MIN });
  } catch (e) {
    console.error("[phone-change-send] unexpected", e);
    return json({ ok: false, error: "Внутренняя ошибка" }, 500);
  }
});
