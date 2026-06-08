// Sends SMS reminder/notification for an analysis booking. Admin-authenticated.
// Template is chosen by `template_name` if provided, otherwise auto-mapped from booking.status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { normalizePhone, renderTemplate, sendSms } from "../_shared/smsaero.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_TO_TEMPLATE: Record<string, string> = {
  scheduled: "booking_scheduled",
  received: "booking_received",
  collected: "booking_collected",
  uploaded: "booking_uploaded",
};

const ALLOWED_TEMPLATES = new Set([
  "booking_scheduled",
  "booking_received",
  "booking_collected",
  "booking_uploaded",
  "appointment_reminder",
]);

const APP_URL = "https://reage.life";

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
    const { booking_id, phone_override, template_name: requestedTemplate } = body as {
      booking_id?: string;
      phone_override?: string;
      template_name?: string;
    };
    if (!booking_id) return json({ error: "booking_id is required" }, 400);

    const { data: booking, error: bErr } = await admin
      .from("analysis_bookings")
      .select("id, user_id, booking_date, booking_time, address, status")
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

    // Resolve template name: explicit > by status > legacy fallback.
    let templateName =
      (requestedTemplate && ALLOWED_TEMPLATES.has(requestedTemplate) && requestedTemplate) ||
      STATUS_TO_TEMPLATE[booking.status as string] ||
      "appointment_reminder";

    let { data: tpl } = await admin
      .from("sms_templates")
      .select("id, name, body_text")
      .eq("name", templateName)
      .maybeSingle();

    // Fallback to legacy template if status template not provisioned yet
    if (!tpl && templateName !== "appointment_reminder") {
      const { data: legacy } = await admin
        .from("sms_templates")
        .select("id, name, body_text")
        .eq("name", "appointment_reminder")
        .maybeSingle();
      tpl = legacy;
      templateName = "appointment_reminder";
    }
    if (!tpl) return json({ error: `Шаблон ${templateName} не найден` }, 404);

    const dateStr = new Date(booking.booking_date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const text = renderTemplate(tpl.body_text, {
      date: dateStr,
      time: (booking.booking_time || "").slice(0, 5),
      address: booking.address || "",
      name: profile?.name || "",
      url: `${APP_URL}/profile`,
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
      metadata: { booking_id, sent_by: user.id, template_name: tpl.name },
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
      metadata: { booking_id, sent_by: user.id, provider_status: result.status, template_name: tpl.name },
    });

    return json({
      success: result.ok,
      message: result.ok ? `SMS отправлено на ${normalized}` : `Ошибка: ${result.error}`,
      error: result.ok ? undefined : result.error,
      template_name: tpl.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
