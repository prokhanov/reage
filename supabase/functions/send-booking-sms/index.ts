// Sends SMS reminder for an analysis booking. Admin-authenticated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { normalizePhone, renderTemplate, sendSms } from "../_shared/smsaero.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: perm } = await admin.rpc("has_admin_permission", {
      _user_id: user.id,
      _module: "patients",
    });
    if (!perm) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { booking_id, phone_override } = body as { booking_id?: string; phone_override?: string };
    if (!booking_id) return json({ error: "booking_id is required" }, 400);

    const { data: booking, error: bErr } = await admin
      .from("analysis_bookings")
      .select("id, user_id, booking_date, booking_time, address")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    const { data: profile } = await admin
      .from("profiles")
      .select("phone, name")
      .eq("id", booking.user_id)
      .maybeSingle();

    const phoneSource = (phone_override && phone_override.trim()) || profile?.phone || "";
    if (!phoneSource) return json({ error: "У пациента не указан телефон" }, 400);

    const normalized = normalizePhone(phoneSource);
    if (normalized.length < 11) return json({ error: "Некорректный номер телефона" }, 400);

    const { data: tpl } = await admin
      .from("sms_templates")
      .select("id, name, body_text")
      .eq("name", "appointment_reminder")
      .maybeSingle();
    if (!tpl) return json({ error: "Шаблон appointment_reminder не найден" }, 404);

    const dateStr = new Date(booking.booking_date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const text = renderTemplate(tpl.body_text, {
      date: dateStr,
      time: (booking.booking_time || "").slice(0, 5),
      address: booking.address || "",
      name: profile.name || "",
    });

    const { data: sender } = await admin
      .from("sms_sender_settings")
      .select("sender_sign")
      .limit(1)
      .maybeSingle();

    const messageId = `booking-${booking_id}-${Date.now()}`;

    await admin.from("sms_send_log").insert({
      message_id: messageId,
      template_name: tpl.name,
      recipient_phone: normalized,
      body_text: text,
      status: "pending",
      provider: "smsaero",
      metadata: { booking_id, sent_by: user.id },
    });

    const result = await sendSms({
      phone: normalized,
      text,
      sign: sender?.sender_sign || undefined,
    });

    await admin.from("sms_send_log").insert({
      message_id: messageId,
      template_name: tpl.name,
      recipient_phone: normalized,
      body_text: text,
      status: result.ok ? "sent" : "failed",
      provider: "smsaero",
      provider_message_id: result.providerMessageId,
      error_message: result.ok ? null : (result.error ?? "Unknown error"),
      metadata: { booking_id, sent_by: user.id, provider_status: result.status },
    });

    return json({
      success: result.ok,
      message: result.ok ? `SMS отправлено на ${normalized}` : `Ошибка: ${result.error}`,
      error: result.ok ? undefined : result.error,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
