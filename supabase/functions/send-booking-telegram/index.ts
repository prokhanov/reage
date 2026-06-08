// Sends Telegram admin notification about a booking change. Admin-authenticated.
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
    const { booking_id } = body as { booking_id?: string };
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

    // Invoke existing DB function which holds the internal secret and posts to telegram-notify.
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
      },
    });

    if (rpcErr) return json({ success: false, error: rpcErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
