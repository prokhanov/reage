// energy-order-status: публичная проверка статуса гостевого заказа ReAge Energy по InvId.
// verify_jwt = false — покупатель может быть не авторизован.
// Отдаёт только безопасный минимум: статус, тестовый ли платёж, сумму и клинику.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const invId = Number((body as { invId?: number | string }).invId);
    if (!Number.isFinite(invId)) return json({ error: "Не указан InvId" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .from("energy_orders")
      .select("id, status, is_test, out_sum, clinic_title, clinic_address, email, bundle, bundles, upsell_source_order_id, consultation_purchased")
      .eq("inv_id", invId)
      .maybeSingle();

    if (error) return json({ error: "Не удалось получить заказ" }, 500);
    if (!data) return json({ error: "Заказ не найден" }, 404);

    let status = data.status;
    if (status === "paid" && data.upsell_source_order_id) {
      const bundles = (data.bundles ?? []).filter((slug: string) => slug && slug !== "consultation");
      if (bundles.length > 0) {
        const { count } = await admin
          .from("one_time_checkups")
          .select("id", { count: "exact", head: true })
          .eq("order_id", data.id);
        if ((count ?? 0) < bundles.length) status = "pending";
      } else if (data.consultation_purchased === true) {
        const { count } = await admin
          .from("one_time_checkups")
          .select("id", { count: "exact", head: true })
          .eq("order_id", data.upsell_source_order_id)
          .eq("consultation_purchased", true);
        if ((count ?? 0) === 0) status = "pending";
      }
    }

    return json({
      status,
      bundle: data.bundle,
      bundles: (data as { bundles?: string[] | null }).bundles ?? null,
      isTest: data.is_test,
      outSum: Number(data.out_sum),
      clinicTitle: data.clinic_title,
      clinicAddress: data.clinic_address,
      email: String(data.email ?? ""),
      isUpsell: Boolean(data.upsell_source_order_id),
      consultationPurchased: data.consultation_purchased === true,
    });
  } catch (e) {
    console.error("energy-order-status error", e);
    return json({ error: "Внутренняя ошибка" }, 500);
  }
});
