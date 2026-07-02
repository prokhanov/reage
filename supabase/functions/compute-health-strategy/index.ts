import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { loadHealthModelSettings } from "../_shared/health-model/settings.ts";
import { normalizeMarker } from "../_shared/health-model/m1-normalize.ts";
import { toMarkerInputs, computeTotalsPerSystem, categoryToSystem } from "../_shared/health-model/adapter.ts";
import { computeSystemScores } from "../_shared/health-model/m3-systems.ts";
import { computeHealthIndex } from "../_shared/health-model/m4-health-index.ts";
import { computeBioAge } from "../_shared/health-model/m5-bioage.ts";
import { computeAgingPace } from "../_shared/health-model/m6-aging-pace.ts";
import { computeTrajectory } from "../_shared/health-model/m7-trajectory.ts";
import { computeExplainability } from "../_shared/health-model/m8-explainability.ts";

// Обратная карта SystemKey → русское имя категории (для матчинга с biomarker_categories)
const SYSTEM_TO_CATEGORY: Record<string, string> = {
  cardiovascular: "Сердечно-сосудистая система",
  metabolism: "Метаболизм и Детоксикация",
  inflammation: "Воспалительная и иммунная система",
  endocrine: "Эндокринная и стрессовая система",
  energy: "Энергия и восстановление",
};


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcAge(birth: string) {
  const b = new Date(birth);
  const t = new Date();
  const years = (t.getTime() - b.getTime()) / (365.2425 * 24 * 3600 * 1000);
  // floor по десятым: 37.99 → 37.9 (не показываем 38 до фактического ДР)
  return Math.floor(years * 10) / 10;
}


function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function detectAnalysesPerYear(planName?: string | null): number {
  const n = (planName || "").toLowerCase();
  if (n.includes("базов") || n.includes("basic") || n.includes("старт")) return 2;
  if (n.includes("плюс") || n.includes("plus") || n.includes("оптим") || n.includes("optim") || n.includes("стандарт")) return 3;
  if (n.includes("эксперт") || n.includes("expert") || n.includes("прем") || n.includes("premium") || n.includes("макс")) return 4;
  return 3;
}

