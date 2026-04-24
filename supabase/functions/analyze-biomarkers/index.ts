// Edge Function: analyze-biomarkers
// =====================================================================
// JSON-only пайплайн генерации отчёта.
//
// Архитектура (Stage B, JSON-only):
//   1. Загружаем анализ + контекст пациента.
//   2. Параллельно для каждой категории биомаркеров делаем AI tool_call,
//      возвращающий blocks[] (section + summary + text + biomarker[]).
//      AI обязан использовать только переданные biomarker_id (UUID).
//   3. После всех категорий делаем AI tool_call для overall summary.
//   4. Делаем отдельный AI tool_call для prescriptions (как раньше).
//   5. Собираем единый ReportSnapshot (overall summary первым,
//      затем категорийные блоки в стабильном порядке, в конце —
//      маркер блока prescriptions).
//   6. Сохраняем snapshot в recommendations.content_json.
//      В recommendations.text сохраняем текстовую сериализацию
//      ТОЛЬКО для админ-редактора (как backup/legacy view).
//   7. Считаем health_index и biological_age (этот блок не меняется).
// =====================================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------
// JSON Schemas для tool calling (mirror src/lib/reportSnapshot.ts).
// Намеренно держим вручную, чтобы не тащить zod в Deno runtime.
// ---------------------------------------------------------------------

const CATEGORY_BLOCKS_TOOL_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      minItems: 2,
      description:
        "Линейный список блоков категории. Порядок ВАЖЕН: первым section (заголовок), затем summary scope=category, далее text/biomarker в произвольном порядке.",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["text", "section", "summary", "biomarker", "spacer"],
            description: "Тип блока.",
          },
          content: {
            type: "string",
            description:
              "Markdown-контент. Для type=text и type=summary. Поддерживает заголовки, списки, **выделения**, эмодзи.",
          },
          title: {
            type: "string",
            description: "Только для type=section: название категории.",
          },
          emoji: {
            type: "string",
            description: "Только для type=section: эмодзи категории (опционально).",
          },
          scope: {
            type: "string",
            enum: ["category"],
            description: "Только для type=summary: ВСЕГДА 'category'.",
          },
          biomarker_id: {
            type: "string",
            description:
              "Только для type=biomarker: UUID из переданного списка биомаркеров. ЗАПРЕЩЕНО выдумывать UUID.",
          },
          commentary: {
            type: "string",
            description:
              "Только для type=biomarker: клинический комментарий (1-3 предложения, markdown). НЕ дублируй число/единицы — они подтянутся автоматически. Может быть пустой строкой.",
          },
          size: {
            type: "string",
            enum: ["small", "medium", "large"],
            description: "Только для type=spacer.",
          },
        },
        required: ["type"],
      },
    },
  },
  required: ["blocks"],
} as const;

const OVERALL_SUMMARY_TOOL_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description:
        "Markdown-резюме ВСЕГО отчёта (2-4 абзаца). Без заголовка категории — только синтез ключевых выводов и приоритетов.",
    },
  },
  required: ["content"],
} as const;

// ---------------------------------------------------------------------
// Helper: resolve gender/age-aware ranges for a single biomarker value.
// Centralised so we don't repeat the 30-line resolver 6 times.
// ---------------------------------------------------------------------

type ResolvedRanges = {
  normalMin: number | null;
  normalMax: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  criticalMin: number | null;
  criticalMax: number | null;
};

function resolveRanges(av: any, age: number | null, gender: "male" | "female" | null): ResolvedRanges {
  const bm = av.biomarkers;
  let normalMin = bm.normal_min;
  let normalMax = bm.normal_max;
  let optimalMin = bm.optimal_min;
  let optimalMax = bm.optimal_max;
  let criticalMin = bm.critical_min;
  let criticalMax = bm.critical_max;

  if (age !== null && gender && bm.range_mode === "age" && bm.age_ranges?.[gender]) {
    const ar = bm.age_ranges[gender].find((r: any) => age >= r.age_from && age <= r.age_to);
    if (ar) {
      normalMin = ar.min ?? normalMin;
      normalMax = ar.max ?? normalMax;
      if (ar.optimal_min !== undefined) optimalMin = ar.optimal_min;
      if (ar.optimal_max !== undefined) optimalMax = ar.optimal_max;
      if (ar.critical_min !== undefined) criticalMin = ar.critical_min;
      if (ar.critical_max !== undefined) criticalMax = ar.critical_max;
    }
  }
  if ((normalMin === null || normalMax === null) && gender === "male" && bm.normal_min_male !== null) {
    normalMin = bm.normal_min_male;
    normalMax = bm.normal_max_male;
  } else if ((normalMin === null || normalMax === null) && gender === "female" && bm.normal_min_female !== null) {
    normalMin = bm.normal_min_female;
    normalMax = bm.normal_max_female;
  }
  if (optimalMin === null && gender === "male" && bm.optimal_min_male !== null) {
    optimalMin = bm.optimal_min_male;
    optimalMax = bm.optimal_max_male;
  } else if (optimalMin === null && gender === "female" && bm.optimal_min_female !== null) {
    optimalMin = bm.optimal_min_female;
    optimalMax = bm.optimal_max_female;
  }
  if (criticalMin === null && gender === "male" && bm.critical_min_male !== null) {
    criticalMin = bm.critical_min_male;
    criticalMax = bm.critical_max_male;
  } else if (criticalMin === null && gender === "female" && bm.critical_min_female !== null) {
    criticalMin = bm.critical_min_female;
    criticalMax = bm.critical_max_female;
  }

  return { normalMin, normalMax, optimalMin, optimalMax, criticalMin, criticalMax };
}

function resolveStatus(value: number, r: ResolvedRanges): "optimal" | "acceptable" | "risk" | "critical" {
  const isCriticalLow = r.criticalMin !== null && value < r.criticalMin;
  const isCriticalHigh = r.criticalMax !== null && value > r.criticalMax;
  if (isCriticalLow || isCriticalHigh) return "critical";
  const isOutsideNormal =
    (r.normalMin !== null && value < r.normalMin) || (r.normalMax !== null && value > r.normalMax);
  if (isOutsideNormal) return "risk";
  const isInOptimal =
    r.optimalMin !== null || r.optimalMax !== null
      ? (r.optimalMin === null || value >= r.optimalMin) && (r.optimalMax === null || value <= r.optimalMax)
      : !isOutsideNormal;
  if (!isInOptimal) return "acceptable";
  return "optimal";
}

const STATUS_EMOJI: Record<string, string> = {
  optimal: "🟢 ОПТИМАЛЬНО",
  acceptable: "🟡 ДОПУСТИМО",
  risk: "🟠 РИСК",
  critical: "🔴 КРИТИЧНО",
};

