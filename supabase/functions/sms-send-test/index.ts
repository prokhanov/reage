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
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin");
    if (!roles || roles.length === 0) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { template_id, phone, variables } = body as {
      template_id?: string;
      phone?: string;
      variables?: Record<string, string>;
    };

    if (!template_id || !phone) {
      return json({ error: "template_id и phone обязательны" }, 400);
    }
    const normalized = normalizePhone(phone);
    if (normalized.length < 11) {
      return json({ error: "Некорректный номер телефона" }, 400);
    }

    const { data: tpl, error: tplErr } = await admin
      .from("sms_templates")
      .select("id, name, body_text, variables")
      .eq("id", template_id)
      .maybeSingle();
    if (tplErr || !tpl) return json({ error: "Шаблон не найден" }, 404);

    const { data: sender } = await admin
      .from("sms_sender_settings")
      .select("sender_sign")
      .limit(1)
      .maybeSingle();

    const text = renderTemplate(tpl.body_text, variables ?? {});
    const messageId = `sms-test-${crypto.randomUUID()}`;

    // Pending log
    await admin.from("sms_send_log").insert({
      message_id: messageId,
      template_name: tpl.name,
      recipient_phone: normalized,
      body_text: text,
      status: "pending",
      provider: "smsaero",
      metadata: { is_test: true, sent_by: user.id },
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
      metadata: { is_test: true, sent_by: user.id, provider_status: result.status },
    });

    return json({
      success: result.ok,
      message: result.ok
        ? `Тестовое SMS отправлено на ${normalized}`
        : `Ошибка отправки: ${result.error}`,
      provider_message_id: result.providerMessageId,
      error: result.ok ? undefined : result.error,
      raw: result.raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 200);
  }
});
