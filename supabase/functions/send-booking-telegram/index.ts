// Sends Telegram admin notification about a booking. Admin-authenticated.
// Uses a status-specific template when available, otherwise falls back to the legacy formatted message.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

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
]);

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
    const { booking_id, template_key: requestedKey } = body as {
      booking_id?: string;
      template_key?: string;
    };
    if (!booking_id) return json({ error: "booking_id is required" }, 400);

    const { data: booking } = await admin
      .from("analysis_bookings")
      .select("id, user_id, booking_date, booking_time, address, status, assigned_staff_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (!booking) return json({ error: "Booking not found" }, 404);

    const { data: profile } = await admin
      .from("profiles")
      .select("name, email, phone")
      .eq("id", booking.user_id)
      .maybeSingle();

    const templateKey =
      (requestedKey && ALLOWED_TEMPLATES.has(requestedKey) && requestedKey) ||
      STATUS_TO_TEMPLATE[String(booking.status)] ||
      null;

    const { error: rpcErr } = await admin.rpc("invoke_telegram_notify", {
      p_event_type: "booking_status_changed",
      p_payload: {
        booking_id: booking.id,
        user_id: booking.user_id,
        name: profile?.name ?? "—",
        email: profile?.email ?? "—",
        phone: profile?.phone ?? "—",
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        address: booking.address,
        status: booking.status,
        triggered_by: user.id,
        template_key: templateKey,
      },
    });

    if (rpcErr) return json({ success: false, error: rpcErr.message }, 500);

    return json({ success: true, template_key: templateKey });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
