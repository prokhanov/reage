// Handles "request callback" from an existing patient (no_answer status).
// Updates phone on profile (if changed) and sends a Telegram notification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

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

function normalizePhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "").replace(/^8/, "7");
  return digits.length === 11 ? `+${digits}` : "";
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

    const body = await req.json().catch(() => ({}));
    const rawPhone = String((body as any).phone ?? "").trim();
    const bookingId = (body as any).booking_id ? String((body as any).booking_id) : null;
    const normalized = normalizePhone(rawPhone);
    if (!normalized) return json({ error: "Некорректный номер телефона" }, 400);

    // Update phone on profile
    await admin
      .from("profiles")
      .update({ phone: normalized })
      .eq("id", user.id);

    // Load profile for the notification
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name, middle_name, name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      [profile?.last_name, profile?.first_name, profile?.middle_name]
        .filter(Boolean)
        .join(" ") ||
      profile?.name ||
      profile?.email ||
      "—";

    await admin.rpc("invoke_telegram_notify", {
      p_event_type: "callback_requested",
      p_payload: {
        user_id: user.id,
        booking_id: bookingId,
        name: fullName,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        middle_name: profile?.middle_name ?? null,
        email: profile?.email ?? null,
        phone: profile?.phone ?? normalized,
        requested_at: new Date().toISOString(),
      },
    });

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
