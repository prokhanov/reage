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
  "cardio-risk": { title: "ReAge Сердце и сосуды — чекап сердца и сосудов", price: 7990 },
  "cardio-risk-40": { title: "ReAge Сердце и сосуды — чекап сердца и сосудов", price: 7990 },
  metabolic: { title: "ReAge Metabolic — чекап обмена веществ", price: 6990 },
  liver: { title: "ReAge Liver & Fibrosis — чекап печени", price: 4990 },
  kidney: { title: "ReAge Kidney Risk — чекап почек", price: 4990 },
  base: { title: "ReAge Базовый — базовый чекап", price: 7990 },
  "base-40": { title: "ReAge Базовый — базовый чекап", price: 7990 },
  vitamins: { title: "ReAge Витамины и минералы — чекап", price: 5990 },
  "female-hormones": { title: "ReAge Женские гормоны — чекап", price: 3990 },
  "male-hormones": { title: "ReAge Мужские гормоны — чекап", price: 4490 },
  hair: { title: "ReAge Волосы — чекап при выпадении волос", price: 5990 },
  full: { title: "Полный чекап ReAge — 83 показателя", price: 23990 },
};

// Дополнительная услуга: онлайн-разбор результатов врачом.
const CONSULT_PRICE_FALLBACK = 2990;
const CONSULT_TITLE = "Консультация врача — разбор результатов";

// Дополнительная услуга: выезд медсестры на дом. Скидки на неё не действуют.
const HOME_VISIT_PRICE = 2990;
const HOME_VISIT_TITLE = "Выезд медсестры на дом";

