// energy-create-payment: гостевой заказ чекапа ReAge Energy + оплата через Робокассу.
// verify_jwt = false — покупка доступна без регистрации.
// Result URL Робокассы (общий для проекта): https://api.reage.life/functions/v1/robokassa-result
// Домены не хардкодим: APP_URL берётся из окружения (prod/test различаются).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROBOKASSA_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

// Каталог бандлов — источник правды по цене на сервере.
const BUNDLES: Record<string, { title: string; price: number }> = {
  energy: { title: "ReAge Energy — чекап по энергии", price: 5990 },
  thyroid: { title: "ReAge Thyroid — чекап щитовидной железы", price: 3990 },
  iron: { title: "ReAge Iron — чекап на железодефицит", price: 5990 },
  "cardio-risk-40": { title: "ReAge CardioRisk 40+ — чекап сердца и сосудов", price: 7990 },
  metabolic: { title: "ReAge Metabolic — чекап обмена веществ", price: 6990 },
  liver: { title: "ReAge Liver & Fibrosis — чекап печени", price: 4990 },
  kidney: { title: "ReAge Kidney Risk — чекап почек", price: 4990 },
  "base-40": { title: "ReAge Base 40+ — базовый чекап", price: 7990 },
};

// Дополнительная услуга: онлайн-разбор результатов врачом.
const CONSULT_PRICE = 4900;
const CONSULT_TITLE = "Консультация врача — разбор результатов";

// Промокоды лендинга (процент скидки).
const PROMOS: Record<string, number> = { REAGE10: 0.1, ENERGY15: 0.15 };

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const merchantLogin = Deno.env.get("ROBOKASSA_MERCHANT_LOGIN");
    const livePassword1 = Deno.env.get("ROBOKASSA_PASSWORD_1");
    const testPassword1 = Deno.env.get("ROBOKASSA_TEST_PASSWORD_1");

    if (!merchantLogin) return json({ error: "Платёжный шлюз не настроен" }, 500);

    const body = await req.json().catch(() => ({}));
    const {
      bundle = "energy",
      email,
      phone,
      promoCode,
      clinic,
    } = body as {
      bundle?: string;
      email?: string;
      phone?: string;
      promoCode?: string;
      clinic?: { id?: string; title?: string; address?: string } | null;
    };

    const product = BUNDLES[bundle];
    if (!product) return json({ error: "Неизвестный набор анализов" }, 400);

    const emailClean = (email ?? "").trim().toLowerCase();
    const phoneClean = (phone ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return json({ error: "Укажите корректный email" }, 400);
    }
    if (phoneClean.replace(/\D/g, "").length < 10) {
      return json({ error: "Укажите корректный телефон" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: gateway } = await admin
      .from("payment_gateway_settings")
      .select("test_mode")
      .eq("provider", "robokassa")
      .maybeSingle();
    const isTest = gateway?.test_mode !== false;
    const password1 = isTest ? testPassword1 : livePassword1;
    if (!password1) {
      return json({
        error: isTest ? "Не настроен ROBOKASSA_TEST_PASSWORD_1" : "Не настроен ROBOKASSA_PASSWORD_1",
      }, 500);
    }

    const original = product.price;
    const code = (promoCode ?? "").trim().toUpperCase();
    const rate = code ? PROMOS[code] : undefined;
    if (code && !rate) return json({ error: "Промокод не найден" }, 400);
    const discount = rate ? Math.round(original * rate) : 0;
    const finalAmount = original - discount;
    if (finalAmount <= 0) return json({ error: "Сумма к оплате не может быть нулевой" }, 400);
    const outSum = finalAmount.toFixed(2);

    // Пользователь может быть авторизован — тогда привяжем заказ к аккаунту.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (jwt && jwt !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await admin.auth.getUser(jwt);
      userId = data.user?.id ?? null;
    }

    const { data: order, error: orderErr } = await admin
      .from("energy_orders")
      .insert({
        user_id: userId,
        bundle,
        email: emailClean,
        phone: phoneClean,
        clinic_id: clinic?.id ?? null,
        clinic_title: clinic?.title ?? null,
        clinic_address: clinic?.address ?? null,
        original_amount: original,
        discount_amount: discount,
        out_sum: finalAmount,
        promo_code: code || null,
        status: "pending",
        is_test: isTest,
      })
      .select("inv_id")
      .single();

    if (orderErr || !order) {
      console.error("energy_orders insert failed", orderErr);
      return json({ error: "Не удалось создать заказ" }, 500);
    }

    const invId = Number(order.inv_id);

    const receipt = {
      sno: "usn_income_outcome",
      items: [
        {
          name: product.title.slice(0, 128),
          quantity: 1,
          sum: Number(finalAmount.toFixed(2)),
          payment_method: "full_payment",
          payment_object: "service",
          tax: "none",
        },
      ],
    };
    const receiptEncoded = encodeURIComponent(JSON.stringify(receipt));

    const signature = md5(
      [merchantLogin, outSum, String(invId), receiptEncoded, password1].join(":"),
    );

    const baseParams: Record<string, string> = {
      MerchantLogin: merchantLogin,
      OutSum: outSum,
      InvId: String(invId),
      Description: `ReAge Energy: заказ #${invId}${isTest ? " (TEST)" : ""}`,
      SignatureValue: signature,
      Culture: "ru",
      Encoding: "utf-8",
      Email: emailClean,
    };
    if (isTest) baseParams.IsTest = "1";

    const query = Object.entries(baseParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .concat(`Receipt=${encodeURIComponent(receiptEncoded)}`)
      .join("&");

    return json({ url: `${ROBOKASSA_URL}?${query}`, invId, isTest });
  } catch (e) {
    console.error("energy-create-payment error", e);
    return json({ error: "Внутренняя ошибка" }, 500);
  }
});
