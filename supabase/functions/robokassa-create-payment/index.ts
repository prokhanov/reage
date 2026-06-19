// robokassa-create-payment: создаёт payment_orders (pending) и возвращает URL Робокассы.
// Тестовый/боевой режим переключается в админке (payment_gateway_settings.test_mode).

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
    const livePassword1 = Deno.env.get("ROBOKASSA_PASSWORD_1");
    const testPassword1 = Deno.env.get("ROBOKASSA_TEST_PASSWORD_1");

    if (!merchantLogin) {
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
    const { planId, pricingId, admin_test: adminTestRaw, promoCode } = body as {
      planId?: string;
      pricingId?: string;
      admin_test?: boolean;
      promoCode?: string;
    };
    if (!planId || !pricingId) {
      return json({ error: "Не указан plan/pricing" }, 400);
    }

    // admin_test разрешён только для superadmin
    let adminTest = false;
    if (adminTestRaw === true) {
      const { data: isSuper } = await userClient.rpc("has_role", {
        _user_id: userId,
        _role: "superadmin",
      });
      if (isSuper === true) {
        adminTest = true;
      } else {
        return json({ error: "admin_test разрешён только администраторам" }, 403);
      }
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Determine test/live mode from gateway settings
    const { data: gateway } = await admin
      .from("payment_gateway_settings")
      .select("test_mode")
      .eq("provider", "robokassa")
      .maybeSingle();
    const isTest = gateway?.test_mode !== false; // по умолчанию тест, если не настроено
    const password1 = isTest ? testPassword1 : livePassword1;

    if (!password1) {
      return json({
        error: isTest
          ? "Не настроен ROBOKASSA_TEST_PASSWORD_1"
          : "Не настроен ROBOKASSA_PASSWORD_1",
      }, 500);
    }

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

    // Применение промокода (если указан) — авторитетная серверная валидация
    let finalAmount = amount;
    let discountAmount = 0;
    let promoCodeId: string | null = null;
    if (promoCode && promoCode.trim()) {
      const { data: promoRes, error: promoErr } = await userClient.rpc("apply_promo_code", {
        p_code: promoCode.trim(),
        p_plan_id: planId,
        p_pricing_id: pricingId,
        p_amount: amount,
      });
      if (promoErr) {
        console.error("apply_promo_code error", promoErr);
        return json({ error: "Не удалось проверить промокод" }, 400);
      }
      const r = promoRes as any;
      if (!r?.success) {
        return json({ error: r?.error ?? "Промокод не применён" }, 400);
      }
      finalAmount = Number(r.final_amount);
      discountAmount = Number(r.discount_amount ?? 0);
      promoCodeId = r.promo_code_id as string;
    }

    if (finalAmount <= 0) {
      // Робокасса не принимает 0. Если 100% скидка — оформляем подписку без оплаты.
      // (на текущем этапе считаем такой кейс ошибкой — нужна явная логика активации)
      return json({ error: "Сумма к оплате не может быть нулевой" }, 400);
    }
    const outSum = finalAmount.toFixed(2);

    // Create pending order
    const { data: order, error: orderErr } = await admin
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: planId,
        pricing_id: pricingId,
        out_sum: finalAmount,
        original_amount: amount,
        discount_amount: discountAmount,
        promo_code_id: promoCodeId,
        status: "pending",
        is_test: isTest,
        admin_test: adminTest,
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
      Description: `ReAge: оплата подписки #${invId}${isTest ? " (TEST)" : ""}`,
      SignatureValue: signature,
      Culture: "ru",
      Encoding: "utf-8",
    });
    if (userEmail) params.set("Email", userEmail);
    if (isTest) params.set("IsTest", "1");

    const paymentUrl = `${ROBOKASSA_URL}?${params.toString()}`;

    return json({ url: paymentUrl, invId, isTest });
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