// ---------------------------------------------------------------------
// Serialise ReportSnapshot to plain markdown for legacy `text` column.
// Used only for admin editor (backup view) — NOT a source of truth.
// ---------------------------------------------------------------------
function serializeSnapshotToText(snapshot: { blocks: any[] }, biomarkerNameMap: Map<string, string>): string {
  const out: string[] = [];
  for (const b of snapshot.blocks) {
    switch (b.type) {
      case "section":
        out.push(`# ${b.emoji ? `${b.emoji} ` : ""}${b.title || ""}`);
        out.push("");
        break;
      case "summary":
        out.push(b.scope === "overall" ? "## Общее резюме" : "## Краткое резюме");
        out.push(b.content || "");
        out.push("");
        break;
      case "text":
        out.push(b.content || "");
        out.push("");
        break;
      case "biomarker": {
        const name = biomarkerNameMap.get(b.biomarker_id) || b.biomarker_id;
        out.push(`### ${name}`);
        if (b.commentary) out.push(b.commentary);
        out.push("");
        break;
      }
      case "spacer":
        out.push("");
        break;
      case "prescriptions":
        out.push("## Назначения");
        out.push("_(Назначения хранятся в таблице prescriptions и подгружаются на рендере)_");
        out.push("");
        break;
    }
  }
  return out.join("\n").trim();
}

