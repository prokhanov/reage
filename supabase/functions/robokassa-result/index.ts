// robokassa-result: серверный callback от Робокассы.
// Поддерживает тестовый и боевой режим (определяется по параметру IsTest или is_test заказа).
// Тестовые платежи НЕ активируют подписку.
//
// ВАЖНО: Result URL в кабинете Робокассы должен указывать на Fly reverse-proxy:
//   https://api.reage.life/functions/v1/robokassa-result   (метод POST, MD5)
// НЕ использовать прямой URL Supabase (ilxgodhosirhhkffqryw.supabase.co) —
// весь внешний трафик идёт через api.reage.life (Fly → Supabase).
//
// verify_jwt = false (см. supabase/config.toml) — Робокасса не присылает
// пользовательский JWT, аутентификация callback'а основана на MD5-подписи
// с ROBOKASSA_PASSWORD_2 / ROBOKASSA_TEST_PASSWORD_2.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function buildResultSignature(
  outSum: string,
  invId: number,
  password2: string,
  shp: Record<string, string>,
): string {
  const keys = Object.keys(shp).sort();
  const shpStr = keys.map((k) => `${k}=${shp[k]}`).join(":");
  const base = [outSum, String(invId), password2, shpStr]
    .filter(Boolean)
    .join(":");
  return md5(base);
}

function textPlain(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const livePassword2 = Deno.env.get("ROBOKASSA_PASSWORD_2");
  const testPassword2 = Deno.env.get("ROBOKASSA_TEST_PASSWORD_2");

  const admin = createClient(supabaseUrl, serviceKey);

  let params: URLSearchParams;
  let rawBody = "";
  try {
    if (req.method === "POST") {
      rawBody = await req.text();
      params = new URLSearchParams(rawBody);
    } else {
      params = new URL(req.url).searchParams;
      rawBody = params.toString();
    }
  } catch (e) {
    await admin.from("payment_callback_log").insert({
      signature_valid: false,
      error: `parse failed: ${(e as Error).message}`,
      raw_body: { raw: rawBody },
      headers: collectHeaders(req),
    });
    return textPlain("bad request", 400);
  }

  const all: Record<string, string> = {};
  params.forEach((v, k) => {
    all[k] = v;
  });

  const outSum = params.get("OutSum") ?? "";
  const invIdStr = params.get("InvId") ?? "";
  const signature = (params.get("SignatureValue") ?? "").toLowerCase();
  const invId = Number(invIdStr);
  const isTestParam = params.get("IsTest") === "1";

  const shp: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith("shp_") || k.startsWith("Shp_") || k.startsWith("SHP_")) {
      shp[k.toLowerCase()] = v;
    }
  }

  const logBase = {
    inv_id: Number.isFinite(invId) ? invId : null,
    raw_body: all,
    headers: collectHeaders(req),
  };

  if (!outSum || !Number.isFinite(invId) || !signature) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: false,
      error: "missing OutSum/InvId/SignatureValue",
    });
    return textPlain("bad request", 400);
  }

  // Сначала находим заказ — он несёт is_test/admin_test, по нему выбираем пароль
  const { data: order, error: orderErr } = await admin
    .from("payment_orders")
    .select("id, user_id, plan_id, pricing_id, out_sum, status, is_test, admin_test")
    .eq("inv_id", invId)
    .maybeSingle();

  if (orderErr || !order) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: false,
      error: `order not found for inv_id=${invId}`,
    });
    return textPlain("order not found", 404);
  }

  const isTest = order.is_test === true || isTestParam;
  const isAdminTest = order.admin_test === true;
  const password2 = isTest ? testPassword2 : livePassword2;

  if (!password2) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: false,
      error: isTest
        ? "ROBOKASSA_TEST_PASSWORD_2 not configured"
        : "ROBOKASSA_PASSWORD_2 not configured",
    });
    return textPlain("server misconfigured", 500);
  }

  const expected = buildResultSignature(outSum, invId, password2, shp).toLowerCase();
  const valid = expected === signature;

  if (!valid) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: false,
      error: `signature mismatch (mode=${isTest ? "test" : "live"}) expected=${expected} got=${signature}`,
    });
    return textPlain("bad sign", 400);
  }

  // Идемпотентность
  if (order.status === "paid") {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: `already paid (idempotent)`,
    });
    return textPlain(`OK${invId}`);
  }

  const paidAmount = Number(outSum);
  if (Math.abs(paidAmount - Number(order.out_sum)) > 0.01) {
    await admin.from("payment_orders").update({
      status: "failed",
      paid_amount: paidAmount,
      robokassa_signature: signature,
      raw_callback: all,
    }).eq("inv_id", invId);

    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: `amount mismatch expected=${order.out_sum} got=${paidAmount}`,
    });
    return textPlain("amount mismatch", 400);
  }

  // Помечаем заказ оплаченным (и для боевых, и для тестов шлюза, и для админских тестов)
  const { error: orderUpdErr } = await admin
    .from("payment_orders")
    .update({
      status: "paid",
      paid_amount: paidAmount,
      robokassa_signature: signature,
      raw_callback: all,
      paid_at: new Date().toISOString(),
    })
    .eq("inv_id", invId);

  if (orderUpdErr) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: `order update failed: ${orderUpdErr.message}`,
    });
    return textPlain("db error", 500);
  }

  // Админский тест: подписку не создаём, активные не трогаем
  if (isAdminTest) {
    console.log(`admin test: subscription NOT activated for inv_id=${invId}`);
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: null,
    });
    return textPlain(`OK${invId}`);
  }

  // Обычная оплата (включая test-режим шлюза) — активируем подписку
  let endDate: string | null = null;
  let planType = "annual";
  if (order.pricing_id) {
    const { data: pr } = await admin
      .from("subscription_pricing")
      .select("period, duration_months")
      .eq("id", order.pricing_id)
      .maybeSingle();
    if (pr) {
      planType = pr.period ?? "annual";
      const months = Number(pr.duration_months) || 12;
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      endDate = d.toISOString();
    }
  }
  const startDate = new Date().toISOString();

  const { error: updErr } = await admin
    .from("payment_orders")
    .update({
      status: "paid",
      paid_amount: paidAmount,
      robokassa_signature: signature,
      raw_callback: all,
      paid_at: new Date().toISOString(),
    })
    .eq("inv_id", invId);

  if (updErr) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: `order update failed: ${updErr.message}`,
    });
    return textPlain("db error", 500);
  }

  await admin
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", order.user_id)
    .eq("status", "active");

  const { error: subErr } = await admin.from("subscriptions").insert({
    user_id: order.user_id,
    plan_id: order.plan_id,
    pricing_id: order.pricing_id,
    plan_type: planType,
    amount: order.out_sum,
    status: "active",
    start_date: startDate,
    end_date: endDate,
    payment_method: "robokassa",
  });

  if (subErr) {
    await admin.from("payment_callback_log").insert({
      ...logBase,
      signature_valid: true,
      error: `subscription insert failed: ${subErr.message}`,
    });
    return textPlain("db error", 500);
  }

  await admin.from("payment_callback_log").insert({
    ...logBase,
    signature_valid: true,
    error: null,
  });

  return textPlain(`OK${invId}`);
});

function collectHeaders(req: Request): Record<string, string> {
  const h: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    h[k] = v;
  });
  return h;
}