function normalizeRoadmapText(text?: string | null) {
  return String(text || "")
    .replace(/контрольн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?/gi, "плановая сдача анализов")
    .replace(/повторн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?/gi, "плановая сдача анализов")
    .replace(/пересда(?:ть|ча|чи|ём|ем|йте)?/gi, "сдать плановую панель")
    .replace(/отдельн(?:ый|ого|ую|ые|ых)\s+контроль/gi, "плановый этап")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeRationale(text?: string | null) {
  return String(text || "")
    .replace(/Учитывая текущие биомаркеры и хронологический возраст пациента/gi, "Учитывая ваши текущие биомаркеры и хронологический возраст")
    .replace(/Учитывая текущие биомаркеры пациента/gi, "Учитывая ваши текущие биомаркеры")
    .replace(/хронологический возраст пациента/gi, "ваш хронологический возраст")
    .replace(/(?<![а-яё])пациент(?:а|у|ом|е|ы|ов|ам|ах)?(?![а-яё])/gi, "вас")
    .replace(/(?<![а-яё])пациент(?![а-яё])/gi, "вы")
    .replace(/\s{2,}/g, " ")
    .trim();
}



function hasLegacyRoadmap(roadmap: any) {
  if (!Array.isArray(roadmap)) return true;
  const text = JSON.stringify(roadmap).toLowerCase();
  return /контрольн\S*\s+анализ|повторн\S*\s+анализ|пересда/.test(text);
}

type RouteSlot = {
  kind: "start" | "milestone" | "analysis" | "summary";
  date: string;
  title: string;
  analysis_number?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { userId, force, preview, publish, edited } = body || {};
    const targetUserId = userId || user.id;

    // Helper: superadmin guard for preview/publish on other users
    const requireSuperadminForOther = async () => {
      if (targetUserId === user.id) return true;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();
      return !!roleRow;
    };

    // PUBLISH MODE — accept edited snapshot and insert without recomputing
    if (publish && edited && typeof edited === "object") {
      const ok = await requireSuperadminForOther();
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!edited.analysis_id) {
        return new Response(JSON.stringify({ error: "analysis_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const insertRow: any = {
        user_id: targetUserId,
        analysis_id: edited.analysis_id,
        current_bio_age: Number(edited.current_bio_age),
        chronological_age: Number(edited.chronological_age),
        target_bio_age: Number(edited.target_bio_age),
        health_index: edited.health_index != null ? Math.round(Number(edited.health_index)) : null,
        system_goals: edited.system_goals ?? [],
        action_map: edited.action_map ?? [],
        rationale: normalizeRationale(edited.rationale),
        cohort_percentile: edited.cohort_percentile ?? null,
        cohort_label: edited.cohort_label ?? null,
        trajectory: edited.trajectory ?? null,
        roadmap: edited.roadmap ?? null,
        key_biomarkers: edited.key_biomarkers ?? null,
        expectations: edited.expectations ?? [],
        analyses_per_year: edited.analyses_per_year ?? null,
        model: "google/gemini-2.5-flash (edited)",
      };
      const { data: saved, error: pubErr } = await supabase
        .from("health_strategy_snapshots")
        .insert(insertRow)
        .select()
        .single();
      if (pubErr) {
        return new Response(JSON.stringify({ error: pubErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Sync recalculated bio-age + HI back to the source analysis so dashboard/reports match.
      try {
        await supabase
          .from("analyses")
          .update({
            biological_age: Number(edited.current_bio_age),
            health_index: edited.health_index != null ? Math.round(Number(edited.health_index)) : null,
          })
          .eq("id", edited.analysis_id);
      } catch (_e) {
        // non-fatal — snapshot is the source of truth for strategy page
      }
      return new Response(JSON.stringify(saved), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PREVIEW MODE — require superadmin guard when targeting another user
    if (preview) {
      const ok = await requireSuperadminForOther();
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    const { data: latestAnalysisRow } = await supabase
      .from("analyses")
      .select("id, health_index, biological_age, biomarkers_metadata")
      .eq("user_id", targetUserId)
      .eq("status", "processed")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force && !preview && latestAnalysisRow) {
      const { data: cached } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("analysis_id", latestAnalysisRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const cachedHi = cached?.health_index == null ? null : Math.round(Number(cached.health_index));
      const latestHi = (latestAnalysisRow as any)?.health_index == null ? null : Math.round(Number((latestAnalysisRow as any).health_index));
      const cacheMatchesLatestHealthModel = latestHi == null || cachedHi === latestHi;
      if (cached && cacheMatchesLatestHealthModel && cached.roadmap && cached.key_biomarkers && Array.isArray(cached.expectations) && cached.expectations.length > 0 && !hasLegacyRoadmap(cached.roadmap)) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const [profileRes, analysesRes, prescRes, categoriesRes, complaintsRes, subRes, bookingsRes, adherenceRes, historyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("analyses").select("*, analysis_values(value, biomarkers(name, code, category, unit, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female, age_ranges, range_mode, aging_weight))").eq("user_id", targetUserId).eq("status", "processed").order("date", { ascending: false }).limit(1),
      supabase.from("prescriptions").select("*").eq("user_id", targetUserId).eq("is_archived", false),
      supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      supabase.from("complaints").select("main_complaints, goals, lifestyle").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("subscriptions").select("plan_id, status, start_date, subscription_plans(name, display_name)").eq("user_id", targetUserId).eq("status", "active").order("start_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("analysis_bookings").select("booking_date, status").eq("user_id", targetUserId).gte("booking_date", new Date().toISOString().slice(0, 10)).order("booking_date", { ascending: true }),
      supabase.from("prescription_adherence").select("status").eq("user_id", targetUserId).gte("date", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
      supabase.from("analyses").select("date, biological_age").eq("user_id", targetUserId).eq("status", "processed").not("biological_age", "is", null).order("date", { ascending: true }),
    ]);


    const profile = profileRes.data;
    const latest = analysesRes.data?.[0];
    const prescriptions = prescRes.data || [];
    const categories = categoriesRes.data || [];
    const complaints = complaintsRes.data;
    const subscription: any = subRes.data;
    const futureBookings = bookingsRes.data || [];
    const adherenceRows = adherenceRes.data || [];
    const bioAgeHistory = (historyRes.data || []).map((r: any) => ({ date: r.date, bio_age: Number(r.biological_age) })).filter((p: any) => Number.isFinite(p.bio_age));


    if (!profile || !latest || latest.biological_age == null) {
      console.log("DEBUG no-data", { targetUserId, hasProfile: !!profile, latestId: latest?.id, latestStatus: latest?.status, latestBio: latest?.biological_age, analysesError: analysesRes.error?.message, profileError: profileRes.error?.message });
      return new Response(JSON.stringify({ error: "No analysis data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const planName = subscription?.subscription_plans?.display_name || subscription?.subscription_plans?.name || null;
    const analysesPerYear = detectAnalysesPerYear(planName);

    const chronoAge = calcAge(profile.birth_date);
    const storedBio = Number(latest.biological_age);
    const storedAiAdjust = Number(
      (latest.biomarkers_metadata as any)?.bio_age_calc?.ai_adjustment ?? 0,
    );
    // Re-apply CURRENT bio-age formula (slope 0.25 + asymmetric AI corridor)
    // so "Пересчитать" reflects latest calibration, not value cached at upload time.
    // ===== M3/M4: пересчитываем HI детерминированно, чтобы «Пересчитать» реально
    // обновлял индекс здоровья, а не показывал старое значение из finalize-analysis.
    let recomputedHi: number | null = null;
    try {
      const _settings = await loadHealthModelSettings(supabase as any);
      const _inputs = toMarkerInputs(latest.analysis_values || [], chronoAge, profile.gender || null);
      const _scored = _inputs.map((m) => normalizeMarker(m, _settings));
      const _totals = computeTotalsPerSystem(null, _inputs);
      const _systems = computeSystemScores(_scored, _totals, _settings);
      const _hi = computeHealthIndex(_systems, _settings, null);
      if (_hi && isFinite(_hi.hi)) {
        recomputedHi = Math.round(_hi.hi);
        const existingMetadata = latest.biomarkers_metadata && typeof latest.biomarkers_metadata === "object"
          ? latest.biomarkers_metadata as any
          : {};
        const existingAiAnalysis = existingMetadata.ai_analysis && typeof existingMetadata.ai_analysis === "object"
          ? existingMetadata.ai_analysis
          : {};
        const existingCategoryScores = existingAiAnalysis.category_scores && typeof existingAiAnalysis.category_scores === "object"
          ? existingAiAnalysis.category_scores
          : {};
        const m3CategoryScores: Record<string, any> = {};
        for (const s of _systems) {
          const catName = SYSTEM_TO_CATEGORY[s.system];
          if (!catName || s.insufficient || typeof s.score !== "number") continue;
          const prev = existingCategoryScores[catName] && typeof existingCategoryScores[catName] === "object"
            ? existingCategoryScores[catName]
            : {};
          m3CategoryScores[catName] = {
            ...prev,
            score: Math.round(s.score),
            markers_used: s.markers_used,
            markers_total: s.markers_total,
            coverage: Math.round((s.coverage || 0) * 100),
            source: "m3",
          };
        }
        const nextMetadata = {
          ...existingMetadata,
          new_model: {
            ...(existingMetadata.new_model || {}),
            hi: Math.round(_hi.hi * 10) / 10,
            hi_raw: Math.round(_hi.hi_raw * 10) / 10,
            dispersion_penalty: Math.round(_hi.dispersion_penalty * 10) / 10,
            improvement_bonus: Math.round(_hi.improvement_bonus * 10) / 10,
            systems: _systems.map((s) => ({
              system: s.system,
              score: s.score == null ? null : Math.round(s.score * 10) / 10,
              markers_used: s.markers_used,
              markers_total: s.markers_total,
              coverage: Math.round((s.coverage || 0) * 100) / 100,
              insufficient: s.insufficient,
            })),
            settings_version: "v2_m3_penalties",
          },
          ai_analysis: {
            ...existingAiAnalysis,
            category_scores: {
              ...existingCategoryScores,
              ...m3CategoryScores,
            },
          },
        };
        // Persist so дашборд/PDF/последующие запросы видят согласованное число.
        await supabase
          .from("analyses")
          .update({ health_index: recomputedHi, biomarkers_metadata: nextMetadata })
          .eq("id", latest.id);
        latest.health_index = recomputedHi;
        latest.biomarkers_metadata = nextMetadata;
      }
    } catch (e: any) {
      console.error("[HI recompute M3/M4] failed:", e?.message);
    }
    const hiForBio = Number(latest.health_index ?? recomputedHi ?? 0);
    // BioAge через M5 (PhenoAge + KDM, коридор ±15). Согласовано с finalize-analysis.
    // Не используем legacy HI-формулу chrono+(85−HI)·0.25 — она давала завышение
    // на 15+ лет при плохих субъективных категориях, даже когда PhenoAge был отличным.
    let recalcBio: number = storedBio;
    try {
      const _inputsBA = toMarkerInputs(latest.analysis_values || [], chronoAge, profile.gender || null);
      const fallbackBA = chronoAge + (82 - hiForBio) * 0.18;
      const ba = computeBioAge(_inputsBA, chronoAge, { fallback: fallbackBA, hi: hiForBio });
      if (ba && Number.isFinite(ba.bio_age)) {
        recalcBio = Math.round(ba.bio_age * 10) / 10;
      }
    } catch (e: any) {
      console.error("[BioAge M5 recompute] failed:", e?.message);
    }
    const currentBio = isFinite(recalcBio) ? recalcBio : storedBio;

    // Финальная синхронизация чисел анализа после пересчёта: HI считается выше,
    // био-возраст зависит от уже обновлённого HI, поэтому сохраняем его здесь.
    if (recomputedHi !== null) {
      await supabase
        .from("analyses")
        .update({ health_index: recomputedHi, biological_age: currentBio })
        .eq("id", latest.id);
      latest.health_index = recomputedHi;
      latest.biological_age = currentBio;
    }


    // Build biomarker summary + deviation flags
    const byCat: Record<string, Array<{ name: string; code: string; value: number; unit: string; deviated: boolean }>> = {};
    for (const av of latest.analysis_values || []) {
      const b = av.biomarkers;
      if (!b) continue;
      const v = Number(av.value);
      const optMin = b.optimal_min ?? b.normal_min;
      const optMax = b.optimal_max ?? b.normal_max;
      const deviated = (optMin != null && v < Number(optMin)) || (optMax != null && v > Number(optMax));
      byCat[b.category] = byCat[b.category] || [];
      byCat[b.category].push({ name: b.name, code: b.code, value: v, unit: b.unit, deviated });
    }

    const categoriesContext = categories.map((c: any) => {
      const items = (byCat[c.name] || []).slice(0, 14).map((b) => `${b.name} (${b.code}): ${b.value} ${b.unit}${b.deviated ? " [ОТКЛОНЕНИЕ]" : ""}`).join("; ");
      return `${c.name}: ${items || "нет данных"}`;
    }).join("\n");

    const prescContext = prescriptions.map((p: any) => {
      const title = p.name || p.prescription?.slice(0, 80) || "—";
      return `- ${title} | форма: ${p.form || "—"} | дозировка: ${p.dosage || "—"} | длительность: ${p.duration || "—"} | причина: ${p.reason || "—"} | эффект: ${p.effect || "—"}`;
    }).join("\n");

    const systemNames = categories.map((c: any) => c.name);

    // Compute adherence %
    const adherenceTotal = adherenceRows.length;
    const adherenceDone = adherenceRows.filter((r: any) => r.status === "completed" || r.status === "done").length;
    const adherencePct = adherenceTotal > 0 ? Math.round((adherenceDone / adherenceTotal) * 100) : null;

    // Plan analysis dates. AnalysesPerYear is the TOTAL number of full panel
    // submissions within a yearly subscription: Basic = 2 (start + 6m),
    // Plus = 3 (start + 4m + 8m), Expert = 4 (start + 3m + 6m + 9m).
    const startDate = new Date(latest.date);
    const intervalMonths = Math.round(12 / analysesPerYear);
    const plannedAnalysisDates: string[] = [];
    for (let i = 1; i < analysesPerYear; i++) {
      plannedAnalysisDates.push(toIso(addMonths(startDate, i * intervalMonths)));
    }

    // Override with real booking dates where possible
    const realDates = futureBookings.map((b: any) => b.booking_date).slice(0, plannedAnalysisDates.length);
    const finalAnalysisDates = plannedAnalysisDates.map((d, i) => realDates[i] || d);
    // If analysis is already processed (report exists), pull the "report ready"
    // milestone forward to whichever happened first: today or start+14d. This
    // keeps "сейчас" on a meaningful step instead of pinning it to start.
    const todayMs = Date.now();
    const startMs = startDate.getTime();
    const isProcessed = latest.status === "processed";
    const plannedReportMs = startMs + 14 * 86400000;
    const reportReadyMs = isProcessed
      ? Math.max(startMs + 1 * 86400000, Math.min(todayMs, plannedReportMs))
      : plannedReportMs;
    const reportReadyDate = new Date(reportReadyMs);
    const doctorReviewDate = new Date(reportReadyMs + 2 * 86400000);
    const firstEffectDate = new Date(doctorReviewDate.getTime() + 28 * 86400000);

    const complaintsText = [complaints?.main_complaints, complaints?.goals, complaints?.lifestyle].filter(Boolean).join(" | ") || "не указано";

    const FIXED_SYSTEMS = [
      { key: "energy", label: "Энергия и выносливость" },
      { key: "sleep", label: "Сон и восстановление" },
      { key: "gut", label: "ЖКТ и пищеварение" },
      { key: "hormones", label: "Гормональный баланс" },
      { key: "metabolism", label: "Метаболизм" },
      { key: "inflammation", label: "Воспаление и иммунитет" },
    ];

    // Product-specific route points: no separate re-tests. Every future analysis
    // is a full planned subscription panel; intermediate points are report,
    // doctor review, prescription start, and expected first improvements.
    const milestonesCount = analysesPerYear === 2 ? 7 : analysesPerYear === 3 ? 8 : 9;

    // Patient biomarker codes (real, for validation)
    const patientCodes = Object.values(byCat).flat().map((b) => b.code);
    const deviatedCodes = Object.values(byCat).flat().filter((b) => b.deviated).map((b) => b.code);
    const prescTitles = prescriptions.map((p: any) => p.name || p.prescription?.slice(0, 60)).filter(Boolean);

    const startSlots: RouteSlot[] = [
      { kind: "start", date: toIso(startDate), title: "Стартовая точка", analysis_number: 1 },
      { kind: "milestone", date: toIso(reportReadyDate), title: "Отчёт почти готов" },
      { kind: "milestone", date: toIso(doctorReviewDate), title: "Консультация и старт назначений" },
      { kind: "milestone", date: toIso(firstEffectDate), title: "Первое ожидаемое улучшение" },
    ];
    const analysisSlots: RouteSlot[] = finalAnalysisDates.map((date, i) => ({
      kind: "analysis",
      date,
      title: "Плановая сдача анализов",
      analysis_number: i + 2,
    }));
    const correctionSlots: RouteSlot[] = finalAnalysisDates.map((date, i) => ({
      kind: "milestone",
      date: toIso(new Date(new Date(date).getTime() + 16 * 86400000)),
      title: `Коррекция назначений после анализа №${i + 2}`,
    }));
    const correctionCount = Math.max(0, milestonesCount - startSlots.length - analysisSlots.length - 1);
    const requiredSlots = [
      ...startSlots,
      ...analysisSlots,
      ...correctionSlots.slice(0, correctionCount),
      { kind: "summary", date: toIso(addMonths(startDate, 12)), title: "Итоги года" } as RouteSlot,
    ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, milestonesCount);

    const requiredSlotsText = requiredSlots
      .slice(0, milestonesCount)
      .map((s, i) => `${i + 1}. ${s.date} | kind=${s.kind}${s.analysis_number ? ` | analysis_number=${s.analysis_number}` : ""} | title="${s.title}"`)
      .join("\n");

    const systemPrompt = `Ты — врач превентивной медицины ReAge. Стратегия должна быть ПОЛНОСТЬЮ ПЕРСОНАЛИЗИРОВАННОЙ под этого пользователя — никаких общих шаблонных фраз. Каждое утверждение должно опираться на КОНКРЕТНЫЕ биомаркеры (с кодами), КОНКРЕТНЫЕ назначения пользователя и его реальные жалобы.

КРИТИЧЕСКОЕ ПРАВИЛО: нигде, ни в rationale, ни в описаниях этапов, ни в пунктах roadmap, не используй слова "пациент" / "пациента" / "пациенту" / "пациентом" / "пациенте" / "пациенты" / "пациентов" в 3-м лице. Это личный кабинет человека — обращайся к пользователю через "вы", "ваш", "вас" или пиши нейтрально о данных ("текущие биомаркеры", "ваш хронологический возраст"). За нарушение этого правила ответ будет отклонён.

КАК РАБОТАЕТ ПРОДУКТ ReAge:
- Пользователь покупает годовую подписку и сдаёт ПОЛНУЮ панель анализов по тарифу: Базовый — 2 раза/год, Плюс — 3 раза/год, Эксперт — 4 раза/год.
- Первый анализ уже сдан в стартовой точке. Это Анализ №1, а не «первичная оценка» перед анализами.
- Через 12 дней лаборатория готовит результаты, ещё 2 дня занимает выгрузка и корректировка отчёта, ещё 2 дня — врачебный просмотр и консультация.
- Сразу после готового отчёта и консультации пользователь покупает и начинает принимать назначения. Не откладывай старт препаратов на месяцы.
- В будущем нет отдельных «контрольных анализов», «пересдач отдельных маркеров» или разовых анализов. Есть только ПЛАНОВАЯ сдача полной панели анализов по подписке: следующий полный анализ через ${intervalMonths} мес.
- Для плановых анализов можно указать, на какие маркеры врач будет смотреть особенно внимательно, но нельзя писать, что пользователь «пересдаёт только ferritin/25(OH)D/СРБ».

Сформируй:
1) Реалистичный прогноз биовозраста через 12 мес (target_bio_age, trajectory_points).
2) system_goals — цели по системам со ссылкой на коды биомаркеров пользователя (target_biomarkers — ТОЛЬКО из: ${patientCodes.join(", ") || "—"}).
3) action_map — связь КАЖДОГО назначения с биомаркерами и системами (prescription_name ТОЛЬКО из: ${prescTitles.join("; ") || "(назначений нет — оставь массив пустым)"}).
4) ГОДОВУЮ КАРТУ ПУТИ (roadmap) — ровно ${milestonesCount} майлстоунов. Используй ЭТИ даты, kind, номера анализов и смысл этапов:
${requiredSlotsText}

   ТРЕБОВАНИЯ к каждому майлстоуну:
   - title: КОНКРЕТНЫЙ и соответствующий слоту выше. НЕ добавляй «Контрольный анализ №1», «Повторный анализ», «Пересдача», «Первичная оценка», «Устойчивая динамика», «Промежуточная проверка».
   - description: 1 строка, что именно происходит в этой точке.
   - bullets: 3-4 пункта. Каждый пункт = конкретное действие/измерение с КОДОМ биомаркера или НАЗВАНИЕМ препарата или конкретной жалобой.
   - Для слота «Стартовая точка» (kind=start) описывай ТОЛЬКО факт сдачи полной панели и ожидание результатов. ЗАПРЕЩЕНО перечислять конкретные значения или коды биомаркеров — в момент сдачи крови результаты ещё неизвестны. Допустимо: «сдана полная панель по тарифу», «образец передан в лабораторию», «результаты ожидаются через ~12 дней», «фокус: первичная оценка всех систем». Никаких цифр.
   - Для слота «Консультация и старт назначений» обязательно укажи, что вы начинаете активные назначения сразу после отчёта/врача, с названиями и дозировками из списка назначений.
   - Для слота «Первое ожидаемое улучшение» обязательно напиши, что именно вы должны почувствовать первым и за счёт каких назначений/маркеров (сон, энергия, ЖКТ, воспаление и т.п.).
   - Для kind=analysis пиши: «сдать полную панель по тарифу», «особое внимание при интерпретации: коды ...». Не пиши «пересдать» и не делай отдельный анализ одного маркера.
   - focus: до 40 символов, конкретная цель этапа с маркером (например «D ↑ до 40 нг/мл», «снизить СРБ <1»).
   - ЗАПРЕЩЕНО: «контрольный анализ», «повторный анализ», «пересдать», «улучшение самочувствия», «работа над здоровьем», «первичная оценка», «устойчивая динамика», «системный подход», «комплексная работа», любые общие слова без цифр/кодов/названий, а также любые формы слова «пациент».
    Приоритетные отклонённые коды для работы: ${deviatedCodes.join(", ") || "—"}. Реальные жалобы: ${complaintsText}.
5) key_biomarkers — РОВНО 6 систем (energy, sleep, gut, hormones, metabolism, inflammation). Для каждой 2-4 КОДА СТРОГО из: ${patientCodes.join(", ") || "—"}. Если данных нет — markers пустой.
6) expectations — ТАЙМЛАЙН ОЖИДАЕМЫХ ИЗМЕНЕНИЙ В ОРГАНИЗМЕ (8-14 событий) при соблюдении ваших назначений. Это отдельный блок «что и когда вы должны почувствовать», по принципу приложений отказа от курения («5-й день: лёгкие очищаются»). Каждое событие — ОДНО конкретное ожидаемое изменение, не план действий.
   ТРЕБОВАНИЯ к каждому событию:
   - day_from_start: целое число дней от даты старта (${toIso(startDate)}). Начинай с 7-14 дней (первые ощущения от назначений), доводи до 365 (итог года). Распределяй события неравномерно: больше в первые 90 дней, реже дальше.
   - date_iso: дата = startDate + day_from_start, формат YYYY-MM-DD.
   - category: один из "wellbeing" (самочувствие/энергия/сон/ЖКТ), "biomarker" (конкретная цель по показателю с цифрами от→к), "system" (системный сдвиг — например «снижение системного воспаления»), "milestone" (привязка к контрольной точке roadmap).
   - system_key: ОБЯЗАТЕЛЬНО для wellbeing/system/biomarker, из: energy, sleep, gut, hormones, metabolism, inflammation.
   - title: 3-6 слов, КОНКРЕТНО что произойдёт. Примеры: «Уменьшение утренней усталости», «Витамин D вышел в норму», «Снижение вздутия и тяжести», «СРБ ниже 1 мг/л».
   - description: 1-2 предложения от 2-го лица («вы заметите…», «у вас стабилизируется…»). Без слова «пациент». Объясни КАК это происходит на уровне физиологии в простых словах (например: «клетки получают больше энергии», «слизистая кишечника восстанавливается»).
   - driver: что именно приводит к этому изменению — название конкретных назначений из списка + (при необходимости) образ жизни. Пример: «Omega-3 1000 мг + Магний цитрат 200 мг + сон 7-8 ч». ТОЛЬКО названия из ваших назначений: ${prescTitles.join("; ") || "(назначений нет — опирайся на образ жизни)"}.
   - biomarker_target: ОБЯЗАТЕЛЬНО для category=biomarker. Поля: code (СТРОГО из ${patientCodes.join(", ") || "—"}), from (текущее значение пользователя), to (реалистичная цель), unit. Цели должны быть РЕАЛИСТИЧНЫМИ за указанный срок.
   - linked_roadmap_date: для category=milestone — date_iso из roadmap, к которому это привязано.
   - confidence: "high" | "medium" | "low" — насколько уверены в сроке.
   ЗАПРЕЩЕНО: общие фразы «улучшение здоровья», «комплексный эффект»; события без указания назначений; цели по биомаркерам без чисел; даты позже 365 дней.
   Сортируй по day_from_start по возрастанию.

Допустимый сдвиг биовозраста: -0.3..-2.5 года. Русский язык, без канцелярита. Текст должен звучать как персональное сообщение в личном кабинете, а не как выписка из медкарты.`; 

    const userPrompt = `ВЫ:
- Хроновозраст: ${chronoAge} | Биовозраст: ${currentBio} | Пол: ${profile.gender === "female" ? "женский" : "мужской"}
- Тариф: ${planName || "не указан"} → ${analysesPerYear} анализа/год
- Жалобы и цели: ${complaintsText}
- Приверженность назначениям (30 дн): ${adherencePct != null ? adherencePct + "%" : "нет данных"}
- Дата старта: ${toIso(startDate)}
- Плановые даты следующих полных сдач анализов по тарифу: ${finalAnalysisDates.join(", ") || "нет в рамках года"}
- Отчёт готовится по схеме: +12 дней лаборатория, +2 дня выгрузка/коррекция, +2 дня врачебный просмотр; старт назначений: ${toIso(doctorReviewDate)}

ВАШИ БИОМАРКЕРЫ (с реальными значениями и пометкой отклонений):
${categoriesContext}

ВАШИ АКТИВНЫЕ НАЗНАЧЕНИЯ:
${prescContext || "(нет активных назначений — действия должны строиться вокруг наблюдения и образа жизни)"}

СИСТЕМЫ для goals: ${systemNames.join(", ")}`;


    const tools = [{
      type: "function",
      function: {
        name: "submit_strategy",
        description: "Submit calculated health strategy",
        parameters: {
          type: "object",
          properties: {
            target_bio_age: { type: "number" },
            rationale: { type: "string" },
            system_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  system: { type: "string" },
                  goal: { type: "string" },
                  target_biomarkers: { type: "array", items: { type: "string" } },
                },
                required: ["system", "goal", "target_biomarkers"],
                additionalProperties: false,
              },
            },
            action_map: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prescription_name: { type: "string" },
                  systems: { type: "array", items: { type: "string" } },
                  biomarker_codes: { type: "array", items: { type: "string" } },
                  expected_effect: { type: "string" },
                  effect_eta: { type: "string" },
                },
                required: ["prescription_name", "systems", "biomarker_codes", "expected_effect", "effect_eta"],
                additionalProperties: false,
              },
            },
            cohort_percentile: { type: "integer" },
            cohort_label: { type: "string" },
            trajectory_points: {
              type: "array",
              items: {
                type: "object",
                properties: { month: { type: "integer" }, bio_age: { type: "number" } },
                required: ["month", "bio_age"],
                additionalProperties: false,
              },
            },
            roadmap: {
              type: "array",
              description: `Ровно ${milestonesCount} майлстоунов на год`,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Короткое название этапа, 2-4 слова" },
                  date_iso: { type: "string", description: "Дата майлстоуна YYYY-MM-DD" },
                  kind: { type: "string", enum: ["start", "milestone", "analysis", "summary"] },
                  analysis_number: { type: "integer", description: "№ анализа 1..N для kind=analysis или summary" },
                  description: { type: "string", description: "Подзаголовок, 1 строка" },
                  bullets: { type: "array", items: { type: "string" }, description: "3-4 пункта что произойдёт/будет сделано" },
                  focus: { type: "string", description: "Фокус этапа, до 40 символов" },
                },
                required: ["title", "date_iso", "kind", "description", "bullets", "focus"],
                additionalProperties: false,
              },
            },
            key_biomarkers: {
              type: "array",
              description: "Ровно 6 систем: energy, sleep, gut, hormones, metabolism, inflammation",
              items: {
                type: "object",
                properties: {
                  system_key: { type: "string", enum: ["energy", "sleep", "gut", "hormones", "metabolism", "inflammation"] },
                  system_label: { type: "string" },
                  markers: { type: "array", items: { type: "string" }, description: "2-4 кода биомаркеров" },
                },
                required: ["system_key", "system_label", "markers"],
                additionalProperties: false,
              },
            },
            expectations: {
              type: "array",
              description: "Таймлайн ожидаемых изменений в организме (8-14 событий), отсортирован по day_from_start",
              items: {
                type: "object",
                properties: {
                  day_from_start: { type: "integer", description: "Число дней от даты старта (1..365)" },
                  date_iso: { type: "string", description: "YYYY-MM-DD = startDate + day_from_start" },
                  category: { type: "string", enum: ["wellbeing", "biomarker", "system", "milestone"] },
                  system_key: { type: "string", enum: ["energy", "sleep", "gut", "hormones", "metabolism", "inflammation", "general"] },
                  title: { type: "string", description: "Короткий заголовок, 3-6 слов" },
                  description: { type: "string", description: "1-2 предложения от 2-го лица" },
                  driver: { type: "string", description: "Конкретные назначения / образ жизни, которые приводят к этому изменению" },
                  biomarker_target: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      from: { type: "number" },
                      to: { type: "number" },
                      unit: { type: "string" },
                    },
                    required: ["code", "from", "to", "unit"],
                    additionalProperties: false,
                  },
                  linked_roadmap_date: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["day_from_start", "date_iso", "category", "title", "description", "driver"],
                additionalProperties: false,
              },
            },
          },
          required: ["target_bio_age", "rationale", "system_goals", "action_map", "cohort_percentile", "cohort_label", "trajectory_points", "roadmap", "key_biomarkers", "expectations"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "submit_strategy" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Clamp target
    const minTarget = Math.max(currentBio - 2.5, chronoAge - 15);
    const maxTarget = currentBio - 0.3;
    let target = Number(parsed.target_bio_age);
    if (!isFinite(target)) target = currentBio - 0.7;
    target = Math.min(maxTarget, Math.max(minTarget, target));
    target = Math.round(target * 10) / 10;

    const cohortPct = Number.isFinite(parsed.cohort_percentile)
      ? Math.min(99, Math.max(1, Math.round(parsed.cohort_percentile)))
      : null;

    // Trajectory normalization (unchanged)
    let trajectory: Array<{ month: number; bio_age: number }> | null = null;
    if (Array.isArray(parsed.trajectory_points) && parsed.trajectory_points.length >= 2) {
      const map = new Map<number, number>();
      for (const p of parsed.trajectory_points) {
        const m = Math.round(Number(p.month));
        const v = Number(p.bio_age);
        if (m >= 0 && m <= 12 && isFinite(v)) map.set(m, Math.round(v * 10) / 10);
      }
      map.set(0, Math.round(currentBio * 10) / 10);
      map.set(12, target);
      const filled: Array<{ month: number; bio_age: number }> = [];
      const known = [...map.entries()].sort((a, b) => a[0] - b[0]);
      for (let m = 0; m <= 12; m++) {
        if (map.has(m)) { filled.push({ month: m, bio_age: map.get(m)! }); continue; }
        const prev = [...known].reverse().find(([k]) => k < m)!;
        const next = known.find(([k]) => k > m)!;
        const tt = (m - prev[0]) / (next[0] - prev[0]);
        filled.push({ month: m, bio_age: Math.round((prev[1] + (next[1] - prev[1]) * tt) * 10) / 10 });
      }
      trajectory = filled;
    }

    // Roadmap normalization: force product route dates/titles and remove legacy wording
    const ORDINALS: Record<number, string> = {
      2: "Второй", 3: "Третий", 4: "Четвёртый", 5: "Пятый", 6: "Шестой", 7: "Седьмой", 8: "Восьмой",
    };
    let roadmap: any[] = Array.isArray(parsed.roadmap) ? parsed.roadmap.slice(0, milestonesCount) : [];
    if (roadmap.length > 0) {
      roadmap = requiredSlots.slice(0, milestonesCount).map((slot, i) => {
        const incoming = roadmap[i] || {};
        // Force generic, value-free bullets for the start point: at the moment
        // of blood draw we do not yet know any biomarker results.
        let bullets: string[];
        let description: string;
        let focus: string;
        let title: string = normalizeRoadmapText(slot.title);
        if (slot.kind === "start") {
          bullets = [
            "Сдана полная панель анализов по вашему тарифу",
            "Образец передан в лабораторию, обработка ~12 дней",
            "Результаты пока неизвестны — оцениваем все системы с нуля",
            "Следующий шаг: готовый отчёт и врачебный разбор",
          ];
          description = "Полная панель сдана, ждём результаты";
          focus = "Первичная оценка всех систем";
        } else {
          bullets = (Array.isArray(incoming.bullets) ? incoming.bullets : []).slice(0, 4).map((b: string) => normalizeRoadmapText(b));
          if (slot.kind === "analysis") {
            // Drop redundant "Сдать полную панель по тарифу ..." bullets — это и так понятно из заголовка
            bullets = bullets.filter((b) => !/сдать\s+полную\s+панель|полную\s+панель\s+по\s+тарифу|сдать\s+панель\s+по\s+тарифу/i.test(b));
            if (slot.analysis_number && ORDINALS[slot.analysis_number]) {
              title = `${ORDINALS[slot.analysis_number]} этап сдачи анализов`;
            }
          }
          description = normalizeRoadmapText(incoming.description || slot.title);
          focus = normalizeRoadmapText(incoming.focus || slot.title).slice(0, 60);
        }
        return {
          ...incoming,
          title,
          date_iso: slot.date,
          kind: slot.kind,
          analysis_number: slot.analysis_number,
          description,
          bullets,
          focus,
        };
      });
    }

    // Validate key_biomarkers: only keep codes that actually exist for this patient
    const patientCodeSet = new Set(patientCodes);
    const keyBiomarkers = Array.isArray(parsed.key_biomarkers)
      ? parsed.key_biomarkers.map((kb: any) => ({
          system_key: kb.system_key,
          system_label: kb.system_label,
          markers: (Array.isArray(kb.markers) ? kb.markers : []).filter((c: string) => patientCodeSet.has(c)).slice(0, 4),
        }))
      : [];

    // Validate action_map prescriptions: only keep ones referencing real prescriptions
    const prescNameSet = new Set(prescTitles.map((t: string) => t.toLowerCase()));
    const actionMap = Array.isArray(parsed.action_map)
      ? parsed.action_map.filter((a: any) => !a.prescription_name || prescNameSet.has(String(a.prescription_name).toLowerCase()) || prescTitles.some((t: string) => String(a.prescription_name).toLowerCase().includes(t.toLowerCase())))
      : [];

    // Normalize and validate expectations timeline
    const ALLOWED_SYSTEMS = new Set(["energy", "sleep", "gut", "hormones", "metabolism", "inflammation", "general"]);
    const ALLOWED_CATS = new Set(["wellbeing", "biomarker", "system", "milestone"]);
    const startMsForExp = startDate.getTime();
    const expectations = Array.isArray(parsed.expectations)
      ? parsed.expectations
          .map((e: any) => {
            const day = Math.max(1, Math.min(365, Math.round(Number(e.day_from_start) || 0)));
            const dateIso = e.date_iso || toIso(new Date(startMsForExp + day * 86400000));
            const category = ALLOWED_CATS.has(e.category) ? e.category : "wellbeing";
            const sys = ALLOWED_SYSTEMS.has(e.system_key) ? e.system_key : "general";
            let target: any = undefined;
            if (category === "biomarker" && e.biomarker_target && patientCodeSet.has(e.biomarker_target.code)) {
              target = {
                code: e.biomarker_target.code,
                from: Number(e.biomarker_target.from),
                to: Number(e.biomarker_target.to),
                unit: String(e.biomarker_target.unit || ""),
              };
            }
            // Drop biomarker events without a valid target
            if (category === "biomarker" && !target) return null;
            return {
              day_from_start: day,
              date_iso: dateIso,
              category,
              system_key: sys,
              title: normalizeRationale(String(e.title || "")).slice(0, 80),
              description: normalizeRationale(String(e.description || "")).slice(0, 320),
              driver: normalizeRationale(String(e.driver || "")).slice(0, 200),
              biomarker_target: target,
              linked_roadmap_date: e.linked_roadmap_date || undefined,
              confidence: ["high", "medium", "low"].includes(e.confidence) ? e.confidence : "medium",
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.day_from_start - b.day_from_start)
          .slice(0, 16)
      : [];

    const snapshotPayload: any = {
      user_id: targetUserId,
      analysis_id: latest.id,
      current_bio_age: currentBio,
      chronological_age: chronoAge,
      target_bio_age: target,
      health_index: latest.health_index ? Math.round(latest.health_index) : null,
      system_goals: parsed.system_goals,
      action_map: actionMap,
      rationale: normalizeRationale(parsed.rationale),
      cohort_percentile: cohortPct,
      cohort_label: parsed.cohort_label || null,
      trajectory,
      roadmap,
      key_biomarkers: keyBiomarkers,
      expectations,
      analyses_per_year: analysesPerYear,
      model: "google/gemini-2.5-flash",
    };

    // Build explanation block (for preview/admin transparency)
    const hiVal = snapshotPayload.health_index ?? 0;
    const baseBioAge = chronoAge + (85 - hiVal) * 0.25;
    const aiDelta = currentBio - baseBioAge;

    // Top deviations across all biomarkers
    const allDeviations: any[] = [];
    for (const cat of Object.keys(byCat)) {
      for (const b of byCat[cat]) {
        if (!b.deviated) continue;
        // Pull range info from raw analysis_values for ratio calc
        const raw = (latest.analysis_values || []).find((av: any) => av.biomarkers?.code === b.code);
        const bm = raw?.biomarkers;
        const optMin = bm?.optimal_min ?? bm?.normal_min;
        const optMax = bm?.optimal_max ?? bm?.normal_max;
        let deltaPct = 0;
        if (optMin != null && b.value < Number(optMin)) {
          deltaPct = ((Number(optMin) - b.value) / Number(optMin)) * 100;
        } else if (optMax != null && b.value > Number(optMax)) {
          deltaPct = ((b.value - Number(optMax)) / Number(optMax)) * 100;
        }
        allDeviations.push({
          name: b.name,
          code: b.code,
          value: b.value,
          unit: b.unit,
          category: cat,
          optimal_min: optMin != null ? Number(optMin) : null,
          optimal_max: optMax != null ? Number(optMax) : null,
          deviation_pct: Math.round(deltaPct * 10) / 10,
        });
      }
    }
    allDeviations.sort((a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct));
    const topDeviations = allDeviations.slice(0, 5);

    // System ratings — единый источник M3 (детерминированный расчёт по биомаркерам).
    // AI-скоры (biomarkers_metadata.ai_analysis.category_scores) используются ТОЛЬКО как
    // fallback при недостатке данных (M3 вернул insufficient) — иначе HI и рейтинги
    // систем расходятся, т.к. HI считается M4 из тех же M3 system_scores.
    let m3SystemScores: any[] = [];
    let m3HiBreakdown: any = null;
    let m3Settings: any = null;
    try {
      m3Settings = await loadHealthModelSettings(supabase as any);
      const markerInputsForM3 = toMarkerInputs(latest.analysis_values || [], chronoAge, profile.gender || null);
      const markerScoresForM3 = markerInputsForM3.map((m) => normalizeMarker(m, m3Settings));
      const totalsPerSystem = computeTotalsPerSystem(null, markerInputsForM3);
      m3SystemScores = computeSystemScores(markerScoresForM3, totalsPerSystem, m3Settings);
      m3HiBreakdown = computeHealthIndex(m3SystemScores, m3Settings, null);
    } catch (e: any) {
      console.error("[health-model M3/M4 sync] failed:", e?.message);
    }

    const aiCategoryScores: Record<string, any> = (latest.biomarkers_metadata as any)?.ai_analysis?.category_scores || {};
    const extractScore = (raw: any): number | null => {
      if (typeof raw === "number") return raw;
      if (raw && typeof raw === "object" && typeof raw.score === "number") return raw.score;
      return null;
    };
    const m3ByCategory: Record<string, any> = {};
    for (const s of m3SystemScores) {
      const catName = SYSTEM_TO_CATEGORY[s.system];
      if (catName) m3ByCategory[catName] = s;
    }

    const systemRatings = (categories as any[]).map((c) => {
      const items = byCat[c.name] || [];
      const total = items.length;
      const deviated = items.filter((b) => b.deviated).length;

      const m3 = m3ByCategory[c.name];
      let score: number | null = null;
      let source: "m3" | "ai" | "fallback" = "fallback";

      if (m3 && !m3.insufficient && typeof m3.score === "number") {
        score = Math.round(m3.score);
        source = "m3";
      } else {
        // Fallback → AI (только если M3 не смог)
        const ai = extractScore(aiCategoryScores[c.name]);
        if (ai != null) {
          score = ai;
          source = "ai";
        } else if (total > 0) {
          const ratio = deviated / total;
          score = Math.max(0, Math.min(100, Math.round(100 - ratio * 70)));
        }
      }

      let band = "—";
      if (typeof score === "number") {
        if (score >= 85) band = "Отлично";
        else if (score >= 70) band = "Хорошо";
        else if (score >= 50) band = "Умеренно";
        else band = "Внимание";
      }
      const rationale = total === 0
        ? "Нет данных по биомаркерам этой категории"
        : `${deviated} из ${total} маркеров вне оптимума${typeof score === "number" ? `, оценка ${score}/100 (${band})` : ""}${source === "ai" ? " · AI-оценка (данных M3 недостаточно)" : ""}`;
      return {
        category: c.name,
        score,
        deviated,
        total,
        rationale,
        source,
        coverage: m3 ? Math.round((m3.coverage || 0) * 100) : null,
      };
    });

    // HI breakdown (informational — actual HI comes from finalize-analysis)
    const totalMarkers = (latest.analysis_values || []).length;
    const optimalCount = totalMarkers - allDeviations.length;
    const optimalShare = totalMarkers > 0 ? Math.round((optimalCount / totalMarkers) * 100) : 0;

    // ===== M6 / M7 / M8 — детерминированные модули старения =====
    let agingPace: any = null;
    let trajectoryV2: any = null;
    let explainability: any = null;
    try {
      const hmSettings = await loadHealthModelSettings(supabase as any);
      const markerInputs = toMarkerInputs(latest.analysis_values || [], chronoAge, profile.gender || null);
      const markerScores = markerInputs.map((m) => normalizeMarker(m, hmSettings));

      // M6 — Aging Pace (по истории BA)
      agingPace = computeAgingPace(bioAgeHistory, hmSettings);

      // M7 — Траектория с активными назначениями (дефолтные effect-параметры)
      const prescImpacts = (prescriptions as any[]).map((p) => ({
        id: p.id,
        title: p.name || (p.prescription ? String(p.prescription).slice(0, 80) : "Назначение"),
        bio_age_delta: 0.3,
        hi_delta: 1.5,
        recovery_months: 6,
      }));
      trajectoryV2 = computeTrajectory(
        {
          bio_age_now: currentBio,
          hi_now: hiVal,
          chrono_age: chronoAge,
          pace: agingPace?.pace ?? null,
          prescriptions: prescImpacts,
        },
        hmSettings,
      );

      // M8 — Explainability
      explainability = computeExplainability(markerScores);
    } catch (e: any) {
      console.error("[health-model M6/M7/M8] failed:", e?.message);
    }

    const explanation = {

      formula: {
        anchor: 85,
        slope: 0.25,
        base_bio_age: Math.round(baseBioAge * 10) / 10,
        ai_delta: Math.round(aiDelta * 10) / 10,
        ai_corridor: 5,
        final_bio_age: Math.round(currentBio * 10) / 10,
        chronological_age: chronoAge,
        health_index: hiVal,
      },
      health_index: {
        value: hiVal,
        total_deviations: allDeviations.length,
        total_markers: totalMarkers,
        optimal_share_pct: optimalShare,
        top_deviations: topDeviations,
        // M3/M4 reconciliation: HI и рейтинги систем считаются из одних и тех же
        // system_scores → числа согласованы по определению.
        m3_reconciliation: m3HiBreakdown ? {
          hi_from_systems: Math.round(m3HiBreakdown.hi),
          hi_raw: Math.round(m3HiBreakdown.hi_raw * 10) / 10,
          dispersion_penalty: Math.round(m3HiBreakdown.dispersion_penalty * 10) / 10,
          matches_stored_hi: Math.abs(Math.round(m3HiBreakdown.hi) - hiVal) <= 2,
          note: "HI и рейтинги систем построены из одних system_scores (M3→M4). Расхождение >2 п. означает, что stored HI устарел — пересоздайте отчёт.",
        } : null,
        breakdown: [
          `Маркеров в анализе: ${totalMarkers}`,
          `В оптимуме: ${optimalCount} (${optimalShare}%)`,
          `Отклонений: ${allDeviations.length}`,
          `HI = средневзвешенное(system_scores) − k·σ(систем). Рейтинги систем считаются той же моделью M3.`,
        ],
      },
      system_ratings: systemRatings,
      drivers: [
        `Хронологический возраст: ${chronoAge.toFixed(1)} лет`,
        `Health Index: ${hiVal} (якорь формулы — 85)`,
        `Базовый био-возраст: ${baseBioAge.toFixed(1)} = ${chronoAge.toFixed(1)} + (85 − ${hiVal}) × 0.25`,
        `AI-корректировка: ${aiDelta >= 0 ? "+" : ""}${aiDelta.toFixed(1)} год${Math.abs(aiDelta) === 1 ? "" : "а"} (коридор ±5)`,
        `Итоговый био-возраст: ${currentBio.toFixed(1)}`,
        `Отклонений от оптимума: ${allDeviations.length} из ${totalMarkers}`,
      ],
      aging_pace: agingPace,
      trajectory_v2: trajectoryV2,
      explainability,
    };



    // PREVIEW: return computed payload + explanation without inserting
    if (preview) {
      return new Response(
        JSON.stringify({ ...snapshotPayload, adherence_pct: adherencePct, explanation, preview: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: snapshot, error: insErr } = await supabase
      .from("health_strategy_snapshots")
      .insert(snapshotPayload)
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ...snapshot, adherence_pct: adherencePct, explanation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
