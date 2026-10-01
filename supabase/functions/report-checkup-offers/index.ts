import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const RequestSchema = z.object({
  action: z.enum(["list", "save"]),
  analysisId: z.string().uuid(),
  selectedSlugs: z.array(z.string().min(1).max(100)).max(30).optional(),
});

const FALLBACK_PRODUCTS: Record<string, { name: string; price: number }> = {
  energy: { name: "Энергия", price: 5990 },
  thyroid: { name: "Щитовидная железа", price: 3990 },
  iron: { name: "Железо", price: 5990 },
  "cardio-risk": { name: "Сердце и сосуды", price: 7990 },
  metabolic: { name: "Обмен веществ", price: 6990 },
  liver: { name: "Печень", price: 4990 },
  kidney: { name: "Почки", price: 4990 },
  base: { name: "Базовый", price: 7990 },
  vitamins: { name: "Витамины и минералы", price: 5990 },
  "female-hormones": { name: "Женские гормоны", price: 3990 },
  "male-hormones": { name: "Мужские гормоны", price: 4490 },
  hair: { name: "Волосы", price: 5990 },
  full: { name: "Полный чекап", price: 23990 },
};

const TOPICS: Record<string, string> = {
  energy: "железо, щитовидная железа, витамины",
  thyroid: "гормоны щитовидной железы",
  iron: "запасы железа и анемия",
  "cardio-risk": "холестерин, сосуды, воспаление",
  metabolic: "сахар, инсулин, липиды",
  liver: "ферменты и функция печени",
  kidney: "функция почек",
  base: "базовая картина здоровья",
  vitamins: "витамины и минералы",
  "female-hormones": "женские гормоны",
  "male-hormones": "мужские гормоны",
  hair: "причины выпадения волос",
  full: "все системы организма",
};