// =====================================================================
// MAIN HANDLER
// =====================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId } = await req.json();
    if (!analysisId) throw new Error("Не указан ID анализа");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Не настроены переменные окружения");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // -------------------- Load reference data --------------------
    const { data: biomarkerCategoriesData } = await supabase
      .from("biomarker_categories")
      .select("*")
      .order("display_order");

    const CATEGORY_EXPERTS = (biomarkerCategoriesData || []).reduce((acc, cat) => {
      acc[cat.name] = { role: cat.expert_role, specialization: cat.expert_specialization, emoji: cat.emoji };
      return acc;
    }, {} as Record<string, { role: string; specialization: string; emoji: string }>);

    // Stable category order: as defined by display_order in DB.
    const CATEGORY_ORDER = (biomarkerCategoriesData || []).map((c) => c.name);

    const { data: promptSettings } = await supabase.from("ai_prompt_settings").select("*");
    const prompts = (promptSettings || []).reduce((acc, p) => {
      acc[p.key] = p.prompt_text;
      return acc;
    }, {} as Record<string, string>);

    console.log(
      `Loaded ${Object.keys(CATEGORY_EXPERTS).length} categories, ${Object.keys(prompts).length} prompts`
    );

    const CATEGORY_KEY_MAP: Record<string, string> = {
      "Энергия и восстановление": "energy",
      "Сердечно-сосудистая система": "cardiovascular",
      "Воспалительная и иммунная система": "inflammation",
      "Эндокринная и стрессовая система": "endocrine",
      "Метаболизм и Детоксикация": "metabolism",
      "Обмен веществ и детоксикация": "metabolism",
      "Почки и водно-солевой баланс": "metabolism",
    };

    // -------------------- Load analysis --------------------
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select(`*, analysis_values (*, biomarkers (*))`)
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) throw new Error("Анализ не найден");

    // Wipe old recommendations + prescriptions for this analysis
    await supabase.from("prescriptions").delete().eq("analysis_id", analysisId);
    await supabase.from("recommendations").delete().eq("analysis_id", analysisId);

    // -------------------- Patient context --------------------
    const [{ data: profile }, { data: latestWeightRecord }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", analysis.user_id).single(),
      supabase
        .from("weight_history")
        .select("weight")
        .eq("user_id", analysis.user_id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

    const actualWeight = latestWeightRecord?.weight
      ? Number(latestWeightRecord.weight)
      : profile?.weight
      ? Number(profile.weight)
      : null;

    const { data: medicalHistory } = await supabase
      .from("medical_history")
      .select("*")
      .eq("user_id", analysis.user_id);

    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("user_id", analysis.user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: previousAnalyses } = await supabase
      .from("analyses")
      .select(`*, analysis_values (*, biomarkers (*))`)
      .eq("user_id", analysis.user_id)
      .lt("date", analysis.date)
      .order("date", { ascending: false })
      .limit(5);

    const { data: previousRecommendations } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", analysis.user_id)
      .or(`analysis_id.is.null,analysis_id.neq.${analysisId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    // @ts-ignore prescription_adherence types may lag
    const { data: prescriptionAdherence } = await supabase
      .from("prescription_adherence")
      .select(`*, prescriptions:prescription_id (prescription, effect, control_date)`)
      .eq("user_id", analysis.user_id)
      .order("tracked_at", { ascending: false })
      .limit(20);

    const { data: userSymptoms } = await supabase
      .from("user_symptoms")
      .select("*")
      .eq("user_id", analysis.user_id)
      .order("tracked_at", { ascending: false })
      .limit(50);

    // -------------------- Derived patient values --------------------
    const age = profile?.birth_date
      ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear()
      : null;
    const gender: "male" | "female" | null =
      profile?.gender === "male" ? "male" : profile?.gender === "female" ? "female" : null;

    const bmi =
      actualWeight && profile?.height && Number(profile.height) > 0
        ? (actualWeight / Math.pow(Number(profile.height) / 100, 2)).toFixed(1)
        : null;

    const groupedMedicalHistory = (medicalHistory || []).reduce((acc: any, item: any) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item.condition);
      return acc;
    }, {} as Record<string, string[]>);

    const medicalHistoryText =
      Object.keys(groupedMedicalHistory).length > 0
        ? Object.entries(groupedMedicalHistory)
            .map(([cat, items]) => `  ${cat}:\n    - ${(items as string[]).join("\n    - ")}`)
            .join("\n")
        : "  Не указана";

    const adherenceLabelMap: Record<number, string> = {
      0: "Почти не придерживался(ась)",
      1: "Иногда пропускал(а)",
      2: "В основном да",
      3: "Всегда",
    };
    const adherenceText =
      prescriptionAdherence && prescriptionAdherence.length > 0
        ? prescriptionAdherence
            .map((adh: any) => {
              const label = adherenceLabelMap[adh.adherence_level] || "Не указано";
              const date = new Date(adh.tracked_at).toLocaleDateString("ru-RU");
              const presc = adh.prescriptions?.prescription || "Не указано";
              return `  • ${presc} — Соблюдение: ${label} (${adh.adherence_level}/3), ${date}`;
            })
            .join("\n")
        : "  Данные о соблюдении назначений отсутствуют";

    const groupedSymptoms = (userSymptoms || []).reduce((acc: any, s: any) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(`${s.symptom} (${s.severity}/3)`);
      return acc;
    }, {} as Record<string, string[]>);
    const symptomsText =
      Object.keys(groupedSymptoms).length > 0
        ? Object.entries(groupedSymptoms)
            .map(([cat, items]) => `  ${cat}:\n    - ${(items as string[]).join("\n    - ")}`)
            .join("\n")
        : "  Симптомы не указаны";

    const userContext = `
ДАННЫЕ ПАЦИЕНТА:
Имя: ${profile?.name || "Не указано"}
Возраст: ${age || "Не указано"} лет
Пол: ${gender || "Не указано"}
Рост: ${profile?.height ? `${profile.height} см` : "Не указано"}
Вес: ${actualWeight ? `${actualWeight} кг` : "Не указано"}
BMI: ${bmi ? `${bmi}` : "Не рассчитан"}

МЕДИЦИНСКИЙ АНАМНЕЗ:
${medicalHistoryText}

ЖАЛОБЫ:
${
  complaints && complaints.length > 0
    ? complaints.map((c: any) => `- ${c.main_complaints || c.complaint || "Не указано"}`).join("\n")
    : "Не указаны"
}

СИМПТОМЫ:
${symptomsText}

СОБЛЮДЕНИЕ ПРЕДЫДУЩИХ НАЗНАЧЕНИЙ:
${adherenceText}
`.trim();

    // -------------------- Patient data section (saved as separate "Данные пациента" recommendation) --------------------
    const patientDataSection = `
# ДАННЫЕ ПАЦИЕНТА

## Персональная информация
- **Имя:** ${profile?.name || "Не указано"}
- **Возраст:** ${age || "Не указано"} лет
- **Пол:** ${gender === "male" ? "Мужской" : gender === "female" ? "Женский" : "Не указано"}
- **Рост:** ${profile?.height ? `${profile.height} см` : "Не указано"}
- **Вес:** ${actualWeight ? `${actualWeight} кг` : "Не указано"}
- **Индекс массы тела (BMI):** ${
      bmi
        ? `${bmi} ${
            Number(bmi) < 18.5
              ? "(недостаточный вес)"
              : Number(bmi) < 25
              ? "(норма)"
              : Number(bmi) < 30
              ? "(избыточный вес)"
              : "(ожирение)"
          }`
        : "Не рассчитан"
    }

## Медицинская история
${
  Object.keys(groupedMedicalHistory).length > 0
    ? Object.entries(groupedMedicalHistory)
        .map(
          ([cat, items]) =>
            `### ${cat}\n${(items as string[]).map((c) => `- ${c}`).join("\n")}`
        )
        .join("\n\n")
    : "Не указана"
}

## Жалобы
${
  complaints && complaints.length > 0
    ? complaints.map((c: any) => `- ${c.main_complaints || c.complaint || "Не указано"}`).join("\n")
    : "Не указаны"
}

## Дата анализа
${new Date(analysis.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
`.trim();

    await supabase.from("recommendations").insert({
      user_id: analysis.user_id,
      analysis_id: analysisId,
      type: "Данные пациента",
      text: patientDataSection,
    });
    console.log("Saved: Данные пациента");

    // -------------------- Group biomarkers by category --------------------
    const categorizedBiomarkers = analysis.analysis_values.reduce((acc: any, av: any) => {
      const category = av.biomarkers.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(av);
      return acc;
    }, {} as Record<string, any[]>);

    // Build name lookup: biomarker_id → name (for snapshot serialisation)
    const biomarkerNameMap = new Map<string, string>(
      analysis.analysis_values.map((av: any) => [av.biomarker_id as string, av.biomarkers.name as string])
    );

    // -------------------- Global biomarker summary (для cross-category context) --------------------
    const globalBiomarkersSummary = analysis.analysis_values
      .map((av: any) => {
        const r = resolveRanges(av, age, gender);
        const status = STATUS_EMOJI[resolveStatus(av.value, r)];
        const direction =
          (r.criticalMax !== null && av.value > r.criticalMax) || (r.normalMax !== null && av.value > r.normalMax)
            ? "ВЫШЕ НОРМЫ"
            : (r.criticalMin !== null && av.value < r.criticalMin) ||
              (r.normalMin !== null && av.value < r.normalMin)
            ? "НИЖЕ НОРМЫ"
            : "В НОРМЕ";
        return `- ${av.biomarkers.name} (${av.biomarkers.code}): ${av.value} ${av.biomarkers.unit} — ${status} ${direction} (норма: ${
          r.normalMin ?? "—"
        }–${r.normalMax ?? "—"}) [${av.biomarkers.category}]`;
      })
      .join("\n");

    const globalBiomarkersInstructions =
      prompts["global_biomarkers_instructions"] ||
      `ВАЖНО:
- НЕ рекомендуй сдавать анализы на биомаркеры из списка выше — ссылайся на их значения.
- ЗАПРЕТ ПРОТИВОРЕЧИЙ: прежде чем предположить дефицит вещества, проверь его в списке.
  Если маркер сдан и в норме — НЕЛЬЗЯ писать «возможен дефицит».`;

    const globalBiomarkersContext = `
ПОЛНЫЙ СПИСОК ВСЕХ СДАННЫХ БИОМАРКЕРОВ:
${globalBiomarkersSummary}

${globalBiomarkersInstructions}
`.trim();

    // -------------------- Critical guard (предотвращает реверс направления) --------------------
    const criticalGuardLines = analysis.analysis_values
      .map((av: any) => {
        const r = resolveRanges(av, age, gender);
        const isHigh = r.normalMax !== null && av.value > r.normalMax;
        const isLow = r.normalMin !== null && av.value < r.normalMin;
        if (!isHigh && !isLow) return null;
        const direction = isHigh ? "ВЫСОКАЯ" : "НИЗКАЯ";
        const anti = isHigh
          ? "НЕ ПИШИ что снижена/дефицит/недостаточность"
          : "НЕ ПИШИ что повышена/избыток/превышение";
        return `- ${av.biomarkers.name} (${av.biomarkers.code}): ${av.value} ${av.biomarkers.unit} — ${direction} (${
          isHigh ? `норма до ${r.normalMax}` : `норма от ${r.normalMin}`
        }). ${anti}.`;
      })
      .filter(Boolean);
    const criticalGuardBlock =
      criticalGuardLines.length > 0
        ? `\n⚠️ КРИТИЧЕСКИЕ ФАКТЫ — НЕ ПРОТИВОРЕЧЬ:\n${criticalGuardLines.join("\n")}\n`
        : "";

    // -------------------- Trend / previous recommendations helpers --------------------
    const getCategoryTrends = (category: string) => {
      if (!previousAnalyses || previousAnalyses.length === 0) return "Нет предыдущих анализов";
      const trends: string[] = [];
      previousAnalyses.forEach((pa: any) => {
        const prev = pa.analysis_values.filter((av: any) => av.biomarkers.category === category);
        if (prev.length > 0) {
          trends.push(`\nАнализ от ${new Date(pa.date).toLocaleDateString("ru-RU")}:`);
          prev.forEach((pv: any) =>
            trends.push(`  ${pv.biomarkers.name}: ${pv.value} ${pv.biomarkers.unit}`)
          );
        }
      });
      return trends.length > 0 ? trends.join("\n") : "Нет данных по этой категории ранее";
    };

    const getCategoryRecommendations = (category: string) => {
      if (!previousRecommendations || previousRecommendations.length === 0) return "Нет предыдущих рекомендаций";
      const relevant = previousRecommendations.filter(
        (r: any) => r.type === category || r.type === "Общее резюме"
      );
      return relevant.length > 0
        ? relevant.map((r: any) => `[${r.type}] ${(r.text || "").substring(0, 500)}...`).join("\n\n")
        : "Нет релевантных рекомендаций";
    };

    // =====================================================================
    // STAGE 1: ПАРАЛЛЕЛЬНАЯ ГЕНЕРАЦИЯ КАТЕГОРИЙ (JSON tool calls)
    // =====================================================================
    console.log(`Starting category generation for ${Object.keys(categorizedBiomarkers).length} categories`);

    const categoryBlocks: Record<string, any[]> = {};
    const categoryStatuses: Record<string, any> = {};
    let totalTokens = 0;

    const categoryPromises = Object.entries(categorizedBiomarkers).map(async ([category, biomarkers]) => {
      try {
        const expert = CATEGORY_EXPERTS[category];
        if (!expert) {
          console.warn(`No expert defined for category: ${category}`);
          categoryStatuses[category] = { success: false, error: "Нет специализации" };
          return;
        }

        // Build biomarker list with UUIDs (источник истины для AI)
        const biomarkersForAI = (biomarkers as any[]).map((bm: any) => {
          const r = resolveRanges(bm, age, gender);
          const status = resolveStatus(bm.value, r);
          return {
            biomarker_id: bm.biomarker_id,
            name: bm.biomarkers.name,
            code: bm.biomarkers.code,
            value: bm.value,
            unit: bm.unit_override || bm.biomarkers.unit,
            normal_range: `${r.normalMin ?? "—"}–${r.normalMax ?? "—"}`,
            optimal_range:
              r.optimalMin !== null || r.optimalMax !== null
                ? `${r.optimalMin ?? "—"}–${r.optimalMax ?? "—"}`
                : null,
            critical_range:
              r.criticalMin !== null || r.criticalMax !== null
                ? `${r.criticalMin ?? "—"}–${r.criticalMax ?? "—"}`
                : null,
            status: STATUS_EMOJI[status],
            description: bm.biomarkers.description || null,
          };
        });

        const categoryKey = CATEGORY_KEY_MAP[category] || category.toLowerCase().replace(/\s+/g, "_");
        const userPromptKey = `category_${categoryKey}_user`;
        const systemPromptKey = `category_${categoryKey}_system`;

        // System prompt + JSON-only directive
        const baseSystemPrompt =
          prompts[systemPromptKey] ||
          `Ты ${expert.role} с 20-летним опытом. Специализируешься на ${expert.specialization}.`;

        const jsonDirective = `

═══════════════════════════════════════════════════════════════
ФОРМАТ ОТВЕТА — СТРОГО ОБЯЗАТЕЛЬНО:
═══════════════════════════════════════════════════════════════
Ты ОБЯЗАН вернуть ответ ТОЛЬКО через вызов функции build_category_blocks.
НЕ пиши markdown в обычный текст. НЕ возвращай JSON в content.

Структура blocks (порядок ВАЖЕН):

1. ПЕРВЫЙ блок — section:
   { "type": "section", "title": "${category}", "emoji": "${expert.emoji || "📊"}" }

2. ВТОРОЙ блок — summary scope=category (краткое резюме 2-3 предложения):
   { "type": "summary", "scope": "category", "content": "Markdown-резюме..." }

3. Затем text-блоки с подробным разбором (системный анализ, риски, динамика, рекомендации).
   Каждый text — markdown, ОДИН логический раздел. Заголовки внутри — ## или ###.

4. Для КАЖДОГО переданного биомаркера — ОТДЕЛЬНЫЙ biomarker-блок:
   { "type": "biomarker", "biomarker_id": "<UUID-из-списка>", "commentary": "1-3 предложения клинической интерпретации" }
   ⚠️ biomarker_id — ТОЛЬКО UUID из переданного списка. Запрещено выдумывать.
   ⚠️ В commentary НЕ дублируй число/единицы — они подтянутся автоматически.
   ⚠️ commentary может быть пустой строкой, если нечего добавить.

5. Опционально — spacer между логическими блоками.

ЗАПРЕЩЕНО:
- type: "prescriptions" (это добавит система)
- type: "pagebreak"
- summary с scope: "overall" (это для финального резюме)
- biomarker_id, которого нет в переданном списке

Все markdown-выделения, эмодзи, списки — поддерживаются внутри content/commentary.`;

        const systemPrompt = baseSystemPrompt + jsonDirective;

        // User prompt — на основе шаблона из БД (но без markdown-формата ответа,
        // он теперь задаётся через tool calling схему).
        const userPromptTemplate =
          prompts[userPromptKey] ||
          `КОНТЕКСТ ПАЦИЕНТА:
{userContext}

БИОМАРКЕРЫ КАТЕГОРИИ "${category}" (используй ТОЛЬКО эти biomarker_id):
{biomarkersText}

ИСТОРИЧЕСКИЕ ТРЕНДЫ:
{trends}

ПРЕДЫДУЩИЕ РЕКОМЕНДАЦИИ:
{recommendations}

Дай развёрнутый клинический разбор: оценка показателей, системный анализ,
динамика, риски, конкретные рекомендации.`;

        let categoryUserPrompt = userPromptTemplate
          .replace(/{userContext}/g, userContext)
          .replace(/{category}/g, category)
          .replace(/{biomarkersText}/g, JSON.stringify(biomarkersForAI, null, 2))
          .replace(/{biomarkers}/g, JSON.stringify(biomarkersForAI, null, 2))
          .replace(/{trends}/g, getCategoryTrends(category))
          .replace(/{recommendations}/g, getCategoryRecommendations(category));

        if (categoryUserPrompt.includes("{globalBiomarkers}")) {
          categoryUserPrompt = categoryUserPrompt.replace(/{globalBiomarkers}/g, globalBiomarkersContext);
        } else {
          categoryUserPrompt += "\n\n" + globalBiomarkersContext;
        }
        if (criticalGuardBlock) categoryUserPrompt += "\n" + criticalGuardBlock;

        // -------------------- AI CALL with tool_choice --------------------
        const maxTokens = categoryKey === "metabolism" ? 24000 : 16000;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: categoryUserPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "build_category_blocks",
                  description: `Построить структурированные блоки отчёта для категории "${category}".`,
                  parameters: CATEGORY_BLOCKS_TOOL_SCHEMA,
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "build_category_blocks" } },
            max_completion_tokens: maxTokens,
          }),
        });

        if (response.status === 429) {
          categoryStatuses[category] = { success: false, error: "Rate limit exceeded" };
          console.error(`Rate limit for category ${category}`);
          return;
        }
        if (response.status === 402) {
          categoryStatuses[category] = { success: false, error: "Insufficient credits" };
          console.error(`Insufficient credits for category ${category}`);
          return;
        }
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI error for ${category}: ${errText}`);
        }

        const data = await response.json();
        const tokensUsed = data.usage?.total_tokens || 0;
        totalTokens += tokensUsed;

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) {
          throw new Error(`No tool_call in response for ${category}`);
        }

        let parsed: any;
        try {
          parsed = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          throw new Error(`Invalid JSON in tool_call for ${category}: ${e}`);
        }

        const rawBlocks: any[] = Array.isArray(parsed.blocks) ? parsed.blocks : [];

        // -------------------- VALIDATION + FALLBACK --------------------
        // 1) Filter blocks to allowed types
        // 2) Replace invalid biomarker_id with valid ones from category
        // 3) Ensure ALL category biomarkers are present (auto-append missing)
        const validUuids = new Set<string>(
          (biomarkers as any[]).map((bm: any) => bm.biomarker_id as string)
        );
        const allowedTypes = new Set(["section", "summary", "text", "biomarker", "spacer"]);

        const seenBiomarkerIds = new Set<string>();
        const cleanBlocks: any[] = [];

        for (const b of rawBlocks) {
          if (!b || typeof b !== "object" || !allowedTypes.has(b.type)) continue;

          if (b.type === "biomarker") {
            if (!b.biomarker_id || !validUuids.has(b.biomarker_id)) {
              console.warn(`Skipping invalid biomarker_id in ${category}: ${b.biomarker_id}`);
              continue;
            }
            if (seenBiomarkerIds.has(b.biomarker_id)) continue;
            seenBiomarkerIds.add(b.biomarker_id);
            cleanBlocks.push({
              type: "biomarker",
              biomarker_id: b.biomarker_id,
              commentary: typeof b.commentary === "string" ? b.commentary : "",
            });
          } else if (b.type === "section") {
            cleanBlocks.push({
              type: "section",
              title: typeof b.title === "string" && b.title.trim() ? b.title : category,
              emoji: typeof b.emoji === "string" ? b.emoji : expert.emoji || "📊",
            });
          } else if (b.type === "summary") {
            const content = typeof b.content === "string" ? b.content.trim() : "";
            if (!content) continue;
            cleanBlocks.push({ type: "summary", scope: "category", content });
          } else if (b.type === "text") {
            const content = typeof b.content === "string" ? b.content.trim() : "";
            if (!content) continue;
            cleanBlocks.push({ type: "text", content });
          } else if (b.type === "spacer") {
            const size = ["small", "medium", "large"].includes(b.size) ? b.size : "medium";
            cleanBlocks.push({ type: "spacer", size });
          }
        }

        // Ensure section is first
        if (cleanBlocks.length === 0 || cleanBlocks[0].type !== "section") {
          cleanBlocks.unshift({ type: "section", title: category, emoji: expert.emoji || "📊" });
        }

        // Auto-append missing biomarkers (every marker MUST appear)
        for (const bm of biomarkers as any[]) {
          if (!seenBiomarkerIds.has(bm.biomarker_id)) {
            console.warn(`Auto-appending missing biomarker ${bm.biomarkers.code} (${bm.biomarker_id}) in ${category}`);
            cleanBlocks.push({
              type: "biomarker",
              biomarker_id: bm.biomarker_id,
              commentary: "",
            });
          }
        }

        categoryBlocks[category] = cleanBlocks;
        categoryStatuses[category] = {
          success: true,
          tokens: tokensUsed,
          blocks: cleanBlocks.length,
          biomarkers: seenBiomarkerIds.size,
        };

        // Save markdown serialisation as backup `text` for THIS category
        // (так админ сможет редактировать через текстовый редактор как backup view)
        const categoryText = serializeSnapshotToText({ blocks: cleanBlocks }, biomarkerNameMap);
        await supabase.from("recommendations").insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          type: category,
          text: categoryText,
        });
        console.log(`Saved category: ${category} (${cleanBlocks.length} blocks, ${tokensUsed} tokens)`);
      } catch (error: any) {
        console.error(`Error in category ${category}:`, error);
        categoryStatuses[category] = { success: false, error: error.message };
      }
    });

    await Promise.all(categoryPromises);

    // =====================================================================
    // STAGE 2: PRESCRIPTIONS (отдельный AI tool_call)
    // =====================================================================
    console.log("All categories done. Generating prescriptions...");

    let prescriptionsCreated = 0;
    let prescriptionsStatus = "skipped";
    let prescriptionsToCreateFinal: Array<{
      name: string;
      form: string;
      dosage: string;
      how_to_take: string;
      duration: string;
      prescription: string;
      reason: string;
      effect: string;
      duration_months: number;
    }> = [];

    try {
      const prescPromptSystem = prompts["prescriptions_system"];
      const prescPromptUser = prompts["prescriptions_user"];

      if (!prescPromptSystem || !prescPromptUser) {
        console.log("Prescriptions prompts not found — skipping");
      } else {
        const abnormalBiomarkers = analysis.analysis_values
          .filter((av: any) => {
            const r = resolveRanges(av, age, gender);
            const status = resolveStatus(av.value, r);
            return status === "risk" || status === "critical";
          })
          .map((av: any) => {
            const r = resolveRanges(av, age, gender);
            const status = resolveStatus(av.value, r);
            return `${av.biomarkers.name}: ${av.value} ${av.biomarkers.unit} (норма: ${
              r.normalMin ?? "?"
            }-${r.normalMax ?? "?"}) — ${STATUS_EMOJI[status]}`;
          })
          .join("\n");

        // Build a compact textual summary of category insights
        const keyFindings = Object.entries(categoryBlocks)
          .map(([cat, blocks]) => {
            const summary = blocks.find((b: any) => b.type === "summary")?.content || "";
            return `${cat}: ${summary.substring(0, 1500)}`;
          })
          .join("\n\n");

        const prescUserPrompt = prescPromptUser
          .replace("{userContext}", userContext)
          .replace("{keyFindings}", keyFindings)
          .replace("{abnormalBiomarkers}", abnormalBiomarkers || "Все показатели в пределах нормы")
          .replace("{allBiomarkers}", globalBiomarkersSummary)
          .replace("{categoryRecommendations}", keyFindings || "Нет извлечённых рекомендаций");

        const prescResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  prescPromptSystem +
                  "\n\nВажно: верни ТОЛЬКО валидный JSON в формате {\"prescriptions\": [{\"name\":\"...\",\"form\":\"...\",\"dosage\":\"...\",\"how_to_take\":\"...\",\"duration\":\"...\",\"prescription\":\"...\",\"reason\":\"...\",\"effect\":\"...\",\"duration_months\":число}]}. Никакого дополнительного текста.",
              },
              { role: "user", content: prescUserPrompt },
            ],
          }),
        });

        if (prescResponse.ok) {
          const prescData = await prescResponse.json();
          const content = prescData.choices?.[0]?.message?.content || "";
          totalTokens += prescData.usage?.total_tokens || 0;
          try {
            const jsonStart = content.indexOf("{");
            const jsonEnd = content.lastIndexOf("}") + 1;
            if (jsonStart === -1 || jsonEnd <= jsonStart) throw new Error("No JSON in response");
            const parsed = JSON.parse(content.substring(jsonStart, jsonEnd));
            prescriptionsToCreateFinal = (parsed.prescriptions || [])
              .filter((p: any) => (p.name || p.prescription) && (p.name || p.prescription).trim())
              .map((p: any) => ({
                name: (p.name || "").trim().substring(0, 500),
                form: (p.form || "").trim().substring(0, 500),
                dosage: (p.dosage || "").trim().substring(0, 500),
                how_to_take: (p.how_to_take || "").trim().substring(0, 1000),
                duration: (p.duration || "").trim().substring(0, 500),
                prescription: (p.prescription || p.name || "").trim().substring(0, 5000),
                reason: (p.reason || "").trim().substring(0, 2000),
                effect: (p.effect || "").trim().substring(0, 5000),
                duration_months: [1, 2, 3, 4, 6].includes(p.duration_months) ? p.duration_months : 3,
              }));
            console.log(`Parsed ${prescriptionsToCreateFinal.length} prescriptions`);
            prescriptionsStatus = "success";
          } catch (e) {
            console.error("Failed to parse prescriptions JSON:", e, "Content:", content);
            prescriptionsStatus = "error";
          }
        } else {
          const errText = await prescResponse.text();
          console.error("Prescriptions API error:", prescResponse.status, errText);
          prescriptionsStatus = "error";
        }
      }
    } catch (error: any) {
      console.error("Error generating prescriptions:", error);
      prescriptionsStatus = "error";
    }

    // =====================================================================
    // STAGE 3: OVERALL SUMMARY (AI tool_call)
    // =====================================================================
    console.log("Generating overall summary...");

    let overallSummaryContent = "";
    try {
      const summarySystemPromptDb = prompts["summary_system"];
      const summaryUserPromptDb = prompts["summary_user"];

      if (!summarySystemPromptDb || !summaryUserPromptDb) {
        throw new Error("Summary prompts not found in DB");
      }

      const allCategorySummaries = Object.entries(categoryBlocks)
        .map(([cat, blocks]) => {
          const summary = blocks.find((b: any) => b.type === "summary")?.content || "";
          const texts = blocks
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.content)
            .join("\n\n");
          return `### ${cat}\nКраткое резюме: ${summary}\n\nКлючевые тексты:\n${texts.substring(0, 4000)}`;
        })
        .join("\n\n---\n\n");

      const prescriptionsList =
        prescriptionsToCreateFinal.length > 0
          ? prescriptionsToCreateFinal.map((p, i) => `${i + 1}. ${p.prescription} — ${p.reason}`).join("\n")
          : "Назначения не сгенерированы";

      const summaryUserPrompt = summaryUserPromptDb
        .replace(/{userContext}/g, userContext)
        .replace(/{allReportsText}/g, allCategorySummaries)
        .replace(/{globalBiomarkers}/g, globalBiomarkersSummary)
        .replace(/{categoryRecommendations}/g, allCategorySummaries)
        .replace(/{prescriptionsList}/g, prescriptionsList);

      const summaryDirective = `

═══════════════════════════════════════════════════════════════
ФОРМАТ ОТВЕТА — СТРОГО ОБЯЗАТЕЛЬНО:
═══════════════════════════════════════════════════════════════
Верни ответ ТОЛЬКО через вызов функции build_overall_summary.
Поле content — markdown-резюме всего отчёта (2-4 абзаца).
БЕЗ заголовков категорий, БЕЗ списка биомаркеров — только синтез ключевых выводов и приоритетов.`;

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: summarySystemPromptDb + summaryDirective },
            { role: "user", content: summaryUserPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "build_overall_summary",
                description: "Построить общее резюме отчёта.",
                parameters: OVERALL_SUMMARY_TOOL_SCHEMA,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "build_overall_summary" } },
          max_completion_tokens: 8000,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        totalTokens += summaryData.usage?.total_tokens || 0;
        const toolCall = summaryData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          overallSummaryContent = (parsed.content || "").trim();
        }
      } else {
        const errText = await summaryResponse.text();
        console.error("Summary API error:", summaryResponse.status, errText);
      }
    } catch (error: any) {
      console.error("Error generating overall summary:", error);
    }

    if (!overallSummaryContent) {
      overallSummaryContent =
        "Не удалось сгенерировать общее резюме. Подробности — в категорийных разделах ниже.";
    }

    // =====================================================================
    // STAGE 4: СБОРКА ФИНАЛЬНОГО SNAPSHOT
    // =====================================================================
    const snapshotBlocks: any[] = [];

    // 1) Overall summary первым
    snapshotBlocks.push({
      type: "section",
      title: "Общее резюме",
      emoji: "🎯",
    });
    snapshotBlocks.push({
      type: "summary",
      scope: "overall",
      content: overallSummaryContent,
    });
    snapshotBlocks.push({ type: "spacer", size: "large" });

    // 2) Категории — в стабильном порядке (display_order из БД)
    for (const category of CATEGORY_ORDER) {
      const blocks = categoryBlocks[category];
      if (!blocks || blocks.length === 0) continue;
      snapshotBlocks.push(...blocks);
      snapshotBlocks.push({ type: "spacer", size: "large" });
    }

    // 3) Категории, которых нет в CATEGORY_ORDER (legacy/missed)
    for (const [category, blocks] of Object.entries(categoryBlocks)) {
      if (CATEGORY_ORDER.includes(category)) continue;
      if (!blocks || blocks.length === 0) continue;
      snapshotBlocks.push(...blocks);
      snapshotBlocks.push({ type: "spacer", size: "large" });
    }

    // 4) Назначения — ВСЕГДА в самом конце (только если они есть)
    if (prescriptionsToCreateFinal.length > 0) {
      snapshotBlocks.push({ type: "prescriptions", title: "Назначения" });
    }

    const finalSnapshot = {
      version: 1 as const,
      blocks: snapshotBlocks,
      meta: {
        generated_at: new Date().toISOString(),
        model: "google/gemini-2.5-flash",
        analysis_id: analysisId,
      },
    };

    // Сериализация для legacy text-поля (только для админ-редактора)
    const summaryText = serializeSnapshotToText(finalSnapshot, biomarkerNameMap);

    // Сохраняем ОДНУ запись типа "snapshot" с полным ReportSnapshot.
    // Это единственная запись recommendations на анализ — единый источник истины.
    // Поле text хранит markdown-сериализацию для админ-редактора (back-up view).
    const { data: summaryInserted, error: summaryInsertError } = await supabase
      .from("recommendations")
      .insert({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        type: "snapshot",
        text: summaryText,
        // @ts-ignore content_json column type may lag
        content_json: finalSnapshot,
      })
      .select("id")
      .single();

    if (summaryInsertError) {
      console.error("Failed to save final snapshot:", summaryInsertError.message);
    } else {
      console.log(
        `Saved final snapshot to recommendation ${summaryInserted?.id} (${snapshotBlocks.length} blocks)`
      );
    }

    const prescriptionRecommendationId = summaryInserted?.id || null;

    // =====================================================================
    // STAGE 5: PERSIST PRESCRIPTIONS to prescriptions table
    // =====================================================================
    if (prescriptionsToCreateFinal.length > 0) {
      const analysisDate = new Date(analysis.date);
      for (const presc of prescriptionsToCreateFinal) {
        const controlDate = new Date(analysisDate);
        controlDate.setMonth(controlDate.getMonth() + presc.duration_months);
        const { error: prescErr } = await supabase.from("prescriptions").insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          recommendation_id: prescriptionRecommendationId,
          name: presc.name || null,
          form: presc.form || null,
          dosage: presc.dosage || null,
          how_to_take: presc.how_to_take || null,
          duration: presc.duration || null,
          prescription: presc.prescription,
          reason: presc.reason,
          effect: presc.effect,
          control_date: controlDate.toISOString().split("T")[0],
          status: "on_review",
          is_archived: false,
          created_by: null,
        });
        if (prescErr) {
          console.error("Error creating prescription:", prescErr);
        } else {
          prescriptionsCreated++;
        }
      }
      console.log(`Created ${prescriptionsCreated} prescriptions`);
    }

    // =====================================================================
    // STAGE 6: HEALTH INDEX + BIOLOGICAL AGE (без изменений)
    // =====================================================================

    function buildCompositeBiomarkers(currentAnalysis: any, prevAnalyses: any[], windowMonths = 4) {
      const currentDate = new Date(currentAnalysis.date);
      const windowStartDate = new Date(currentDate);
      windowStartDate.setMonth(windowStartDate.getMonth() - windowMonths);

      const biomarkerMap = new Map();
      currentAnalysis.analysis_values.forEach((av: any) => {
        biomarkerMap.set(av.biomarker_id, { ...av, source: "current", analysis_date: currentAnalysis.date });
      });

      const relevantPrev = prevAnalyses
        .filter((a) => new Date(a.date) >= windowStartDate && new Date(a.date) < currentDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      relevantPrev.forEach((pa) => {
        pa.analysis_values?.forEach((av: any) => {
          if (!biomarkerMap.has(av.biomarker_id)) {
            biomarkerMap.set(av.biomarker_id, { ...av, source: "historical", analysis_date: pa.date });
          }
        });
      });

      const compositeValues = Array.from(biomarkerMap.values());
      return {
        values: compositeValues,
        metadata: {
          total_count: compositeValues.length,
          current_count: compositeValues.filter((v) => v.source === "current").length,
          historical_count: compositeValues.filter((v) => v.source === "historical").length,
          window_months: windowMonths,
        },
      };
    }

    function calculateHealthIndex(
      values: any[],
      patientAge: number | null,
      patientGender: "male" | "female" | null,
      totalBiomarkersInSystem: number,
      patientBMI: number | null = null
    ) {
      let totalPenalty = 0;
      const penalties: any[] = [];

      for (const av of values) {
        const r = resolveRanges(av, patientAge, patientGender);
        if (r.normalMin === null && r.normalMax === null) continue;
        if (r.normalMin !== null && r.normalMax !== null && r.normalMax - r.normalMin <= 0) continue;

        const agingWeight = av.biomarkers.aging_weight || 1.0;
        const status = resolveStatus(av.value, r);
        let penalty = 0;
        if (status === "critical") penalty = 15 * agingWeight;
        else if (status === "risk") penalty = 5 * agingWeight;
        else if (status === "acceptable") penalty = 1 * agingWeight;

        totalPenalty += penalty;
        if (penalty > 0) {
          penalties.push({
            name: av.biomarkers.name,
            code: av.biomarkers.code,
            tier: status,
            penalty,
            weight: agingWeight,
          });
        }
      }

      let bmiMarkerAdded = false;
      if (patientBMI !== null) {
        const bmiWeight = 5.0;
        let bmiPenalty = 0;
        let bmiTier = "optimal";
        if (patientBMI > 30 || patientBMI < 16) {
          bmiPenalty = 15 * bmiWeight;
          bmiTier = "critical";
        } else if (patientBMI > 27 || patientBMI < 17) {
          bmiPenalty = 5 * bmiWeight;
          bmiTier = "risk";
        } else if (patientBMI > 25 || patientBMI < 18.5) {
          bmiPenalty = 1 * bmiWeight;
          bmiTier = "acceptable";
        }
        totalPenalty += bmiPenalty;
        bmiMarkerAdded = true;
        if (bmiPenalty > 0) {
          penalties.push({
            name: "Индекс массы тела",
            code: "BMI",
            tier: bmiTier,
            penalty: bmiPenalty,
            weight: bmiWeight,
          });
        }
      }

      const markerCount =
        values.filter((av) => {
          const r = resolveRanges(av, patientAge, patientGender);
          if (r.normalMin === null && r.normalMax === null) return false;
          if (r.normalMin !== null && r.normalMax !== null && r.normalMax - r.normalMin <= 0) return false;
          return true;
        }).length + (bmiMarkerAdded ? 1 : 0);

      if (markerCount === 0) {
        return { raw: 70, adjusted: 70, coverage: 0, confidenceFactor: 0, penalties: [] };
      }

      const avgPenalty = totalPenalty / markerCount;
      const rawHealthIndex = Math.max(0, Math.min(100, 100 - avgPenalty * 15));
      const coverage = markerCount / totalBiomarkersInSystem;
      const confidenceFactor = Math.min(1.0, coverage / 0.5);

      return {
        raw: Math.round(rawHealthIndex * 10) / 10,
        adjusted: Math.round(rawHealthIndex * 10) / 10,
        coverage: Math.round(coverage * 100),
        confidenceFactor: Math.round(confidenceFactor * 100) / 100,
        penalties: penalties.sort((a, b) => b.penalty - a.penalty).slice(0, 10),
      };
    }

    function calculateBaseBioAge(chronoAge: number, healthIdx: number): number {
      return chronoAge + (70 - healthIdx) * 0.15;
    }

    const compositeBiomarkers = buildCompositeBiomarkers(analysis, previousAnalyses || [], 4);
    let health_index: number | null = null;
    let biological_age: number | null = null;
    let biomarkers_metadata: any = null;

    if (compositeBiomarkers.values.length > 0) {
      // Plan-based coverage
      let planBiomarkersCount: number | null = null;
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", analysis.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (subscription?.plan_id) {
        const { count } = await supabase
          .from("plan_biomarkers")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", subscription.plan_id);
        if (count && count > 0) planBiomarkersCount = count;
      }

      const totalBiomarkersForCoverage = planBiomarkersCount || compositeBiomarkers.values.length;
      const patientBMI = bmi ? Number(bmi) : null;
      const healthResult = calculateHealthIndex(
        compositeBiomarkers.values,
        age,
        gender,
        totalBiomarkersForCoverage,
        patientBMI
      );

      health_index = Math.round(healthResult.adjusted);

      const chronoAge = age;
      if (chronoAge) {
        const baseBioAge = calculateBaseBioAge(chronoAge, health_index);

        // AI-driven ±3 year adjustment
        try {
          const biomarkersForAI = compositeBiomarkers.values.map((av: any) => {
            const r = resolveRanges(av, age, gender);
            return {
              name: av.biomarkers.name,
              code: av.biomarkers.code,
              category: av.biomarkers.category,
              value: av.value,
              unit: av.unit_override || av.biomarkers.unit,
              normal_min: r.normalMin,
              normal_max: r.normalMax,
              aging_weight: av.biomarkers.aging_weight || 1.0,
              source: av.source,
              analysis_date: av.analysis_date,
            };
          });

          const previousAnalysesForAI = (previousAnalyses || []).slice(0, 3).map((pa) => ({
            date: pa.date,
            biological_age: pa.biological_age,
            health_index: pa.health_index,
            biomarkers_count: pa.analysis_values?.length || 0,
          }));

          const symptomsForAI = (userSymptoms || []).slice(0, 10).map((s) => ({
            category: s.category,
            symptom: s.symptom,
            severity: s.severity,
          }));

          const categoriesList = (biomarkerCategoriesData || [])
            .map((c) => `${c.emoji} ${c.name}`)
            .join("\n");

          const systemPrompt = prompts["biological_age_system"] || "Ты эксперт по биомаркерам старения.";
          const userPrompt = (prompts["biological_age_user"] ||
            `Рассчитай биологический возраст для пациента {chronologicalAge} лет, пол {gender}.\nБиомаркеры: {biomarkersData}`)
            .replace(/{chronologicalAge}/g, String(chronoAge))
            .replace(/{gender}/g, gender || "не указан")
            .replace(/{biomarkersData}/g, JSON.stringify(biomarkersForAI, null, 2))
            .replace(
              /{previousAnalysesData}/g,
              previousAnalysesForAI.length > 0 ? JSON.stringify(previousAnalysesForAI, null, 2) : "Нет"
            )
            .replace(
              /{symptomsData}/g,
              symptomsForAI.length > 0 ? JSON.stringify(symptomsForAI, null, 2) : "Не указаны"
            )
            .replace(/{categoriesList}/g, categoriesList);

          const aiConstraintPrompt = `

КРИТИЧЕСКОЕ ОГРАНИЧЕНИЕ:
Серверный base_bio_age = ${baseBioAge.toFixed(1)} (math: chronological_age + (70 - health_index) * 0.15)
Скорректируй biological_age в [${(baseBioAge - 3).toFixed(1)}, ${(baseBioAge + 3).toFixed(1)}] (±3 года).
health_index ДОЛЖЕН быть = ${health_index} (серверное значение).`;

          const categoryScoresProperties = (biomarkerCategoriesData || []).reduce((acc, cat) => {
            acc[cat.name] = {
              type: "object",
              properties: {
                score: { type: "integer", description: "0-100" },
                impact: { type: "string", enum: ["low", "moderate", "high"] },
                key_markers: { type: "array", items: { type: "string" } },
              },
            };
            return acc;
          }, {} as Record<string, any>);

          const categoryScoresRequired = (biomarkerCategoriesData || []).map((c) => c.name);

          const bioAgeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              temperature: 0,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt + aiConstraintPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "calculate_biological_age",
                    description: "Скорректировать биологический возраст в пределах ±3 года",
                    parameters: {
                      type: "object",
                      properties: {
                        biological_age: { type: "number" },
                        confidence_score: { type: "integer" },
                        aging_rate: { type: "number" },
                        health_index: { type: "integer" },
                        category_scores: {
                          type: "object",
                          properties: categoryScoresProperties,
                          required: categoryScoresRequired,
                        },
                        key_aging_markers: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              value: { type: "number" },
                              normal_max: { type: "number" },
                              deviation: { type: "string" },
                              impact: { type: "string", enum: ["low", "moderate", "high"] },
                              reason: { type: "string" },
                            },
                            required: ["name", "value", "impact", "reason"],
                          },
                        },
                        missing_critical_markers: { type: "array", items: { type: "string" } },
                        explanation: { type: "string" },
                      },
                      required: [
                        "biological_age",
                        "confidence_score",
                        "health_index",
                        "category_scores",
                        "key_aging_markers",
                        "explanation",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "calculate_biological_age" } },
            }),
          });

          if (!bioAgeResponse.ok) throw new Error("AI bio age call failed");
          const bioAgeData = await bioAgeResponse.json();
          totalTokens += bioAgeData.usage?.total_tokens || 0;
          const toolCall = bioAgeData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const aiResult = JSON.parse(toolCall.function.arguments);
            let aiBioAge = aiResult.biological_age;
            aiBioAge = Math.max(baseBioAge - 3, Math.min(baseBioAge + 3, aiBioAge));
            aiBioAge = Math.max(chronoAge - 15, Math.min(chronoAge + 15, aiBioAge));
            biological_age = Math.round(aiBioAge * 10) / 10;

            biomarkers_metadata = {
              ...compositeBiomarkers.metadata,
              server_calculation: {
                raw_health_index: healthResult.raw,
                adjusted_health_index: healthResult.adjusted,
                base_bio_age: Math.round(baseBioAge * 10) / 10,
                coverage_percent: healthResult.coverage,
                confidence_factor: healthResult.confidenceFactor,
                top_penalties: healthResult.penalties.slice(0, 5),
                formula_coefficient: 0.15,
              },
              ai_analysis: {
                ai_bio_age_raw: aiResult.biological_age,
                ai_adjustment: Math.round((biological_age - baseBioAge) * 10) / 10,
                confidence_score: aiResult.confidence_score,
                aging_rate: aiResult.aging_rate,
                category_scores: aiResult.category_scores,
                key_aging_markers: aiResult.key_aging_markers,
                missing_critical_markers: aiResult.missing_critical_markers,
                explanation: aiResult.explanation,
                calculated_at: new Date().toISOString(),
                temperature: 0,
              },
            };
            console.log(`Final bio age: ${biological_age} (base: ${baseBioAge.toFixed(1)})`);
          }
        } catch (e) {
          console.error("AI bio age adjustment error:", e);
          biological_age = Math.round(baseBioAge * 10) / 10;
          biomarkers_metadata = {
            ...compositeBiomarkers.metadata,
            server_calculation: {
              raw_health_index: healthResult.raw,
              adjusted_health_index: healthResult.adjusted,
              base_bio_age: Math.round(baseBioAge * 10) / 10,
              coverage_percent: healthResult.coverage,
              confidence_factor: healthResult.confidenceFactor,
              top_penalties: healthResult.penalties.slice(0, 5),
            },
            calculation_method: "server_only_fallback",
            error: String(e),
          };
        }
      }
    }

    // Save bio age + health index to analyses
    await supabase
      .from("analyses")
      .update({ health_index, biological_age, biomarkers_metadata })
      .eq("id", analysisId);

    const estimatedCostCredits = (totalTokens / 50000).toFixed(2);
    console.log(`Analysis completed. Total tokens: ${totalTokens}, Cost: ${estimatedCostCredits} credits`);

    return new Response(
      JSON.stringify({
        success: true,
        health_index,
        biological_age,
        categories_processed: categoryStatuses,
        snapshot_blocks: snapshotBlocks.length,
        total_tokens: totalTokens,
        estimated_cost_credits: estimatedCostCredits,
        prescriptions_created: prescriptionsCreated,
        prescriptions_status: prescriptionsStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-biomarkers:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
