// robokassa-create-payment: создаёт payment_orders (pending) и возвращает URL Робокассы.
// Требует JWT — определяется в коде через supabase.auth.getUser().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROBOKASSA_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/** Подпись для создания платежа.
 *  Без shp_*: md5(MerchantLogin:OutSum:InvId:Password1)
 *  С shp_*:   md5(MerchantLogin:OutSum:InvId:Password1:shp_a=...:shp_b=...) — алфавитный порядок ключей.
 */
function buildCreateSignature(
  login: string,
  outSum: string,
  invId: number,
  password1: string,
  shp: Record<string, string> = {},
): string {
  const keys = Object.keys(shp).sort();
  const shpStr = keys.map((k) => `${k}=${shp[k]}`).join(":");
  const base = [login, outSum, String(invId), password1, shpStr]
    .filter(Boolean)
    .join(":");
  return md5(base);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const merchantLogin = Deno.env.get("ROBOKASSA_MERCHANT_LOGIN");
    const password1 = Deno.env.get("ROBOKASSA_PASSWORD_1");

    if (!merchantLogin || !password1) {
      return json({ error: "Платёжный шлюз не настроен" }, 500);
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Требуется авторизация" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Требуется авторизация" }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = await req.json().catch(() => ({}));
    const { planId, pricingId } = body as { planId?: string; pricingId?: string };
    if (!planId || !pricingId) {
      return json({ error: "Не указан plan/pricing" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch pricing to ensure trusted amount
    const { data: pricing, error: priceErr } = await admin
      .from("subscription_pricing")
      .select("id, amount, period, duration_months, plan_id")
      .eq("id", pricingId)
      .maybeSingle();
    if (priceErr || !pricing) {
      return json({ error: "Тариф не найден" }, 404);
    }
    if (pricing.plan_id !== planId) {
      return json({ error: "Несоответствие plan/pricing" }, 400);
    }

    const amount = Number(pricing.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Некорректная сумма" }, 400);
    }
    const outSum = amount.toFixed(2);

    // Create pending order (inv_id from sequence default)
    const { data: order, error: orderErr } = await admin
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: planId,
        pricing_id: pricingId,
        out_sum: amount,
        status: "pending",
      })
      .select("inv_id")
      .single();
    if (orderErr || !order) {
      console.error("payment_orders insert failed", orderErr);
      return json({ error: "Не удалось создать заказ" }, 500);
    }

    const invId = Number(order.inv_id);
    const signature = buildCreateSignature(merchantLogin, outSum, invId, password1);

    const params = new URLSearchParams({
      MerchantLogin: merchantLogin,
      OutSum: outSum,
      InvId: String(invId),
      Description: `ReAge: оплата подписки #${invId}`,
      SignatureValue: signature,
      Culture: "ru",
      Encoding: "utf-8",
    });
    if (userEmail) params.set("Email", userEmail);

    const paymentUrl = `${ROBOKASSA_URL}?${params.toString()}`;

    return json({ url: paymentUrl, invId });
  } catch (e) {
    console.error("robokassa-create-payment error", e);
    return json({ error: "Внутренняя ошибка" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
