// generate-promo-codes: массовая генерация промокодов партией.
// Только для superadmin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Без 0/O/1/I/L
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSuffix(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[arr[i] % ALPHABET.length];
  }
  return out;
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { data: isSuper } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "superadmin",
    });
    if (isSuper !== true) {
      return json({ error: "Недостаточно прав" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const {
      prefix = "",
      count = 1,
      suffix_length = 6,
      batch_name,
      batch_description,
      discount_type,
      discount_value,
      applies_to = "all_plans",
      plan_links = [], // [{plan_id, pricing_id?}]
      bound_user_id = null,
      max_uses = null,
      one_per_user = true,
      starts_at = null,
      expires_at = null,
      is_active = true,
      notes = null,
    } = body as Record<string, any>;

    if (!discount_type || !["percent", "fixed", "free_period"].includes(discount_type)) {
      return json({ error: "Некорректный тип скидки" }, 400);
    }
    const dVal = Number(discount_value);
    if (!Number.isFinite(dVal) || dVal < 0) {
      return json({ error: "Некорректное значение скидки" }, 400);
    }
    const n = Math.max(1, Math.min(5000, Number(count) || 1));
    const sufLen = Math.max(4, Math.min(12, Number(suffix_length) || 6));
    const cleanPrefix = String(prefix || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20);

    const admin = createClient(supabaseUrl, serviceKey);

    // Партия (если массовая или указано имя)
    let batchId: string | null = null;
    if (batch_name || n > 1) {
      const { data: batch, error: batchErr } = await admin
        .from("promo_code_batches")
        .insert({
          name: batch_name || `Партия ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
          description: batch_description ?? null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (batchErr || !batch) {
        return json({ error: "Не удалось создать партию: " + batchErr?.message }, 500);
      }
      batchId = batch.id;
    }

    const generated: string[] = [];
    const usedSet = new Set<string>();
    let attempts = 0;
    while (generated.length < n && attempts < n * 20) {
      attempts++;
      const suf = randomSuffix(sufLen);
      const code = cleanPrefix ? `${cleanPrefix}-${suf}` : suf;
      if (usedSet.has(code)) continue;
      usedSet.add(code);
      generated.push(code);
    }

    const rows = generated.map((code) => ({
      code,
      batch_id: batchId,
      discount_type,
      discount_value: dVal,
      applies_to,
      bound_user_id,
      max_uses: max_uses != null ? Number(max_uses) : null,
      one_per_user: !!one_per_user,
      starts_at,
      expires_at,
      is_active: !!is_active,
      notes,
      created_by: userId,
    }));

    const inserted: { id: string; code: string }[] = [];
    // Вставляем чанками по 200 с обработкой коллизий
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { data, error } = await admin
        .from("promo_codes")
        .insert(chunk)
        .select("id, code");
      if (error) {
        // если коллизия — повторим по одному
        for (const r of chunk) {
          let ok = false;
          for (let attempt = 0; attempt < 5 && !ok; attempt++) {
            const { data: one, error: oneErr } = await admin
              .from("promo_codes")
              .insert(r)
              .select("id, code")
              .single();
            if (!oneErr && one) {
              inserted.push(one);
              ok = true;
            } else {
              r.code = (cleanPrefix ? `${cleanPrefix}-` : "") + randomSuffix(sufLen);
            }
          }
        }
      } else if (data) {
        inserted.push(...data);
      }
    }

    if (applies_to === "specific" && Array.isArray(plan_links) && plan_links.length > 0) {
      const links: any[] = [];
      for (const p of inserted) {
        for (const l of plan_links) {
          if (l?.plan_id) {
            links.push({
              promo_code_id: p.id,
              plan_id: l.plan_id,
              pricing_id: l.pricing_id ?? null,
            });
          }
        }
      }
      if (links.length > 0) {
        for (let i = 0; i < links.length; i += 500) {
          await admin.from("promo_code_plans").insert(links.slice(i, i + 500));
        }
      }
    }

    return json({
      success: true,
      batch_id: batchId,
      count: inserted.length,
      codes: inserted,
    });
  } catch (e) {
    console.error("generate-promo-codes error", e);
    return json({ error: (e as Error).message || "Внутренняя ошибка" }, 500);
  }
});