function plural(n: number) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return "показатель";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "показателя";
  return "показателей";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Некорректный запрос" }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Требуется вход" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Сервис не настроен" }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData } = await userClient.auth.getUser();
  const actorId = authData.user?.id;
  if (!actorId) return json({ error: "Сессия недействительна" }, 401);

  const admin = createClient(url, serviceKey);
  const { data: allowed } = await admin.rpc("has_admin_permission", {
    _user_id: actorId,
    _module: "patients",
  });
  if (allowed !== true) return json({ error: "Нет доступа" }, 403);

  const { analysisId, action } = parsed.data;
  const [{ data: analysis }, { data: source }] = await Promise.all([
    admin.from("analyses").select("id, user_id").eq("id", analysisId).maybeSingle(),
    admin
      .from("one_time_checkups")
      .select("id, user_id, checkup_slug, paid_amount")
      .eq("analysis_id", analysisId)
      .maybeSingle(),
  ]);
  if (!analysis) return json({ error: "Анализ не найден" }, 404);
  if (source && source.user_id !== analysis.user_id) return json({ error: "Данные отчёта не совпадают" }, 409);

  const [{ data: settings }, { data: variants }, { data: current }] = await Promise.all([
    admin.from("checkup_settings").select("slug, price, is_active"),
    admin.from("checkup_variants").select("slug, parent_slug, label"),
    admin.from("report_checkup_offers").select("*").eq("analysis_id", analysisId).eq("is_active", true),
  ]);

  const products = new Map<string, { name: string; price: number }>(Object.entries(FALLBACK_PRODUCTS));
  for (const row of settings ?? []) {
    const fallback = products.get(row.slug);
    if (fallback && row.is_active !== false) products.set(row.slug, { ...fallback, price: Number(row.price) });
    if (row.is_active === false) products.delete(row.slug);
  }
  const parentByVariant = new Map<string, string>();
  const baseProducts = new Map(products);
  const settingBySlug = new Map((settings ?? []).map((row) => [row.slug, row]));
  for (const variant of variants ?? []) {
    const parent = baseProducts.get(variant.parent_slug);
    if (!parent) continue;
    const own = settingBySlug.get(variant.slug);
    if (own?.is_active === false) { products.delete(variant.slug); continue; }
    const price = own ? Number(own.price) : parent.price;
    products.set(variant.slug, { name: `${parent.name} · ${variant.label}`, price });
    parentByVariant.set(variant.slug, variant.parent_slug);
  }

  const { data: markerRows } = await admin.from("checkup_markers").select("checkup_slug");
  const markerCount = new Map<string, number>();
  for (const row of markerRows ?? []) markerCount.set(row.checkup_slug, (markerCount.get(row.checkup_slug) ?? 0) + 1);
  const summaryFor = (slug: string) => {
    const n = markerCount.get(slug) ?? 0;
    const topic = TOPICS[slug] ?? TOPICS[parentByVariant.get(slug) ?? ""] ?? "";
    return [n > 0 ? `${n} ${plural(n)}` : "", topic].filter(Boolean).join(" · ") || null;
  };
  // Старые баннеры без описания получают его автоматически.
  for (const offer of current ?? []) {
    if (!offer.advertised_checkup_summary) {
      const summary = summaryFor(offer.advertised_checkup_slug as string);
      if (summary) {
        offer.advertised_checkup_summary = summary;
        await admin.from("report_checkup_offers").update({ advertised_checkup_summary: summary }).eq("id", offer.id);
      }
    }
  }

  const candidates = [...products.entries()]
    .map(([slug, product]) => {
      const isFull = slug === "full" || parentByVariant.get(slug) === "full";
      const sourceIsMini = Boolean(
        source && source.checkup_slug !== "full" && parentByVariant.get(source.checkup_slug) !== "full",
      );
      const pricingMode = isFull && sourceIsMini ? "full_upgrade" : "ten_percent";
      const listPrice = Math.round(product.price);
      const sourcePaid = source ? Math.round(Number(source.paid_amount)) : 0;
      const finalPrice = pricingMode === "full_upgrade"
        ? Math.round((listPrice - sourcePaid) * 0.9)
        : Math.round(listPrice * 0.9);
      return {
        slug,
        name: product.name,
        summary: summaryFor(slug),
        listPrice,
        pricingMode,
        sourcePaid,
        finalPrice,
        discountAmount: listPrice - finalPrice,
        eligible: finalPrice > 0 && finalPrice < listPrice,
      };
    })
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => a.listPrice - b.listPrice || a.name.localeCompare(b.name, "ru"));

  if (action === "list") return json({ candidates, selected: current ?? [] });

  const selectedSlugs = new Set(parsed.data.selectedSlugs ?? []);
  if ([...selectedSlugs].some((slug) => !candidates.some((candidate) => candidate.slug === slug))) {
    return json({ error: "Один из выбранных чекапов больше недоступен" }, 400);
  }

  const currentBySlug = new Map((current ?? []).map((offer) => [offer.advertised_checkup_slug as string, offer]));
  const removedIds = (current ?? [])
    .filter((offer) => !selectedSlugs.has(offer.advertised_checkup_slug as string) && !offer.used_at)
    .map((offer) => offer.id as string);
  if (removedIds.length > 0) {
    const { error } = await admin
      .from("report_checkup_offers")
      .update({ is_active: false, reserved_order_id: null, reserved_until: null, updated_at: new Date().toISOString() })
      .in("id", removedIds);
    if (error) return json({ error: "Не удалось убрать баннер" }, 500);
  }

  for (const candidate of candidates.filter((item) => selectedSlugs.has(item.slug))) {
    if (currentBySlug.has(candidate.slug)) continue;
    let inserted = false;
    for (let attempt = 0; attempt < 6 && !inserted; attempt += 1) {
      const code = makeCode();
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      // Сначала общий промокод (уникальность кода — по всей базе промокодов).
      const { data: promo, error: promoError } = await admin.from("promo_codes").insert({
        code,
        discount_type: "fixed",
        discount_value: candidate.discountAmount,
        applies_to: "all_plans",
        bound_user_id: analysis.user_id,
        max_uses: 1,
        one_per_user: true,
        expires_at: expiresAt,
        is_active: true,
        scope: "checkups",
        notes: `Баннер отчёта: ${candidate.name}`,
        created_by: actorId,
      }).select("id").single();
      if (promoError) {
        if (promoError.code === "23505") continue;
        return json({ error: "Не удалось создать промокод" }, 500);
      }
      const { error } = await admin.from("report_checkup_offers").insert({
        analysis_id: analysisId,
        user_id: analysis.user_id,
        source_checkup_id: source?.id ?? null,
        source_checkup_slug: source?.checkup_slug ?? "report",
        source_paid_amount: candidate.sourcePaid,
        advertised_checkup_slug: candidate.slug,
        advertised_checkup_name: candidate.name,
        advertised_checkup_summary: candidate.summary,
        advertised_list_price: candidate.listPrice,
        pricing_mode: candidate.pricingMode,
        final_price: candidate.finalPrice,
        discount_amount: candidate.discountAmount,
        code,
        expires_at: expiresAt,
        promo_code_id: promo.id,
        created_by: actorId,
      });
      if (!error) inserted = true;
      else {
        await admin.from("promo_codes").delete().eq("id", promo.id);
        if (error.code !== "23505") return json({ error: "Не удалось создать промокод" }, 500);
      }
    }
    if (!inserted) return json({ error: "Не удалось создать уникальный промокод" }, 500);
  }

  const { data: saved } = await admin
    .from("report_checkup_offers")
    .select("*")
    .eq("analysis_id", analysisId)
    .eq("is_active", true)
    .order("created_at");
  return json({ success: true, selected: saved ?? [] });
});