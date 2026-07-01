import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  token?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = (await req.json().catch(() => ({}))) as RequestBody;

    if (!token || typeof token !== "string") {
      return json({ ok: false, error: "missing_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: invite, error } = await supabase
      .from("invite_tokens")
      .select("id, invited_email, role, expires_at, used_by, metadata")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[validate-invite-token] db error", error);
      return json({ ok: false, error: "db_error" }, 500);
    }

    if (!invite) {
      return json({ ok: false, error: "not_found" }, 200);
    }

    if (invite.used_by) {
      return json({ ok: false, error: "used" }, 200);
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return json({ ok: false, error: "expired" }, 200);
    }

    let role_display_name = invite.role;
    if (invite.role) {
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("display_name")
        .eq("name", invite.role)
        .maybeSingle();
      if (roleData?.display_name) role_display_name = roleData.display_name;
    }

    return json({
      ok: true,
      invite: {
        id: invite.id,
        invited_email: invite.invited_email,
        role: invite.role,
        role_display_name,
        expires_at: invite.expires_at,
        metadata: invite.metadata ?? {},
      },
    }, 200);
  } catch (e) {
    console.error("[validate-invite-token] fatal", e);
    return json({ ok: false, error: "internal" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