// Промокоды лендинга (процент скидки).

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
      bundles,
      email,
      phone,
      promoCode,
      clinic,
      consultation,
      lastName,
      firstName,
      middleName,
      birthDate,
      ymClientId,
      locationType = "clinic",
      homeAddress,
      upsellOrderId,
      consultationOnly,
    } = body as {
      ymClientId?: string | null;
      bundle?: string;
      bundles?: string[];
      email?: string;
      phone?: string;
      promoCode?: string;
      clinic?: { id?: string; title?: string; address?: string } | null;
      consultation?: boolean;
      lastName?: string;
      firstName?: string;
      middleName?: string;
      birthDate?: string;
      locationType?: "clinic" | "home";
      homeAddress?: string | null;
      upsellOrderId?: string | null;
      consultationOnly?: boolean;
    };

    // Корзина может содержать несколько чекапов; старый формат с одним bundle поддерживаем.
    const bundleList = consultationOnly === true ? [] : Array.isArray(bundles) && bundles.length > 0 ? bundles : [bundle];
    const uniqueBundles = [...new Set(bundleList.map((b) => String(b)))];
    // Варианты чекапов (например, «Полный · Расширенный») создаются в админке —
    // название собираем из родительского чекапа и подписи варианта.
    const unknown = uniqueBundles.filter((b) => !BUNDLES[b]);
    const variantProducts: Record<string, { title: string; price: number }> = {};
    if (unknown.length > 0) {
      const adminEarly = createClient(supabaseUrl, serviceKey);
      const { data: vrows } = await adminEarly
        .from("checkup_variants")
        .select("slug, parent_slug, label")
        .in("slug", unknown);
      for (const v of vrows ?? []) {
        const parent = BUNDLES[v.parent_slug as string];
        if (!parent) continue;
        variantProducts[v.slug as string] = {
          title: `${parent.title.split(" — ")[0]} — ${v.label}`,
          price: parent.price,
        };
      }
    }
    const products = uniqueBundles.map((b) => BUNDLES[b] ?? variantProducts[b]);
    if (products.some((p) => !p)) return json({ error: "Неизвестный набор анализов" }, 400);
    const items = (products as { title: string; price: number }[]).map((p) => ({ ...p }));

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const admin = createClient(supabaseUrl, serviceKey);
    let userId: string | null = null;
    if (jwt && jwt !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data, error } = await admin.auth.getUser(jwt);
      if (error) return json({ error: "Сессия недействительна" }, 401);
      userId = data.user?.id ?? null;
    }
    let sourceOrder: any = null;
    if (upsellOrderId && userId) {
      const { data } = await admin.from("energy_orders").select("*").eq("id", upsellOrderId).eq("user_id", userId).eq("status", "paid").maybeSingle();
      sourceOrder = data;
    }
    // Для вошедшего покупателя ФИО, телефон и email берём из профиля (в корзине они заблокированы).
    let prof: any = null;
    if (userId) {
      const { data } = await admin.from("profiles").select("first_name, last_name, middle_name, phone, email").eq("id", userId).maybeSingle();
      prof = data;
    }
    const pv = (k: string) => { const v = String(prof?.[k] ?? "").trim(); return v || undefined; };
    const emailClean = (pv("email") ?? email ?? sourceOrder?.email ?? "").trim().toLowerCase();
    const phoneClean = (pv("phone") ?? phone ?? sourceOrder?.phone ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return json({ error: "Укажите корректный email" }, 400);
    }
    if (phoneClean.replace(/\D/g, "").length < 10) {
      return json({ error: "Укажите корректный телефон" }, 400);
    }
    const resolvedLocationType = sourceOrder ? (/дом|выезд/i.test(String(sourceOrder.clinic_title ?? "")) ? "home" : "clinic") : locationType;
    const isHome = resolvedLocationType === "home";
    const homeAddressClean = (homeAddress ?? sourceOrder?.clinic_address ?? "").trim().slice(0, 300);
    if (isHome && homeAddressClean.length < 5) {
      return json({ error: "Укажите адрес выезда медсестры" }, 400);
    }
    if (!isHome && (!sourceOrder && (!clinic || !(clinic.title ?? "").trim()))) {
      return json({ error: "Выберите клинику для сдачи анализов" }, 400);
    }

    const lastNameClean = (pv("last_name") ?? lastName ?? sourceOrder?.last_name ?? "").trim().slice(0, 100);
    const firstNameClean = (pv("first_name") ?? firstName ?? sourceOrder?.first_name ?? "").trim().slice(0, 100);
    const middleNameClean = (pv("middle_name") ?? middleName ?? sourceOrder?.middle_name ?? "").trim().slice(0, 100);
    const birthDateClean = (birthDate ?? sourceOrder?.birth_date ?? "").trim();
    if (lastNameClean.length < 2 || firstNameClean.length < 2) {
      return json({ error: "Укажите фамилию и имя" }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateClean) || isNaN(Date.parse(birthDateClean))) {
      return json({ error: "Укажите дату рождения" }, 400);
    }

    // Вошедшему покупателю дописываем в профиль только те поля, которых там ещё нет
    // (например отчество или дату рождения, введённые в корзине). Заполненные поля не трогаем.
    if (userId && prof) {
      const patch: Record<string, string> = {};
      if (!pv("first_name") && firstNameClean) patch.first_name = firstNameClean;
      if (!pv("last_name") && lastNameClean) patch.last_name = lastNameClean;
      if (!pv("middle_name") && middleNameClean) patch.middle_name = middleNameClean;
      if (!String(prof.birth_date ?? "").trim() && birthDateClean) patch.birth_date = birthDateClean;
      if (!pv("phone") && phoneClean) patch.phone = phoneClean;
      if (Object.keys(patch).length > 0) {
        await admin.from("profiles").update(patch).eq("id", userId);
      }
    }

    // Цены администрируются в разделе «Чекапы» админки; каталог в коде — запасной вариант.
    const PRICE_ALIASES: Record<string, string> = {
      "cardio-risk-40": "cardio-risk",
      "base-40": "base",
    };
    const { data: priceRows } = await admin
      .from("checkup_settings")
      .select("slug, price, cbc_bonus_enabled");
    const priceMap = new Map((priceRows ?? []).map((r) => [r.slug as string, r.price as number]));
    const cbcBonusSlugs = new Set(
      (priceRows ?? [])
        .filter((r) => r.cbc_bonus_enabled === true)
        .map((r) => r.slug as string),
    );
    uniqueBundles.forEach((b, i) => {
      const slug = PRICE_ALIASES[b] ?? b;
      const override = priceMap.get(slug);
      if (typeof override === "number") items[i].price = override;
    });
    const bonusItems = uniqueBundles
      .map((b) => PRICE_ALIASES[b] ?? b)
      .filter((slug) => cbcBonusSlugs.has(slug));
    const itemsSum = items.reduce((sum, p) => sum + p.price, 0);

    const { data: doctorRow } = await admin
      .from("checkup_doctor_settings")
      .select("consultation_price")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const CONSULT_PRICE = doctorRow?.consultation_price ?? CONSULT_PRICE_FALLBACK;

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

    let validUpsellOrderId: string | null = null;
    if (upsellOrderId) {
      if (!userId) return json({ error: "Войдите в кабинет для получения скидки" }, 401);
      if (!sourceOrder) return json({ error: "Скидка для этого заказа недоступна" }, 400);
      const { data: sourceRecords } = await admin
        .from("one_time_checkups")
        .select("checkup_slug, status")
        .eq("order_id", sourceOrder.id);
      if ((sourceRecords ?? []).some((record) => ["collected", "report_pending", "report_ready"].includes(record.status))) {
        return json({ error: "Скидка действует только до сдачи анализов" }, 400);
      }
      if (uniqueBundles.some((slug) => (sourceRecords ?? []).some((record) => record.checkup_slug === slug))) {
        return json({ error: "Этот чекап уже есть в заказе" }, 400);
      }
      if (consultation === true && sourceOrder.consultation_purchased === true) return json({ error: "Консультация уже оплачена" }, 400);
      validUpsellOrderId = sourceOrder.id;
    }

    const code = (promoCode ?? "").trim().toUpperCase();
    // Партнёр клиента: аккаунт → телефон/email → код. Промокоды не складываются.
    const { data: partnerRes } = await admin.rpc("resolve_partner", {
      p_user_id: userId, p_phone: phoneClean, p_email: emailClean, p_code: code || null,
    });
    const partner = partnerRes as { partner_id: string; discount_pct: number; hide_consultation: boolean; code: string | null } | null;

    const withConsult = consultation === true && !partner?.hide_consultation;
    if (consultationOnly === true && !withConsult) return json({ error: "Выберите консультацию" }, 400);
    const consultAmount = withConsult ? CONSULT_PRICE : 0;
    const homeFee = isHome && !sourceOrder ? HOME_VISIT_PRICE : 0;
    const original = itemsSum + consultAmount + homeFee;
    // Скидка применяется только к набору анализов, не к консультации.
    let discount = 0;
    let appliedCode: string | null = null;
    let partnerCommission: number | null = null;
    if (validUpsellOrderId) {
      discount = Math.round(itemsSum * 0.15);
    } else if (partner) {
      discount = Math.round((itemsSum * partner.discount_pct) / 100);
      partnerCommission = Math.round((itemsSum * (20 - partner.discount_pct)) / 100);
      appliedCode = partner.code ?? (code || null);
    } else if (code) {
      const { data: promoRes } = await admin.rpc("checkup_promo_preview", {
        p_code: code, p_phone: null, p_email: emailClean,
      });
      const r = promoRes as { success: boolean; error?: string; discount_type?: string; discount_value?: number; code?: string } | null;
      if (!r?.success) return json({ error: r?.error ?? "Промокод не найден" }, 400);
      discount = r.discount_type === "fixed"
        ? Math.min(Number(r.discount_value), itemsSum)
        : Math.round((itemsSum * Number(r.discount_value)) / 100);
      appliedCode = r.code ?? code;
    }
    const finalAmount = original - discount;
    if (finalAmount <= 0) return json({ error: "Сумма к оплате не может быть нулевой" }, 400);
    const outSum = finalAmount.toFixed(2);

    // Секрет для одноразового автовхода после оплаты (только для гостей).
    const claimSecret = userId ? null : crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const claimSecretHash = claimSecret
      ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(claimSecret))))
          .map((b) => b.toString(16).padStart(2, "0")).join("")
      : null;

    const { data: order, error: orderErr } = await admin
      .from("energy_orders")
      .insert({
        claim_secret_hash: claimSecretHash,
        user_id: userId,
        bundle: uniqueBundles[0] ?? "consultation",
        bundles: uniqueBundles,
        email: emailClean,
        phone: phoneClean,
        last_name: lastNameClean,
        first_name: firstNameClean,
        middle_name: middleNameClean || null,
        birth_date: birthDateClean,
        clinic_id: isHome ? null : clinic?.id ?? null,
        clinic_title: sourceOrder?.clinic_title ?? (isHome ? HOME_VISIT_TITLE : clinic?.title ?? null),
        clinic_address: sourceOrder?.clinic_address ?? (isHome ? homeAddressClean : clinic?.address ?? null),
        original_amount: original,
        discount_amount: discount,
        out_sum: finalAmount,
        bonus_items: bonusItems.length > 0 ? [{ title: "Общий анализ крови", price: 990, final_price: 0, slugs: bonusItems }] : [],
        promo_code: appliedCode,
        partner_id: partner?.partner_id ?? null,
        partner_discount_pct: partner ? partner.discount_pct : null,
        partner_commission: partnerCommission,
        status: "pending",
        is_test: isTest,
        ym_client_id: typeof ymClientId === "string" && /^\d{1,32}$/.test(ymClientId) ? ymClientId : null,
        upsell_source_order_id: validUpsellOrderId,
        consultation_purchased: withConsult,
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
        // Скидку распределяем по позициям пропорционально, остаток кладём в первую.
        ...items.map((p, i) => {
          const share = i === items.length - 1
            ? discount - items.slice(0, -1).reduce((acc, x) => acc + Math.round((discount * x.price) / itemsSum), 0)
            : Math.round((discount * p.price) / itemsSum);
          return {
            name: p.title.slice(0, 128),
            quantity: 1,
            sum: Number((p.price - share).toFixed(2)),
            payment_method: "full_payment",
            payment_object: "service",
            tax: "none",
          };
        }),
        ...(withConsult
          ? [
              {
                name: CONSULT_TITLE,
                quantity: 1,
                sum: Number(consultAmount.toFixed(2)),
                payment_method: "full_payment",
                payment_object: "service",
                tax: "none",
              },
            ]
          : []),
        ...(homeFee > 0
          ? [
              {
                name: HOME_VISIT_TITLE,
                quantity: 1,
                sum: Number(homeFee.toFixed(2)),
                payment_method: "full_payment",
                payment_object: "service",
                tax: "none",
              },
            ]
          : []),
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
       Description: `${items.length > 0 ? items.map((p) => p.title).join(" + ") : CONSULT_TITLE}: заказ #${invId}${isTest ? " (TEST)" : ""}`.slice(0, 100),
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

    return json({ url: `${ROBOKASSA_URL}?${query}`, invId, isTest, claimSecret });
  } catch (e) {
    console.error("energy-create-payment error", e);
    return json({ error: "Внутренняя ошибка" }, 500);
  }
});
