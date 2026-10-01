// energy-claim-session: одноразовый автовход в аккаунт, созданный автоматически после оплаты чекапа.
// Два способа: { invId, claimSecret } со страницы возврата (ключ из браузера оформления)
// или { loginToken } из письма. Вход выдаётся ТОЛЬКО для аккаунтов, созданных этим заказом.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256Hex(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CLAIM_TTL_MS = 24 * 3600 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const invId = Number(body?.invId);
    const claimSecret = typeof body?.claimSecret === "string" ? body.claimSecret : "";
    const loginToken = typeof body?.loginToken === "string" ? body.loginToken : "";
    if (claimSecret.length > 200 || loginToken.length > 200) return json({ error: "invalid" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const nowIso = new Date().toISOString();
    let orderId: string | null = null;
    let userId: string | null = null;

    if (loginToken.length >= 32) {
      const hash = await sha256Hex(loginToken);
      // Атомарно помечаем использование.
      const { data } = await admin.from("energy_orders")
        .update({ login_token_used_at: nowIso })
        .eq("login_token_hash", hash).is("login_token_used_at", null)
        .eq("account_created", true).eq("status", "paid").gt("login_token_expires_at", nowIso)
        .select("id, user_id").maybeSingle();
      if (!data) return json({ error: "expired" }, 410);
      orderId = data.id; userId = data.user_id;
    } else if (Number.isFinite(invId) && claimSecret.length >= 32) {
      const hash = await sha256Hex(claimSecret);
      const { data } = await admin.from("energy_orders")
        .update({ claim_used_at: nowIso })
        .eq("inv_id", invId).eq("claim_secret_hash", hash).is("claim_used_at", null)
        .eq("account_created", true).eq("status", "paid")
        .gt("paid_at", new Date(Date.now() - CLAIM_TTL_MS).toISOString())
        .select("id, user_id").maybeSingle();
      if (!data) return json({ error: "not_available" }, 409);
      orderId = data.id; userId = data.user_id;
    } else {
      return json({ error: "invalid" }, 400);
    }

    if (!userId) return json({ error: "not_available" }, 409);
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) return json({ error: "not_available" }, 409);
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = (link as any)?.properties?.hashed_token;
    if (error || !tokenHash) {
      console.error("generateLink failed", orderId, error?.message);
      return json({ error: "failed" }, 500);
    }
    return json({ tokenHash });
  } catch (e) {
    console.error("energy-claim-session", e);
    return json({ error: "failed" }, 500);
  }
});
