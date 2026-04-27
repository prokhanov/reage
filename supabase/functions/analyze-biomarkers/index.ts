import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded CATEGORY_EXPERTS removed - now loaded from database

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: {
    analysisId?: string;
    mode?: unknown;
    background?: boolean;
    categoryFilter?: string[];
    skipPrescriptions?: boolean;
    skipFinalize?: boolean;
    skipDelete?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Некорректный JSON запроса" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.analysisId) {
    return new Response(JSON.stringify({ success: false, error: "Не указан ID анализа" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";

  // Когда оркестратор передаёт categoryFilter — обрабатываем только эти категории
  // (один шаг pipeline = один HTTP-вызов = свой 400-секундный бюджет воркера).
  // В этом режиме НЕ удаляем старые записи (это делает orchestrator на старте задачи)
  // и НЕ запускаем prescriptions/finalize (их запускает orchestrator отдельными шагами).
  const isStepRequest = Array.isArray(body.categoryFilter) && body.categoryFilter.length > 0;

  // Старый deep-режим без фильтра: оставляем background-схему для обратной совместимости.
  if (mode === "deep" && !body.background && !isStepRequest) {
    const analysisId = body.analysisId!;
    const runPromise = processAnalysis({ analysisId, rawMode: mode })
      .then(async (response) => {
        try {
          const text = await response.text();
          console.log(`Deep analysis background finished: status=${response.status}, body=${text.slice(0, 500)}`);
        } catch (err) {
          console.error("Deep analysis: failed to read background response body", err);
        }
      })
      .catch((error) => console.error("Deep analysis background failed:", error));

    const edgeRuntime = globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
    };

    if (edgeRuntime.EdgeRuntime?.waitUntil) {
      edgeRuntime.EdgeRuntime.waitUntil(runPromise);
    } else {
      void runPromise;
    }

    return new Response(
      JSON.stringify({ success: true, accepted: true, mode, analysisId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Step-режим (под управлением orchestrator) или standard — выполняем синхронно и возвращаем результат.
  return processAnalysis({
    analysisId: body.analysisId,
    rawMode: body.mode,
    categoryFilter: body.categoryFilter,
    skipPrescriptions: body.skipPrescriptions,
    skipFinalize: body.skipFinalize,
    skipDelete: body.skipDelete,
  });
});

async function processAnalysis({
  analysisId,
  rawMode,
  categoryFilter,
  skipPrescriptions,
  skipFinalize,
  skipDelete,
}: {
  analysisId: string;
  rawMode?: unknown;
  categoryFilter?: string[];
  skipPrescriptions?: boolean;
  skipFinalize?: boolean;
  skipDelete?: boolean;
}) {
  try {
    // ===== Режим генерации: standard (быстрее, дефолт) | deep (качественнее, медленнее) =====
    const mode: "standard" | "deep" = rawMode === "deep" ? "deep" : "standard";
    const aiProfile = mode === "deep"
      ? {
          model: "google/gemini-2.5-pro",
          reasoning: { effort: "high" as const },
          tokenMultiplier: 1.25,
          maxRetries: 2,
        }
      : {
          model: "google/gemini-2.5-flash",
          reasoning: undefined as undefined | { effort: "high" },
          tokenMultiplier: 1,
          maxRetries: 2,
        };
    console.log(`AI generation mode: ${mode} (model=${aiProfile.model}, reasoning=${aiProfile.reasoning?.effort ?? "none"})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Не настроены переменные окружения");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load biomarker categories from database
    const { data: biomarkerCategoriesData } = await supabase
      .from("biomarker_categories")
      .select("*")
      .order("display_order");

    // Build category experts object from database
    const CATEGORY_EXPERTS = (biomarkerCategoriesData || []).reduce((acc, cat) => {
      acc[cat.name] = {
        role: cat.expert_role,
        specialization: cat.expert_specialization
      };
      return acc;
    }, {} as Record<string, { role: string; specialization: string }>);

    console.log(`Loaded ${Object.keys(CATEGORY_EXPERTS).length} category experts from database`);

    // Загружаем промпты из БД
    const { data: promptSettings } = await supabase
      .from("ai_prompt_settings")
      .select("*");

    // Создаём словарь для быстрого доступа к промптам
    const prompts = (promptSettings || []).reduce((acc, p) => {
      acc[p.key] = p.prompt_text;
      return acc;
    }, {} as Record<string, string>);

    console.log(`Loaded ${Object.keys(prompts).length} prompts from database`);

    // Маппинг русских названий категорий на английские ключи
    const CATEGORY_KEY_MAP: Record<string, string> = {
      "Энергия и восстановление": "energy",
      "Сердечно-сосудистая система": "cardiovascular",
      "Воспалительная и иммунная система": "inflammation",
      "Эндокринная и стрессовая система": "endocrine",
      "Метаболизм и Детоксикация": "metabolism",
      // Legacy keys (для совместимости со старыми анализами)
      "Обмен веществ и детоксикация": "metabolism",
      "Почки и водно-солевой баланс": "metabolism"
    };

    // Получаем анализ с биомаркерами
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select(`
        *,
        analysis_values (
          *,
          biomarkers (*)
        )
      `)
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Анализ не найден");
    }

    // Удаляем старые рекомендации и назначения перед генерацией новых
    // (только если это полный запуск, не step-режим оркестратора)
    if (!skipDelete) {
      const { error: deletePrescsError } = await supabase
        .from("prescriptions")
        .delete()
        .eq("analysis_id", analysisId);

      if (deletePrescsError) {
        console.warn("Failed to delete old prescriptions:", deletePrescsError.message);
      }

      const { error: deleteRecsError } = await supabase
        .from("recommendations")
        .delete()
        .eq("analysis_id", analysisId);

      if (deleteRecsError) {
        console.warn("Failed to delete old recommendations:", deleteRecsError.message);
      }
    }

    // Сохраняем "Данные пациента" сразу (чтобы клиент видел прогресс)
    // Будет вставлен ниже после формирования patientDataSection

    // Получаем профиль пользователя и последний вес из weight_history
    const [{ data: profile }, { data: latestWeightRecord }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", analysis.user_id).single(),
      supabase.from("weight_history").select("weight").eq("user_id", analysis.user_id).order("measured_at", { ascending: false }).limit(1).single()
    ]);

    // Актуальный вес: приоритет weight_history, fallback на profiles.weight
    const actualWeight = latestWeightRecord?.weight ? Number(latestWeightRecord.weight) : (profile?.weight ? Number(profile.weight) : null);

    // Получаем медицинскую историю
    const { data: medicalHistory } = await supabase
      .from("medical_history")
      .select("*")
      .eq("user_id", analysis.user_id);

    // Получаем жалобы пользователя
    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("user_id", analysis.user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Получаем предыдущие анализы для трендов
    const { data: previousAnalyses } = await supabase
      .from("analyses")
      .select(`
        *,
        analysis_values (
          *,
          biomarkers (*)
        )
      `)
      .eq("user_id", analysis.user_id)
      .lt("date", analysis.date)
      .order("date", { ascending: false })
      .limit(5);

    // Функция для создания композитного набора биомаркеров (накопительный подход)
    function buildCompositeBiomarkers(
      currentAnalysis: any,
      previousAnalyses: any[],
      windowMonths: number = 4
    ) {
      const currentDate = new Date(currentAnalysis.date);
      const windowStartDate = new Date(currentDate);
      windowStartDate.setMonth(windowStartDate.getMonth() - windowMonths);

      // Карта: biomarker_id -> {value, date, unit, source}
      const biomarkerMap = new Map();

      // 1. Сначала добавляем биомаркеры из текущего анализа (высший приоритет)
      currentAnalysis.analysis_values.forEach((av: any) => {
        biomarkerMap.set(av.biomarker_id, {
          ...av,
          source: 'current',
          analysis_date: currentAnalysis.date
        });
      });

      // 2. Затем добавляем биомаркеры из предыдущих анализов (если их нет в текущем)
      const relevantPreviousAnalyses = previousAnalyses
        .filter(a => new Date(a.date) >= windowStartDate && new Date(a.date) < currentDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // От новых к старым

      relevantPreviousAnalyses.forEach(prevAnalysis => {
        prevAnalysis.analysis_values?.forEach((av: any) => {
          // Добавляем только если этого биомаркера нет в текущем анализе
          if (!biomarkerMap.has(av.biomarker_id)) {
            biomarkerMap.set(av.biomarker_id, {
              ...av,
              source: 'historical',
              analysis_date: prevAnalysis.date
            });
          }
        });
      });

      const compositeValues = Array.from(biomarkerMap.values());
      const currentCount = compositeValues.filter(v => v.source === 'current').length;
      const historicalCount = compositeValues.filter(v => v.source === 'historical').length;
      const oldestDate = historicalCount > 0 
        ? compositeValues
            .filter(v => v.source === 'historical')
            .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())[0]?.analysis_date
        : null;

      return {
        values: compositeValues,
        metadata: {
          total_count: compositeValues.length,
          current_count: currentCount,
          historical_count: historicalCount,
          oldest_historical_date: oldestDate,
          window_months: windowMonths
        }
      };
    }

    // Получаем предыдущие рекомендации (исключая текущий анализ)
    const { data: previousRecommendations } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", analysis.user_id)
      .or(`analysis_id.is.null,analysis_id.neq.${analysisId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    // Получаем данные о соблюдении назначений
    // @ts-ignore - Type will be available after DB types regeneration
    const { data: prescriptionAdherence } = await supabase.from("prescription_adherence").select(`
        *,
        prescriptions:prescription_id (
          prescription,
          effect,
          control_date
        )
      `).eq("user_id", analysis.user_id).order("tracked_at", { ascending: false }).limit(20);

    // Получаем симптомы пациента
    const { data: userSymptoms } = await supabase
      .from("user_symptoms")
      .select("*")
      .eq("user_id", analysis.user_id)
      .order("tracked_at", { ascending: false })
      .limit(50);

    // Группируем биомаркеры по категориям
    const categorizedBiomarkers = analysis.analysis_values.reduce((acc: any, av: any) => {
      const category = av.biomarkers.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(av);
      return acc;
    }, {} as Record<string, any[]>);

    // Рассчитываем BMI
    const calculateBMI = (weight: number | null, height: number | null) => {
      if (!weight || !height || height <= 0) return null;
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    };

    const bmi = calculateBMI(
      actualWeight,
      profile?.height ? Number(profile.height) : null
    );

    // Группируем медицинскую историю по категориям
    const groupedMedicalHistory = (medicalHistory || []).reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item.condition);
      return acc;
    }, {} as Record<string, string[]>);

    const medicalHistoryText = Object.keys(groupedMedicalHistory).length > 0
      ? Object.entries(groupedMedicalHistory)
          .map(([category, conditions]) => `  ${category}:\n    - ${(conditions as string[]).join("\n    - ")}`)
          .join("\n")
      : "  Не указана";

    // Формируем текст о соблюдении назначений
    const adherenceLabelMap: Record<number, string> = {
      0: "Почти не придерживался(ась)",
      1: "Иногда пропускал(а)",
      2: "В основном да",
      3: "Всегда"
    };

    const adherenceText = prescriptionAdherence && prescriptionAdherence.length > 0
      ? prescriptionAdherence
          .map((adh: any) => {
            const label = adherenceLabelMap[adh.adherence_level] || "Не указано";
            const date = new Date(adh.tracked_at).toLocaleDateString("ru-RU");
            const prescription = adh.prescriptions?.prescription || "Не указано";
            return `  • ${prescription} — Соблюдение: ${label} (${adh.adherence_level}/3), Дата: ${date}`;
          })
          .join("\n")
      : "  Данные о соблюдении назначений отсутствуют";

    // Группируем симптомы по категориям
    const groupedSymptoms = (userSymptoms || []).reduce((acc: any, symptom: any) => {
      if (!acc[symptom.category]) {
        acc[symptom.category] = [];
      }
      acc[symptom.category].push(`${symptom.symptom} (${symptom.severity}/3)`);
      return acc;
    }, {} as Record<string, string[]>);

    const symptomsText = Object.keys(groupedSymptoms).length > 0
      ? Object.entries(groupedSymptoms)
          .map(([category, symptoms]) => `  ${category}:\n    - ${(symptoms as string[]).join("\n    - ")}`)
          .join("\n")
      : "  Симптомы не указаны";

    // Формируем контекст пациента
    const age = profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : null;
    
    const userContext = `
ДАННЫЕ ПАЦИЕНТА:
Имя: ${profile?.name || "Не указано"}
Возраст: ${age || "Не указано"} лет
Пол: ${profile?.gender || "Не указано"}
Рост: ${profile?.height ? `${profile.height} см` : "Не указано"}
Вес: ${actualWeight ? `${actualWeight} кг` : "Не указано"}
BMI: ${bmi ? `${bmi} ${Number(bmi) < 18.5 ? "(недостаточный вес)" : Number(bmi) < 25 ? "(норма)" : Number(bmi) < 30 ? "(избыточный вес)" : "(ожирение)"}` : "Не рассчитан"}

МЕДИЦИНСКИЙ АНАМНЕЗ:
${medicalHistoryText}

ТЕКУЩИЕ ЖАЛОБЫ И СИМПТОМЫ:
${complaints && complaints.length > 0 ? complaints.map((c: any) => `- ${c.main_complaints || c.complaint || "Не указано"}`).join("\n") : "Не указаны"}

ТЕКУЩИЕ СИМПТОМЫ (из дневника):
${symptomsText}

СОБЛЮДЕНИЕ ПРЕДЫДУЩИХ НАЗНАЧЕНИЙ:
${adherenceText}

ВАЖНО ДЛЯ ИНТЕРПРЕТАЦИИ:
При наличии хронических заболеваний в анамнезе, учитывай их при оценке биомаркеров:
- При диабете: не пугать лёгким повышением HbA1c, оценивать в контексте компенсации
- При гипотиреозе: корректно интерпретировать ТТГ, холестерин, креатинкиназу
- При аутоиммунных заболеваниях: учитывать возможное повышение СРБ, ферритина, СОЭ
- При ожирении/избыточном весе: ожидать инсулинорезистентность, дислипидемию
- При сердечно-сосудистых заболеваниях: более строго оценивать липидный профиль
- При возрасте 50+: корректировать референсные интервалы с учётом возраста

УЧЁТ СОБЛЮДЕНИЯ НАЗНАЧЕНИЙ И СИМПТОМОВ:
- Учитывай соблюдение предыдущих назначений и текущие симптомы пациента при формировании новых рекомендаций
- Если соблюдение низкое (0-1) — ожидать слабую динамику показателей, возможно нужна мотивация или упрощение схемы
- Если соблюдение высокое (2-3), но нет эффекта — предлагать коррекции дозировок или смену препаратов
- Симптомы из дневника должны соотноситься с биомаркерами: например, усталость + низкий B12, бессонница + высокий кортизол

Всегда указывай связь показателей с имеющимися заболеваниями, например:
"Ваш ТТГ немного повышен (5.2 мМЕ/л при норме до 4), что может быть связано с ранее указанным гипотиреозом. Это требует консультации эндокринолога для возможной коррекции терапии."
    `.trim();

    // Формируем вступительный раздел с данными пациента
    const patientDataSection = `
# ДАННЫЕ ПАЦИЕНТА

## Персональная информация
- **Имя:** ${profile?.name || 'Не указано'}
- **Возраст:** ${age || 'Не указано'} лет
- **Пол:** ${profile?.gender === 'male' ? 'Мужской' : profile?.gender === 'female' ? 'Женский' : 'Не указано'}
- **Рост:** ${profile?.height ? `${profile.height} см` : 'Не указано'}
- **Вес:** ${actualWeight ? `${actualWeight} кг` : 'Не указано'}
- **Индекс массы тела (BMI):** ${bmi ? `${bmi} ${Number(bmi) < 18.5 ? "(недостаточный вес)" : Number(bmi) < 25 ? "(норма)" : Number(bmi) < 30 ? "(избыточный вес)" : "(ожирение)"}` : "Не рассчитан"}

## Медицинская история
${Object.keys(groupedMedicalHistory).length > 0 
  ? Object.entries(groupedMedicalHistory)
      .map(([category, conditions]) => `### ${category}\n${(conditions as string[]).map(c => `- ${c}`).join('\n')}`)
      .join('\n\n')
  : 'Не указана'
}

## Основные жалобы и симптомы
${complaints && complaints.length > 0 
  ? complaints.map((c: any) => `- ${c.main_complaints || c.complaint || "Не указано"}`).join("\n")
  : 'Не указаны'
}

## Образ жизни
${complaints && complaints.length > 0 && complaints[0].lifestyle 
  ? complaints[0].lifestyle 
  : 'Не указан'
}

## Цели
${complaints && complaints.length > 0 && complaints[0].goals 
  ? complaints[0].goals 
  : 'Не указаны'
}

## Дата анализа
${new Date(analysis.date).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', year: 'numeric' })}
`.trim();

    // Сохраняем "Данные пациента" сразу — клиент увидит прогресс.
    // В step-режиме оркестратора patient_data сохраняется только на самом первом шаге
    // (когда !skipDelete, т.е. одновременно с очисткой старых данных).
    if (!skipDelete) {
      await supabase.from("recommendations").insert({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        type: "Данные пациента",
        text: patientDataSection
      });
      console.log("Saved: Данные пациента");
    }

    // Тренды по категориям больше не используются: плейсхолдер {trends} удалён
    // из всех category_*_user промптов в БД. Если в каком-то старом или ручном
    // промпте плейсхолдер остался — он будет заменён на пустую строку (ниже),
    // чтобы AI не получал литерал «{trends}».

    // Получаем релевантные предыдущие рекомендации для категории
    const getCategoryRecommendations = (category: string) => {
      if (!previousRecommendations || previousRecommendations.length === 0) {
        return "Нет предыдущих рекомендаций";
      }

      const relevant = previousRecommendations.filter((r: any) => 
        r.type === category || r.type === "Общее резюме"
      );

      return relevant.length > 0
        ? relevant.map((r: any) => `[${r.type}] ${r.text.substring(0, 500)}...`).join("\n\n")
        : "Нет релевантных рекомендаций";
    };

    console.log(`Starting detailed analysis for ${Object.keys(categorizedBiomarkers).length} categories`);

    // === ГЛОБАЛЬНАЯ СВОДКА ВСЕХ СДАННЫХ БИОМАРКЕРОВ (для межкатегорийного контекста) ===
    const patientGenderForSummary = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
    const globalBiomarkersSummary = analysis.analysis_values.map((av: any) => {
      let nMin = av.biomarkers.normal_min;
      let nMax = av.biomarkers.normal_max;
      let oMin = av.biomarkers.optimal_min;
      let oMax = av.biomarkers.optimal_max;
      let cMin = av.biomarkers.critical_min;
      let cMax = av.biomarkers.critical_max;

      if (age && patientGenderForSummary && av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges?.[patientGenderForSummary]) {
        const ar = av.biomarkers.age_ranges[patientGenderForSummary].find((r: any) => age >= r.age_from && age <= r.age_to);
        if (ar) { nMin = ar.min; nMax = ar.max; if (ar.optimal_min !== undefined) oMin = ar.optimal_min; if (ar.optimal_max !== undefined) oMax = ar.optimal_max; if (ar.critical_min !== undefined) cMin = ar.critical_min; if (ar.critical_max !== undefined) cMax = ar.critical_max; }
      }
      if ((nMin === null || nMax === null) && patientGenderForSummary === 'male' && av.biomarkers.normal_min_male !== null) { nMin = av.biomarkers.normal_min_male; nMax = av.biomarkers.normal_max_male; }
      else if ((nMin === null || nMax === null) && patientGenderForSummary === 'female' && av.biomarkers.normal_min_female !== null) { nMin = av.biomarkers.normal_min_female; nMax = av.biomarkers.normal_max_female; }
      if (oMin === null && patientGenderForSummary === 'male' && av.biomarkers.optimal_min_male !== null) { oMin = av.biomarkers.optimal_min_male; oMax = av.biomarkers.optimal_max_male; }
      else if (oMin === null && patientGenderForSummary === 'female' && av.biomarkers.optimal_min_female !== null) { oMin = av.biomarkers.optimal_min_female; oMax = av.biomarkers.optimal_max_female; }

      const isCritLow = cMin !== null && av.value < cMin;
      const isCritHigh = cMax !== null && av.value > cMax;
      const isOutNorm = (nMin !== null && av.value < nMin) || (nMax !== null && av.value > nMax);
      const isInOpt = (oMin !== null || oMax !== null) ? (oMin === null || av.value >= oMin) && (oMax === null || av.value <= oMax) : !isOutNorm;

      let status = "🟢 ОПТИМАЛЬНО";
      if (isCritLow || isCritHigh) status = "🔴 КРИТИЧНО";
      else if (isOutNorm) status = "🟠 РИСК";
      else if (!isInOpt) status = "🟡 ДОПУСТИМО";

      // Determine direction relative to normal range
      let direction = "В НОРМЕ";
      if (isCritHigh || (nMax !== null && av.value > nMax)) direction = "ВЫШЕ НОРМЫ";
      else if (isCritLow || (nMin !== null && av.value < nMin)) direction = "НИЖЕ НОРМЫ";

      // Build ranges string for context
      const normalRangeStr = `норма: ${nMin ?? '—'}–${nMax ?? '—'}`;
      const optimalRangeStr = (oMin !== null || oMax !== null) ? `, оптимум: ${oMin ?? '—'}–${oMax ?? '—'}` : '';

      return `- ${av.biomarkers.name} (${av.biomarkers.code}): ${av.value} ${av.biomarkers.unit} — ${status} ${direction} (${normalRangeStr}${optimalRangeStr}) [${av.biomarkers.category}]`;
    }).join('\n');

    const globalBiomarkersInstructions = prompts['global_biomarkers_instructions'] || `ВАЖНО: 
- НЕ рекомендуй сдавать анализы на биомаркеры, которые уже есть в списке выше. Вместо этого ссылайся на их значения.
- При описании связей между системами, используй конкретные значения из списка выше.
- ЗАПРЕТ ПРОТИВОРЕЧИЙ: Прежде чем предположить дефицит любого вещества (цинк, магний, B12, железо и т.д.), ОБЯЗАТЕЛЬНО проверь его значение в списке выше. Если маркер сдан и находится в норме/оптимуме — НЕЛЬЗЯ писать «возможен дефицит». Вместо этого укажи, что уровень в норме, и рассмотри альтернативные причины отклонения.
- Если хочешь объяснить отклонение маркера через дефицит другого вещества — сначала подтверди этот дефицит данными. Если данных нет (маркер не сдан) — можно предположить, но указать «маркер не сдан, рекомендуется проверить».`;

    const globalBiomarkersContext = `
ПОЛНЫЙ СПИСОК ВСЕХ СДАННЫХ БИОМАРКЕРОВ ПАЦИЕНТА (все категории):
${globalBiomarkersSummary}

${globalBiomarkersInstructions}
`.trim();

    console.log(`Built global biomarkers context: ${analysis.analysis_values.length} markers`);

    // === BUILD CRITICAL GUARD — explicit prohibition block for 🔴/🟠 markers ===
    function buildCriticalGuard(analysisValues: any[]): string {
      const criticalMarkers = analysisValues.map((av: any) => {
        let nMin = av.biomarkers.normal_min;
        let nMax = av.biomarkers.normal_max;
        if (age && patientGenderForSummary && av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges?.[patientGenderForSummary]) {
          const ar = av.biomarkers.age_ranges[patientGenderForSummary].find((r: any) => age >= r.age_from && age <= r.age_to);
          if (ar) { nMin = ar.min; nMax = ar.max; }
        }
        if ((nMin === null || nMax === null) && patientGenderForSummary === 'male' && av.biomarkers.normal_min_male !== null) { nMin = av.biomarkers.normal_min_male; nMax = av.biomarkers.normal_max_male; }
        else if ((nMin === null || nMax === null) && patientGenderForSummary === 'female' && av.biomarkers.normal_min_female !== null) { nMin = av.biomarkers.normal_min_female; nMax = av.biomarkers.normal_max_female; }

        const isHigh = nMax !== null && av.value > nMax;
        const isLow = nMin !== null && av.value < nMin;
        if (!isHigh && !isLow) return null;

        const direction = isHigh ? 'ВЫСОКАЯ' : 'НИЗКАЯ';
        const antiDirection = isHigh
          ? 'НЕ ПИШИ что она снижена, понижена, дефицит, недостаточность'
          : 'НЕ ПИШИ что она повышена, избыток, превышение';
        const boundaryStr = isHigh ? `норма до ${nMax}` : `норма от ${nMin}`;

        return `- ${av.biomarkers.name} (${av.biomarkers.code}): ${av.value} ${av.biomarkers.unit} — КРИТИЧЕСКИ/РИСКОВО ${direction} (${boundaryStr}). ${antiDirection}.`;
      }).filter(Boolean);

      if (criticalMarkers.length === 0) return '';
      return `\n⚠️ КРИТИЧЕСКИЕ ФАКТЫ — НЕ ПРОТИВОРЕЧЬ:\n${criticalMarkers.join('\n')}\n`;
    }

    const criticalGuardBlock = buildCriticalGuard(analysis.analysis_values);
    console.log(`Critical guard: ${criticalGuardBlock ? criticalGuardBlock.split('\n').length - 2 + ' markers' : 'none'}`);

    // === SCAN CONTRADICTIONS — post-generation regex scanner ===
    function scanContradictions(
      reports: Record<string, string>,
      analysisValues: any[]
    ): string[] {
      const contradictions: string[] = [];

      // Build lookup: marker name/code → actual direction
      const markerDirections = new Map<string, { name: string; direction: 'high' | 'low' | 'normal'; value: number }>();
      for (const av of analysisValues) {
        let nMin = av.biomarkers.normal_min;
        let nMax = av.biomarkers.normal_max;
        if (age && patientGenderForSummary && av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges?.[patientGenderForSummary]) {
          const ar = av.biomarkers.age_ranges[patientGenderForSummary].find((r: any) => age >= r.age_from && age <= r.age_to);
          if (ar) { nMin = ar.min; nMax = ar.max; }
        }
        if ((nMin === null || nMax === null) && patientGenderForSummary === 'male' && av.biomarkers.normal_min_male !== null) { nMin = av.biomarkers.normal_min_male; nMax = av.biomarkers.normal_max_male; }
        else if ((nMin === null || nMax === null) && patientGenderForSummary === 'female' && av.biomarkers.normal_min_female !== null) { nMin = av.biomarkers.normal_min_female; nMax = av.biomarkers.normal_max_female; }

        const isHigh = nMax !== null && av.value > nMax;
        const isLow = nMin !== null && av.value < nMin;
        const dir = isHigh ? 'high' : isLow ? 'low' : 'normal';
        
        // Index by name and code (lowercase for matching)
        const entry = { name: av.biomarkers.name, direction: dir as 'high' | 'low' | 'normal', value: av.value };
        markerDirections.set(av.biomarkers.name.toLowerCase(), entry);
        markerDirections.set(av.biomarkers.code.toLowerCase(), entry);
      }

      const lowPatterns = /(?:снижен|пониженн?|дефицит|недостаточ|нехватк|низк(?:ий|ая|ое|ого|им))/i;
      const highPatterns = /(?:повышен|избыт(?:ок|очн)|превышен|высок(?:ий|ая|ое|ого|им)|чрезмерн)/i;

      for (const [category, report] of Object.entries(reports)) {
        // Check each marker
        for (const [key, info] of markerDirections) {
          if (info.direction === 'normal') continue;
          
          // Find mentions of this marker in the report
          const nameRegex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = [...report.matchAll(nameRegex)];
          
          for (const match of matches) {
            // Get surrounding context (200 chars around the match)
            const start = Math.max(0, (match.index || 0) - 100);
            const end = Math.min(report.length, (match.index || 0) + key.length + 100);
            const context = report.substring(start, end);
            
            if (info.direction === 'high' && lowPatterns.test(context)) {
              contradictions.push(`[${category}] ${info.name}: значение ${info.value} ВЫШЕ нормы, но в тексте упоминается как сниженное/дефицит`);
            } else if (info.direction === 'low' && highPatterns.test(context)) {
              contradictions.push(`[${category}] ${info.name}: значение ${info.value} НИЖЕ нормы, но в тексте упоминается как повышенное/избыток`);
            }
          }
        }
      }

      return contradictions;
    }

    // Normalize typographic dashes that LLMs often substitute inside HTML comments
    // (e.g. `<!– anchor:biomarker LACT –>` instead of `<!-- anchor:biomarker LACT -->`).
    // Without this normalization the frontend parser cannot recognize anchors and
    // they leak into the rendered text as plain strings.
    function normalizeAnchorTypography(text: string): string {
      if (!text) return text;
      return text
        .replace(/<\s*!\s*[-–—]{1,3}\s*(anchor:)/gi, '<!-- $1')
        .replace(/(anchor:[^\n<>]*?)\s*[-–—]{1,3}\s*>/gi, '$1 -->')
        .replace(/<!--\s*anchor:([^\n>]*?)-->/gi, (_m, body) => `<!-- anchor:${String(body).replace(/\u00A0/g, ' ').trim()} -->`);
    }

    function normalizeBiomarkerCode(code: string): string {
      if (!code) return '';
      return String(code)
        .toLowerCase()
        .trim()
        .replace(/α/g, 'a')
        .replace(/β/g, 'b')
        .replace(/γ/g, 'g')
        .replace(/δ/g, 'd')
        .replace(/μ/g, 'u')
        .replace(/[\s\-_+()]/g, '');
    }

    function ensureBiomarkerAnchorCoverage(report: string, biomarkers: any[]): string {
      if (!report || biomarkers.length === 0) return report;

      const normalized = normalizeAnchorTypography(report);
      const anchoredNormalizedCodes = new Set<string>();
      const anchorRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
      for (const match of normalized.matchAll(anchorRegex)) {
        if (match[1]) anchoredNormalizedCodes.add(normalizeBiomarkerCode(match[1]));
      }

      // Strip anchors from text so we only search the prose for biomarker mentions
      const textOnly = normalized.replace(/<!--[\s\S]*?-->/g, ' ');

      const missingCodes = biomarkers
        .map((bm: any) => ({ code: bm?.biomarkers?.code as string | undefined, name: bm?.biomarkers?.name as string | undefined }))
        .filter((entry): entry is { code: string; name: string | undefined } => Boolean(entry.code))
        .filter((entry) => {
          // Already has an anchor (exact or normalized) → skip
          if (anchoredNormalizedCodes.has(normalizeBiomarkerCode(entry.code))) return false;
          // Mentioned by code or name in prose → frontend auto-inject will handle it; skip fallback
          const codeMentioned = entry.code && textOnly.toLowerCase().includes(entry.code.toLowerCase());
          const nameMentioned = entry.name && textOnly.toLowerCase().includes(entry.name.toLowerCase());
          if (codeMentioned || nameMentioned) return false;
          return true;
        })
        .map((entry) => entry.code);

      if (missingCodes.length === 0) return normalized;

      const fallbackAnchorBlock = [
        '',
        '<!-- anchor:spacer -->',
        '## Ключевые показатели системы',
        ...missingCodes.flatMap((code: string) => [
          `<!-- anchor:biomarker ${code} -->`,
          '<!-- anchor:biomarker_end -->',
          '',
        ]),
      ].join('\n');

      console.warn(`Adding fallback biomarker anchors: ${missingCodes.join(', ')}`);
      return `${normalized.trim()}\n${fallbackAnchorBlock}`.trim();
    }

    // Запросы для каждой категории. В deep-режиме не запускаем 5 тяжёлых AI-вызовов одновременно:
    // пакетный параллельный старт периодически упирался в gateway rate limit, и клиент видел «0 из 5 систем».
    const categoryReports: Record<string, string> = {};
    const categoryStatuses: Record<string, any> = {};
    let totalTokens = 0;

    const allCategoryEntries = Object.entries(categorizedBiomarkers) as [string, any[]][];
    // Фильтрация по step-режиму оркестратора: обрабатываем только указанные категории.
    const categoryEntries = (Array.isArray(categoryFilter) && categoryFilter.length > 0)
      ? allCategoryEntries.filter(([cat]) => categoryFilter.includes(cat))
      : allCategoryEntries;
    if (Array.isArray(categoryFilter) && categoryFilter.length > 0) {
      console.log(`Step mode: processing ${categoryEntries.length} of ${allCategoryEntries.length} categories: ${categoryEntries.map(([c]) => c).join(", ")}`);
    }
    const processCategory = async ([category, biomarkers]: [string, any[]]) => {
      try {
        const expert = CATEGORY_EXPERTS[category as keyof typeof CATEGORY_EXPERTS];
        
        if (!expert) {
          console.warn(`No expert defined for category: ${category}`);
          categoryStatuses[category] = { success: false, error: "Нет специализации" };
          return;
        }

        // Формируем детальный промпт для категории
        const patientGender = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
        
        const biomarkersText = (biomarkers as any[]).map((bm: any) => {
          // Determine correct ranges based on age and gender
          let normalMin = bm.biomarkers.normal_min;
          let normalMax = bm.biomarkers.normal_max;
          let optimalMin = bm.biomarkers.optimal_min;
          let optimalMax = bm.biomarkers.optimal_max;
          let criticalMin = bm.biomarkers.critical_min;
          let criticalMax = bm.biomarkers.critical_max;
          
          // Check age_ranges first if range_mode is 'age'
          if (age && patientGender && bm.biomarkers.range_mode === 'age' && bm.biomarkers.age_ranges && bm.biomarkers.age_ranges[patientGender]) {
            const ageRange = bm.biomarkers.age_ranges[patientGender].find(
              (range: any) => age >= range.age_from && age <= range.age_to
            );
            if (ageRange) {
              normalMin = ageRange.min;
              normalMax = ageRange.max;
              if (ageRange.optimal_min !== undefined) optimalMin = ageRange.optimal_min;
              if (ageRange.optimal_max !== undefined) optimalMax = ageRange.optimal_max;
              if (ageRange.critical_min !== undefined) criticalMin = ageRange.critical_min;
              if (ageRange.critical_max !== undefined) criticalMax = ageRange.critical_max;
            }
          }
          
          // Fallback to gender-specific ranges
          if ((normalMin === null || normalMax === null) && patientGender === 'male' && bm.biomarkers.normal_min_male !== null) {
            normalMin = bm.biomarkers.normal_min_male;
            normalMax = bm.biomarkers.normal_max_male;
          } else if ((normalMin === null || normalMax === null) && patientGender === 'female' && bm.biomarkers.normal_min_female !== null) {
            normalMin = bm.biomarkers.normal_min_female;
            normalMax = bm.biomarkers.normal_max_female;
          }
          if (optimalMin === null && patientGender === 'male' && bm.biomarkers.optimal_min_male !== null) {
            optimalMin = bm.biomarkers.optimal_min_male;
            optimalMax = bm.biomarkers.optimal_max_male;
          } else if (optimalMin === null && patientGender === 'female' && bm.biomarkers.optimal_min_female !== null) {
            optimalMin = bm.biomarkers.optimal_min_female;
            optimalMax = bm.biomarkers.optimal_max_female;
          }
          if (criticalMin === null && patientGender === 'male' && bm.biomarkers.critical_min_male !== null) {
            criticalMin = bm.biomarkers.critical_min_male;
            criticalMax = bm.biomarkers.critical_max_male;
          } else if (criticalMin === null && patientGender === 'female' && bm.biomarkers.critical_min_female !== null) {
            criticalMin = bm.biomarkers.critical_min_female;
            criticalMax = bm.biomarkers.critical_max_female;
          }
          
          // 4-tier status
          let status = "✅ ОПТИМАЛЬНО";
          const isCriticalLow = criticalMin !== null && bm.value < criticalMin;
          const isCriticalHigh = criticalMax !== null && bm.value > criticalMax;
          const isOutsideNormal = (normalMin !== null && bm.value < normalMin) || (normalMax !== null && bm.value > normalMax);
          const isInOptimal = optimalMin !== null && optimalMax !== null 
            ? bm.value >= optimalMin && bm.value <= optimalMax 
            : !isOutsideNormal;
          
          if (isCriticalLow || isCriticalHigh) {
            status = "🔴 КРИТИЧНО";
          } else if (isOutsideNormal) {
            status = "🟠 РИСК";
          } else if (!isInOptimal) {
            status = "🟡 ДОПУСТИМО";
          }
          
          const rangesText = [
            criticalMin !== null ? `🔴 Крит.низ: <${criticalMin}` : null,
            `🟠 Риск низ: <${normalMin || "?"}`,
            optimalMin !== null ? `🟡 Допуст.низ: <${optimalMin}` : null,
            optimalMin !== null && optimalMax !== null ? `🟢 Оптимально: ${optimalMin}-${optimalMax}` : null,
            optimalMax !== null ? `🟡 Допуст.верх: >${optimalMax}` : null,
            `🟠 Риск верх: >${normalMax || "?"}`,
            criticalMax !== null ? `🔴 Крит.верх: >${criticalMax}` : null,
          ].filter(Boolean).join(' | ');
          
          return `
${bm.biomarkers.name} (${bm.biomarkers.code}):
  Значение: ${bm.value} ${bm.biomarkers.unit}
  ${rangesText} ${bm.biomarkers.unit}
  Статус: ${status}
  ${bm.biomarkers.description ? `Описание: ${bm.biomarkers.description}` : ""}
          `.trim();
        }).join("\n\n");

        // Получаем промпты из БД с fallback на дефолтные
        const categoryKey = CATEGORY_KEY_MAP[category] || category.toLowerCase().replace(/\s+/g, '_');
        const userPromptKey = `category_${categoryKey}_user`;
        const systemPromptKey = `category_${categoryKey}_system`;

        const userPromptTemplate = prompts[userPromptKey] || `
КОНТЕКСТ ПАЦИЕНТА:
{userContext}

БИОМАРКЕРЫ КАТЕГОРИИ "${category}":
{biomarkersText}

ИСТОРИЧЕСКИЕ ТРЕНДЫ:
{trends}

ПРЕДЫДУЩИЕ РЕКОМЕНДАЦИИ:
{recommendations}

Дай ОЧЕНЬ ПОДРОБНЫЙ анализ (6000+ слов):

1. ДЕТАЛЬНАЯ ОЦЕНКА КАЖДОГО ПОКАЗАТЕЛЯ:
   - Что означает этот биомаркер
   - Как он влияет на здоровье
   - Почему именно такое значение
   - Взаимосвязи с другими показателями в этой категории

2. СИСТЕМНЫЙ АНАЛИЗ:
   - Как показатели связаны друг с другом
   - Общая картина состояния системы
   - Комплексная оценка рисков

3. ДИНАМИКА И ТРЕНДЫ:
   - Как изменились показатели со времени последних анализов
   - Положительные тренды - что работает хорошо
   - Негативные тренды - что требует внимания
   - Оценка эффективности предыдущих рекомендаций

4. РИСКИ И ПРОГНОЗ:
   - Краткосрочные риски (1-3 месяца)
   - Среднесрочные риски (3-12 месяцев)
   - Долгосрочные риски (1-5 лет)
   - Что может произойти при сохранении текущей динамики

5. ДЕТАЛЬНЫЕ РЕКОМЕНДАЦИИ:
   - Питание: конкретные продукты, размеры порций, время приема
   - Добавки: конкретные названия, дозировки, схемы приема, продолжительность
   - Образ жизни: физическая активность, сон, стресс-менеджмент
   - Дополнительные обследования: какие анализы нужны, когда их сдать

6. ПЛАН ДЕЙСТВИЙ:
   - Что делать в первую очередь (первые 2 недели)
   - Что внедрять постепенно (1-3 месяца)
   - Когда ожидать первых результатов
   - Когда пересдать анализы для контроля

Пиши простым языком, но будь максимально информативным и конкретным.
        `.trim();

        // Подставляем данные в шаблон.
        // {trends} оставлен как safety net — если плейсхолдер случайно остался
        // в чьём-то промпте, он схлопнется в пустую строку, а не уйдёт литералом.
        let categoryPrompt = userPromptTemplate
          .replace(/{userContext}/g, userContext)
          .replace(/{category}/g, category)
          .replace(/{biomarkersText}/g, biomarkersText)
          .replace(/{biomarkers}/g, biomarkersText)
          .replace(/{trends}/g, "")
          .replace(/{recommendations}/g, getCategoryRecommendations(category));

        // Подставляем глобальный контекст биомаркеров через плейсхолдер или fallback
        if (categoryPrompt.includes("{globalBiomarkers}")) {
          categoryPrompt = categoryPrompt.replace(/{globalBiomarkers}/g, globalBiomarkersContext);
        } else {
          categoryPrompt += "\n\n" + globalBiomarkersContext;
        }

        // Inject critical guard block (explicit prohibition for misinterpreted markers)
        if (criticalGuardBlock) {
          categoryPrompt += "\n" + criticalGuardBlock;
        }

        const systemPrompt = prompts[systemPromptKey] || 
          `Ты ${expert.role} с 20-летним опытом. Специализируешься на ${expert.specialization}.`;

        const baseCategoryTokens = categoryKey === "metabolism" ? 24000 : 16000;
        const categoryMaxCompletionTokens = Math.round(baseCategoryTokens * aiProfile.tokenMultiplier);

        const categoryRequestBody = JSON.stringify({
          model: aiProfile.model,
          ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: categoryPrompt
            }
          ],
          // Метаболизм требует больше токенов из-за расширенного промпта (печень+почки+электролиты+детоксикация)
          max_completion_tokens: categoryMaxCompletionTokens
        });

        let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: categoryRequestBody,
        });

        const rateLimitRetries = mode === "deep" ? 3 : 1;
        for (let attempt = 1; response.status === 429 && attempt <= rateLimitRetries; attempt++) {
          const delayMs = attempt * 8000;
          console.warn(`Rate limit for category ${category}; retry ${attempt}/${rateLimitRetries} after ${delayMs}ms`);
          await new Promise((r) => setTimeout(r, delayMs));
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: categoryRequestBody,
          });
        }

        if (response.status === 429) {
          categoryStatuses[category] = { success: false, error: "Rate limit exceeded" };
          console.error(`Rate limit for category ${category}`);
          return;
        }

        if (response.status === 402) {
          categoryStatuses[category] = { success: false, error: "Insufficient credits" };
          console.error(`Insufficient credits for category ${category}`);
          throw new Error("Недостаточно AI-кредитов для генерации отчёта");
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AI API error for ${category}: ${errorText}`);
        }

        const data = await response.json();
        let categoryReport = data.choices[0].message.content;
        const finishReason = data.choices[0].finish_reason;
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const tokensUsed = data.usage?.total_tokens || 0;
        const contentLength = categoryReport?.length || 0;

        console.log(`Category ${category}: finish_reason=${finishReason}, prompt_tokens=${promptTokens}, completion_tokens=${completionTokens}, total_tokens=${tokensUsed}, content_length=${contentLength}`);

        if (contentLength > 0) {
          const preview = contentLength > 200 
            ? `First 100: ${categoryReport.substring(0, 100)} | Last 100: ${categoryReport.substring(contentLength - 100)}`
            : `Full: ${categoryReport}`;
          console.log(`Category ${category} content preview: ${preview}`);
        }

        // Валидация + retry для коротких ответов
        const MIN_CONTENT_LENGTH = 500;
        let retryCount = 0;

        while ((!categoryReport || categoryReport.length < MIN_CONTENT_LENGTH) && retryCount < aiProfile.maxRetries) {
          retryCount++;
          console.warn(`RETRY ${retryCount}/${aiProfile.maxRetries} for ${category}: content too short (${categoryReport?.length || 0} chars)`);
          await new Promise(r => setTimeout(r, 3000));

          const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: aiProfile.model,
              ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: categoryPrompt }
              ],
               max_completion_tokens: categoryMaxCompletionTokens
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            categoryReport = retryData.choices[0].message.content;
            const retryFinish = retryData.choices[0].finish_reason;
            const retryCompletionTokens = retryData.usage?.completion_tokens || 0;
            const retryContentLen = categoryReport?.length || 0;
            console.log(`Retry ${retryCount} result for ${category}: content_length=${retryContentLen}, finish=${retryFinish}, completion_tokens=${retryCompletionTokens}`);
          } else {
            console.error(`Retry ${retryCount} failed for ${category}: status ${retryResponse.status}`);
            try { await retryResponse.text(); } catch {}
          }
        }

        categoryReport = ensureBiomarkerAnchorCoverage(categoryReport, biomarkers as any[]);

        // Fallback при полной неудаче
        if (!categoryReport || categoryReport.length < MIN_CONTENT_LENGTH) {
          console.error(`FAILED: Category ${category} content too short after ${retryCount} retries (${categoryReport?.length || 0} chars). Using fallback.`);
          categoryReport = `## ${category}\n\nАнализ этой категории не удался при генерации (получено ${categoryReport?.length || 0} символов вместо минимальных ${MIN_CONTENT_LENGTH}). Рекомендуется перегенерировать отчёт.`;
          categoryStatuses[category] = { success: false, error: `Content too short after ${retryCount} retries`, tokens: tokensUsed };
        } else if (finishReason === "length") {
          console.warn(`WARNING: Category ${category} was truncated at token limit`);
          categoryReport += "\n\n[⚠️ ВНИМАНИЕ: Отчёт был сокращён из-за ограничения по длине. Рекомендуется перегенерировать.]";
          categoryStatuses[category] = { success: true, tokens: tokensUsed, truncated: true };
        } else {
          categoryStatuses[category] = { success: true, tokens: tokensUsed, retries: retryCount };
        }
        
        categoryReports[category] = categoryReport;
        totalTokens += tokensUsed;

        // Сохраняем категорию сразу — клиент увидит прогресс через polling
        const { error: catInsertError } = await supabase.from("recommendations").insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          type: category,
          text: categoryReport
        });
        if (catInsertError) {
          console.error(`Failed to save category ${category}:`, catInsertError.message);
        } else {
          console.log(`Saved: ${category}`);
        }

        console.log(`Category ${category} FINAL: ${categoryReport.length} chars, retries: ${retryCount}`);

      } catch (error: any) {
        console.error(`Error processing category ${category}:`, error);
        categoryStatuses[category] = { success: false, error: error.message };
        if (String(error?.message || "").includes("Недостаточно AI-кредитов")) throw error;
      }
    };

    if (mode === "deep") {
      for (const entry of categoryEntries) {
        await processCategory(entry);
      }
    } else {
      await Promise.all(categoryEntries.map(processCategory));
    }

    const successfulCategoryCount = Object.values(categoryStatuses).filter((status: any) => status?.success).length;
    if (successfulCategoryCount === 0) {
      throw new Error("Не удалось сгенерировать ни одну систему: AI-сервис временно ограничил запросы или не ответил. Попробуйте через несколько минут.");
    }

    // === SCAN FOR CONTRADICTIONS in generated reports ===
    const detectedContradictions = scanContradictions(categoryReports, analysis.analysis_values);
    if (detectedContradictions.length > 0) {
      console.warn(`⚠️ Detected ${detectedContradictions.length} contradictions in category reports:`);
      detectedContradictions.forEach(c => console.warn(`  ${c}`));
    } else {
      console.log("No contradictions detected in category reports");
    }

    const contradictionsBlock = detectedContradictions.length > 0
      ? `\n⚠️ ОБНАРУЖЕНЫ ПРОТИВОРЕЧИЯ В КАТЕГОРИЙНЫХ ОТЧЁТАХ — НЕ ПОВТОРЯЙ ИХ В РЕЗЮМЕ:\n${detectedContradictions.map(c => `- ${c}`).join('\n')}\nИспользуй ТОЛЬКО фактические данные из списка биомаркеров выше.\n`
      : '';

    // ====== ГЕНЕРАЦИЯ НАЗНАЧЕНИЙ (ДО РЕЗЮМЕ, чтобы резюме могло на них ссылаться) ======
    console.log("All category reports saved. Starting prescriptions generation...");

    let prescriptionsCreated = 0;
    let prescriptionsStatus = "skipped";
    let prescriptionsRawContent = "";
    let prescriptionsToCreateFinal: Array<{ name: string; form: string; dosage: string; how_to_take: string; duration: string; prescription: string; reason: string; effect: string; duration_months: number }> = [];
    // Дополнительные блоки раздела «Назначения»: питание/образ жизни и доп. обследования.
    // Сохраняются в recommendations.content_json (type = 'Назначения').
    let lifestyleFinal: { nutrition: string[]; activity: string[]; sleep: string[] } = { nutrition: [], activity: [], sleep: [] };
    let followUpsFinal: Array<{ specialist: string; goal: string; trigger: string }> = [];

    // Поиск секции по заголовку, устойчивый к вариациям ИИ:
    //  - регистронезависимо
    //  - игнорирует эмодзи / **жирный** / # markdown-заголовки / двоеточие в конце
    //  - распознаёт html-комментарии (<!-- ... -->) как точные совпадения
    const getSectionBetween = (text: string, start: string, endMarkers: string[]) => {
      const findMarker = (haystack: string, needle: string, fromIdx = 0) => {
        // html-комментарии и литеральные \n\n матчим как есть, без нормализации
        if (needle.startsWith("<!--") || needle === "\n\n") {
          return haystack.indexOf(needle, fromIdx);
        }
        // строим карту "позиция в нормализованной строке -> позиция в исходной"
        const normalized = normalizeForHeaderSearch(haystack);
        const idx = normalized.toLowerCase().indexOf(needle.toLowerCase(), fromIdx);
        if (idx === -1) return -1;
        // т.к. normalize только удаляет/заменяет посимвольно через regex,
        // длины меняются — проще найти приблизительную позицию через regex по исходнику
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // допускаем эмодзи/маркеры/пробелы перед заголовком, двоеточие и пробелы после
        const re = new RegExp(
          `(^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*[\\p{Emoji_Presentation}\\p{Extended_Pictographic}\\s]*${escaped}[\\s:：]*(?:\\*\\*|__)?\\s*(?=\\n|$)`,
          "iu",
        );
        const slice = haystack.substring(fromIdx);
        const m = slice.match(re);
        if (!m || m.index === undefined) return -1;
        // возвращаем позицию КОНЦА строки заголовка (чтобы тело начиналось со следующей строки)
        const matchStart = fromIdx + m.index + (m[1] ? m[1].length : 0);
        const lineEnd = haystack.indexOf("\n", matchStart);
        return lineEnd === -1 ? matchStart + m[0].length : lineEnd;
      };

      const startIndex = findMarker(text, start);
      if (startIndex === -1) return "";
      const endIndexes = endMarkers
        .map((marker) => findMarker(text, marker, startIndex))
        .filter((idx) => idx !== -1);
      const endIndex = endIndexes.length > 0 ? Math.min(...endIndexes) : text.length;
      return text.substring(startIndex, endIndex).trim();
    };

    const parseBullets = (text: string) =>
      text
        .split("\n")
        .map((line) =>
          line
            .trim()
            // снимаем буллеты: •, -, *, –, —, и нумерацию "1." / "1)"
            .replace(/^([•\-*–—]|\d+[.)])\s*/, "")
            .trim(),
        )
        .filter(Boolean)
        .slice(0, 10);

    // Нормализатор заголовков: убирает эмодзи/markdown-маркеры, чтобы
    // ИИ мог писать "## 💊 Нутрицевтики" / "Нутрицевтики:" / "**Нутрицевтики**"
    // — парсер всё равно найдёт секцию.
    const normalizeForHeaderSearch = (text: string) =>
      text
        // удаляем все эмодзи и пиктограммы (диапазоны Unicode)
        .replace(
          /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F1FF}\u{2300}-\u{23FF}]/gu,
          "",
        )
        // убираем markdown-обёртки заголовков и выделений
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        // убираем хвостовые двоеточия у заголовков
        .replace(/[:：]\s*$/gm, "");

    const inferDurationMonths = (duration: string) => {
      const normalized = duration.toLowerCase();
      const numberMatch = normalized.match(/(\d+)\s*(месяц|мес)/);
      if (numberMatch) {
        const months = Number(numberMatch[1]);
        return [1, 2, 3, 4, 6].includes(months) ? months : 3;
      }
      if (normalized.includes("полгода") || normalized.includes("6")) return 6;
      if (normalized.includes("контроль")) return 3;
      return 3;
    };

    const parsePrescriptionsMarkdown = (content: string) => {
      const body = getSectionBetween(content, "Нутрицевтики", [
        "Питание и коррекция образа жизни",
        "Дополнительные консультации",
        "<!-- anchor:actions_end -->",
      ]);
      if (!body.trim()) return [];

      // Разбиваем на блоки: каждый блок начинается со строки-имени препарата
      // и обязательно содержит строку "Форма:" где-то ниже.
      // Имя — строка БЕЗ двоеточия (в отличие от полей вида "Форма:", "Дозировка:").
      // Старый regex /\n(?=[^\n:]{2,120}\nФорма:\s*)/ требовал, чтобы Форма: шла
      // СРАЗУ после имени, что часто ломалось. Новый подход: ищем все позиции
      // строк "Форма:" и для каждой откатываемся к предыдущему имени.
      const lines = body.split("\n");
      const blocks: string[] = [];
      let currentBlock: string[] = [];
      const isFieldLine = (l: string) =>
        /^(Форма|Дозировка|Как принимать|Длительность|Причина|На что влияет|Эффект)\s*[:：]/i.test(
          l.trim(),
        );
      // Заголовки секций, которые НЕ являются именами препаратов.
      // Парсер должен их пропускать, иначе первое назначение получает имя
      // вроде "Нутрицевтики" вместо реального названия добавки.
      const SECTION_HEADER_RE =
        /^(#{1,6}\s*)?\**\s*(нутрицевтики|витамины|добавки|препараты|минералы|бады|нутрицевтика|питание[\s\S]*|физическая активность|сон[\s\S]*|дополнительные консультации[\s\S]*)\s*\**\s*[:：]?\s*$/i;
      const isSectionHeader = (l: string) => {
        const t = l.trim()
          .replace(/^[#>\s]+/, "")
          .replace(/\*\*/g, "")
          .replace(/[:：]\s*$/, "")
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F1FF}\u{2300}-\u{23FF}]/gu, "")
          .trim();
        return SECTION_HEADER_RE.test(t);
      };
      const isLikelyName = (l: string) => {
        const t = l.trim().replace(/^\d+[.)]\s*/, "");
        if (!t) return false;
        if (isFieldLine(t)) return false;
        if (t.startsWith("•") || t.startsWith("-") || t.startsWith("*")) return false;
        if (t.startsWith("#")) return false; // markdown header
        if (isSectionHeader(t)) return false; // "Нутрицевтики" и т.п.
        // Имя — короткая строка без двоеточия в начале и не пустая
        return t.length >= 2 && t.length <= 200;
      };

      for (const rawLine of lines) {
        const line = rawLine;
        // Если строка похожа на имя нового препарата и текущий блок уже содержит "Форма:" —
        // закрываем текущий блок.
        if (
          isLikelyName(line) &&
          currentBlock.some((l) => /^Форма\s*[:：]/i.test(l.trim()))
        ) {
          blocks.push(currentBlock.join("\n").trim());
          currentBlock = [line];
        } else {
          currentBlock.push(line);
        }
      }
      if (currentBlock.length) blocks.push(currentBlock.join("\n").trim());

      return blocks
        .filter((block) => /Форма\s*[:：]/i.test(block) || /Дозировка\s*[:：]/i.test(block))
        .map((block) => {
          const blockLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
          // Имя — первая строка, которая не является полем
          const nameLine = blockLines.find(
            (l) => !isFieldLine(l) && !l.startsWith("•") && !l.startsWith("-") && !isSectionHeader(l),
          );
          const name = (nameLine || "").replace(/^\d+[.)]\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();

          const readField = (label: string) => {
            const re = new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, "i");
            for (const l of blockLines) {
              const m = l.match(re);
              if (m) return m[1].trim();
            }
            return "";
          };

          // "На что влияет" — многострочный блок буллетов
          const effectIdx = blockLines.findIndex((l) => /^На что влияет\s*[:：]/i.test(l));
          let effect = "";
          if (effectIdx !== -1) {
            const effectLines: string[] = [];
            for (let i = effectIdx + 1; i < blockLines.length; i++) {
              const l = blockLines[i];
              if (isFieldLine(l) || isLikelyName(l)) break;
              effectLines.push(l);
            }
            effect = parseBullets(effectLines.join("\n")).join("\n");
          }

          const duration = readField("Длительность");
          return {
            name: name.substring(0, 500),
            form: readField("Форма").substring(0, 500),
            dosage: readField("Дозировка").substring(0, 500),
            how_to_take: readField("Как принимать").substring(0, 1000),
            duration: duration.substring(0, 500),
            prescription: name.substring(0, 5000),
            reason: readField("Причина").substring(0, 2000),
            effect: effect.substring(0, 5000),
            duration_months: inferDurationMonths(duration),
          };
        })
        .filter((p) => p.name || p.prescription);
    };

    const parseAdvisoryMarkdown = (content: string) => {
      // Принимаем варианты заголовков: «Питание и коррекция образа жизни»,
      // «Образ жизни», «Lifestyle» и т.п.
      let lifestyle = getSectionBetween(content, "Питание и коррекция образа жизни", [
        "Дополнительные консультации",
        "<!-- anchor:actions_end -->",
      ]);
      if (!lifestyle) {
        lifestyle = getSectionBetween(content, "Образ жизни", [
          "Дополнительные консультации",
          "<!-- anchor:actions_end -->",
        ]);
      }
      lifestyleFinal = {
        nutrition: parseBullets(
          getSectionBetween(lifestyle, "Питание", ["Физическая активность", "Сон и режим", "Сон"]),
        ),
        activity: parseBullets(
          getSectionBetween(lifestyle, "Физическая активность", ["Сон и режим", "Сон"]),
        ),
        sleep: parseBullets(
          getSectionBetween(lifestyle, "Сон и режим", []) ||
            getSectionBetween(lifestyle, "Сон", []),
        ),
      };

      let followUps = getSectionBetween(content, "Дополнительные консультации и обследования", [
        "<!-- anchor:actions_end -->",
      ]);
      if (!followUps) {
        followUps = getSectionBetween(content, "Дополнительные консультации", [
          "<!-- anchor:actions_end -->",
        ]);
      }
      // Допускаем разные разделители: → / -> / — / – / : / | (любой из них считается валидным)
      const SEP_RE = /\s*(?:→|->|—|–|:|\|)\s*/;
      followUpsFinal = followUps
        .split("\n")
        .map((line) => line.trim().replace(/^([•\-*]|\d+[.)])\s*/, ""))
        .filter((line) => SEP_RE.test(line))
        .map((line) => {
          const parts = line.split(SEP_RE).map((p) => p.trim());
          const [specialist = "", goal = "", trigger = ""] = parts;
          return {
            specialist: specialist.substring(0, 200),
            goal: goal.substring(0, 500),
            trigger: trigger.substring(0, 500),
          };
        })
        .filter((f) => f.specialist && f.goal)
        .slice(0, 15);
    };

    // Извлекаем рекомендательные секции из отчётов (между anchor:actions_start и anchor:actions_end)
    const categoryRecommendations = Object.entries(categoryReports)
      .map(([category, report]) => {
        const recStart = report.indexOf('<!-- anchor:actions_start -->');
        const recEnd = report.indexOf('<!-- anchor:actions_end -->');
        if (recStart !== -1 && recEnd !== -1 && recEnd > recStart) {
          const recContent = report.substring(recStart + '<!-- anchor:actions_start -->'.length, recEnd).trim();
          if (recContent) return `${category}:\n${recContent}`;
        }
        const actionMatch = report.match(/#{2,3}\s+🎯[^\n]*\n([\s\S]*?)(?=\n#{2,3}\s+|$)/);
        if (actionMatch) return `${category}:\n${actionMatch[1].trim()}`;
        return null;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    try {
      const prescriptionsSystemPrompt = promptSettings?.find(p => p.key === 'prescriptions_system');
      const prescriptionsUserPrompt = promptSettings?.find(p => p.key === 'prescriptions_user');

      if (!prescriptionsSystemPrompt || !prescriptionsUserPrompt) {
        console.log("Prescriptions prompts not found, skipping prescriptions generation");
      } else {
        const prescPatientGender = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
        
        const abnormalBiomarkers = analysis.analysis_values
          .filter((av: any) => {
            let normalMin = av.biomarkers.normal_min;
            let normalMax = av.biomarkers.normal_max;
            let critMin = av.biomarkers.critical_min;
            let critMax = av.biomarkers.critical_max;
            
            if (age && prescPatientGender && av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges && av.biomarkers.age_ranges[prescPatientGender]) {
              const ageRange = av.biomarkers.age_ranges[prescPatientGender].find(
                (r: any) => age >= r.age_from && age <= r.age_to
              );
              if (ageRange) {
                normalMin = ageRange.min ?? normalMin;
                normalMax = ageRange.max ?? normalMax;
                critMin = ageRange.critical_min ?? critMin;
                critMax = ageRange.critical_max ?? critMax;
              }
            }
            
            if (normalMin === null && prescPatientGender === 'male' && av.biomarkers.normal_min_male !== null) {
              normalMin = av.biomarkers.normal_min_male;
              normalMax = av.biomarkers.normal_max_male;
            } else if (normalMin === null && prescPatientGender === 'female' && av.biomarkers.normal_min_female !== null) {
              normalMin = av.biomarkers.normal_min_female;
              normalMax = av.biomarkers.normal_max_female;
            }
            if (critMin === null && prescPatientGender === 'male' && av.biomarkers.critical_min_male !== null) {
              critMin = av.biomarkers.critical_min_male;
              critMax = av.biomarkers.critical_max_male;
            } else if (critMin === null && prescPatientGender === 'female' && av.biomarkers.critical_min_female !== null) {
              critMin = av.biomarkers.critical_min_female;
              critMax = av.biomarkers.critical_max_female;
            }
            
            const isOutsideNormal = (normalMin !== null && av.value < normalMin) || (normalMax !== null && av.value > normalMax);
            const isCritical = (critMin !== null && av.value < critMin) || (critMax !== null && av.value > critMax);
            return isOutsideNormal || isCritical;
          })
          .map((av: any) => {
            let normalMin = av.biomarkers.normal_min;
            let normalMax = av.biomarkers.normal_max;
            let critMin = av.biomarkers.critical_min;
            let critMax = av.biomarkers.critical_max;
            
            if (age && prescPatientGender && av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges && av.biomarkers.age_ranges[prescPatientGender]) {
              const ageRange = av.biomarkers.age_ranges[prescPatientGender].find(
                (r: any) => age >= r.age_from && age <= r.age_to
              );
              if (ageRange) {
                normalMin = ageRange.min ?? normalMin;
                normalMax = ageRange.max ?? normalMax;
                critMin = ageRange.critical_min ?? critMin;
                critMax = ageRange.critical_max ?? critMax;
              }
            }
            if (normalMin === null && prescPatientGender === 'male' && av.biomarkers.normal_min_male !== null) {
              normalMin = av.biomarkers.normal_min_male;
              normalMax = av.biomarkers.normal_max_male;
            } else if (normalMin === null && prescPatientGender === 'female' && av.biomarkers.normal_min_female !== null) {
              normalMin = av.biomarkers.normal_min_female;
              normalMax = av.biomarkers.normal_max_female;
            }
            if (critMin === null && prescPatientGender === 'male' && av.biomarkers.critical_min_male !== null) {
              critMin = av.biomarkers.critical_min_male;
              critMax = av.biomarkers.critical_max_male;
            } else if (critMin === null && prescPatientGender === 'female' && av.biomarkers.critical_min_female !== null) {
              critMin = av.biomarkers.critical_min_female;
              critMax = av.biomarkers.critical_max_female;
            }
            
            const isCritical = (critMin !== null && av.value < critMin) || (critMax !== null && av.value > critMax);
            const statusLabel = isCritical ? '🔴 КРИТИЧНО' : '🟠 РИСК';
            return `${av.biomarkers.name}: ${av.value} ${av.biomarkers.unit} (норма: ${normalMin || "?"}-${normalMax || "?"}) — ${statusLabel}`;
          })
          .join('\n');

        const keyFindings = Object.entries(categoryReports)
          .map(([category, report]) => `${category}: ${report.substring(0, 3000)}...`)
          .join('\n\n');

        const finalPrescriptionsPrompt = prescriptionsUserPrompt.prompt_text
          .replace('{userContext}', userContext)
          .replace('{keyFindings}', keyFindings)
          .replace('{abnormalBiomarkers}', abnormalBiomarkers || 'Все показатели в пределах нормы')
          .replace('{allBiomarkers}', globalBiomarkersSummary)
          .replace('{categoryRecommendations}', categoryRecommendations || 'Нет извлечённых рекомендаций');

        console.log("Starting prescriptions AI call...");

        const prescriptionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiProfile.model,
            ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
            messages: [
              { 
                role: "system", 
                content: prescriptionsSystemPrompt.prompt_text
              },
              { 
                role: "user", 
                content: finalPrescriptionsPrompt 
              }
            ]
          }),
        });

        if (prescriptionsResponse.ok) {
          const prescriptionsData = await prescriptionsResponse.json();
          const content = prescriptionsData.choices?.[0]?.message?.content || "";
          prescriptionsRawContent = content;
          
          console.log(`Got prescriptions content snippet: ${content.substring(0, 200)}...`);

          // ===== MARKDOWN-FIRST PARSER =====
          // Промпт `prescriptions_system` — Markdown. Парсим его в первую очередь.
          // JSON оставлен как safety-net на случай, если ИИ вернёт JSON.
          let parserUsed: "markdown" | "json" | "none" = "none";
          try {
            const mdPrescriptions = parsePrescriptionsMarkdown(content);
            if (mdPrescriptions.length > 0) {
              prescriptionsToCreateFinal = mdPrescriptions;
              parseAdvisoryMarkdown(content); // заполняет lifestyleFinal + followUpsFinal
              parserUsed = "markdown";
              console.log(
                `[prescriptions] Markdown parser: ${mdPrescriptions.length} items, lifestyle ${lifestyleFinal.nutrition.length}/${lifestyleFinal.activity.length}/${lifestyleFinal.sleep.length}, follow-ups ${followUpsFinal.length}`,
              );
            } else {
              console.warn("[prescriptions] Markdown parser returned 0 items, trying JSON fallback");
            }
          } catch (mdErr) {
            console.error("[prescriptions] Markdown parser threw:", mdErr);
          }

          // JSON-фоллбек — только если Markdown ничего не дал
          if (parserUsed === "none") {
            try {
              const jsonStart = content.indexOf("{");
              const jsonEnd = content.lastIndexOf("}") + 1;
              if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = content.substring(jsonStart, jsonEnd);
                const parsed = JSON.parse(jsonStr);
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

                const cleanBullets = (arr: any): string[] =>
                  Array.isArray(arr)
                    ? arr
                        .map((s: any) => (typeof s === "string" ? s.trim() : ""))
                        .filter((s) => s.length > 0)
                        .map((s) => s.substring(0, 1000))
                        .slice(0, 10)
                    : [];
                const ls = parsed.lifestyle || {};
                lifestyleFinal = {
                  nutrition: cleanBullets(ls.nutrition),
                  activity: cleanBullets(ls.activity),
                  sleep: cleanBullets(ls.sleep),
                };

                followUpsFinal = Array.isArray(parsed.follow_ups)
                  ? parsed.follow_ups
                      .map((f: any) => ({
                        specialist: (f?.specialist || "").toString().trim().substring(0, 200),
                        goal: (f?.goal || "").toString().trim().substring(0, 500),
                        trigger: (f?.trigger || "").toString().trim().substring(0, 500),
                      }))
                      .filter((f: any) => f.specialist && f.goal)
                      .slice(0, 15)
                  : [];

                if (prescriptionsToCreateFinal.length > 0) {
                  parserUsed = "json";
                  console.log(`[prescriptions] JSON fallback parser: ${prescriptionsToCreateFinal.length} items`);
                }
              }
            } catch (jsonErr) {
              console.error("[prescriptions] JSON fallback parser failed:", jsonErr);
            }
          }

          if (parserUsed === "none") {
            prescriptionsStatus = content.trim() ? "markdown_fallback" : "error";
            console.error(
              "[prescriptions] BOTH parsers failed. Raw content (first 500 chars):",
              content.substring(0, 500),
            );
          } else {
            prescriptionsStatus = "success";
            console.log(
              `[prescriptions] Final: ${prescriptionsToCreateFinal.length} prescriptions via ${parserUsed}`,
            );
          }

        } else {
          const errorText = await prescriptionsResponse.text();
          console.error("Failed to generate prescriptions:", prescriptionsResponse.status, errorText);
          prescriptionsStatus = "error";
        }
      }
    } catch (error: any) {
      console.error("Error generating prescriptions:", error);
      prescriptionsStatus = "error";
    }

    // ====== СОХРАНЯЕМ НАЗНАЧЕНИЯ В БД СРАЗУ (до summary/snapshot/bio-age — те делает finalize-analysis) ======
    if (prescriptionsToCreateFinal.length > 0) {
      const analysisDate = new Date(analysis.date);
      for (const prescription of prescriptionsToCreateFinal) {
        const controlDate = new Date(analysisDate);
        controlDate.setMonth(controlDate.getMonth() + prescription.duration_months);

        const { error: prescriptionError } = await supabase
          .from("prescriptions")
          .insert({
            user_id: analysis.user_id,
            analysis_id: analysisId,
            recommendation_id: null, // будет связан в finalize-analysis после создания «Общего резюме»
            name: prescription.name || null,
            form: prescription.form || null,
            dosage: prescription.dosage || null,
            how_to_take: prescription.how_to_take || null,
            duration: prescription.duration || null,
            prescription: prescription.prescription,
            reason: prescription.reason,
            effect: prescription.effect,
            control_date: controlDate.toISOString().split('T')[0],
            status: "on_review",
            is_archived: false,
            created_by: null
          });

        if (prescriptionError) {
          console.error("Error creating prescription:", prescriptionError);
        } else {
          prescriptionsCreated++;
        }
      }
      console.log(`Successfully created ${prescriptionsCreated} prescriptions in database`);
    } else if (prescriptionsStatus === "success") {
      console.log("No prescriptions were needed based on analysis");
    }

    // ====== Сохраняем «Питание/образ жизни» и «Доп. обследования» как отдельную запись ======
    const hasLifestyle =
      lifestyleFinal.nutrition.length + lifestyleFinal.activity.length + lifestyleFinal.sleep.length > 0;
    const hasFollowUps = followUpsFinal.length > 0;
    const hasMarkdownFallback = prescriptionsStatus === "markdown_fallback" && prescriptionsRawContent.trim().length > 0;

    if (hasLifestyle || hasFollowUps || hasMarkdownFallback) {
      const summaryParts: string[] = [];
      if (hasLifestyle) {
        const totalBullets =
          lifestyleFinal.nutrition.length + lifestyleFinal.activity.length + lifestyleFinal.sleep.length;
        summaryParts.push(`Питание и образ жизни: ${totalBullets} рекомендаций`);
      }
      if (hasFollowUps) {
        summaryParts.push(`Дополнительные обследования: ${followUpsFinal.length}`);
      }
      if (hasMarkdownFallback) {
        summaryParts.push("Назначения сохранены в текстовом формате");
      }
      const summaryText = summaryParts.join(". ") + ".";

      const { error: rxRecError } = await supabase
        .from("recommendations")
        .insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          type: "Назначения",
          text: hasMarkdownFallback ? prescriptionsRawContent : summaryText,
          content_json: {
            lifestyle: lifestyleFinal,
            follow_ups: followUpsFinal,
            ...(hasMarkdownFallback ? { raw_markdown: prescriptionsRawContent } : {}),
          },
        });

      if (rxRecError) {
        console.error("Error inserting Назначения recommendation:", rxRecError);
      } else {
        console.log(
          `Saved «Назначения» recommendation: lifestyle=${hasLifestyle}, follow_ups=${followUpsFinal.length}`
        );
      }
    }
    // (skipPrescriptions handling: no wrapping if-block; controlled by early return below if needed)

    // ====== ЗАПУСКАЕМ FINALIZE-ANALYSIS (summary + snapshot + bio age) ======
    // В step-режиме оркестратор сам триггерит finalize-analysis отдельным шагом.
    let finalizeTriggered = false;
    if (!skipFinalize) {
    try {
      const finalizeUrl = `${supabaseUrl}/functions/v1/finalize-analysis`;
      // Не ждём ответа — finalize сам берёт работу в waitUntil и возвращает 202.
      const finalizePromise = fetch(finalizeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ analysisId, mode }),
      })
        .then(async (r) => {
          const txt = await r.text();
          console.log(`finalize-analysis triggered: status=${r.status}, body=${txt.slice(0, 200)}`);
        })
        .catch((err) => console.error("Failed to trigger finalize-analysis:", err));

      const edgeRuntime = globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
      };
      if (edgeRuntime.EdgeRuntime?.waitUntil) {
        edgeRuntime.EdgeRuntime.waitUntil(finalizePromise);
      } else {
        void finalizePromise;
      }
      finalizeTriggered = true;
    } catch (e: any) {
      console.error("Error scheduling finalize-analysis:", e);
    }
    } // end of `if (!skipFinalize)`

    // health_index/biological_age/metadata теперь рассчитываются в finalize-analysis

    const estimatedCostCredits = (totalTokens / 50000).toFixed(2);

    console.log(`Analysis completed. Total tokens: ${totalTokens}, Estimated cost: ${estimatedCostCredits} credits`);

    return new Response(
      JSON.stringify({
        success: true,
        categories_processed: categoryStatuses,
        total_tokens: totalTokens,
        estimated_cost_credits: estimatedCostCredits,
        prescriptions_created: prescriptionsCreated,
        prescriptions_status: prescriptionsStatus,
        finalize_triggered: finalizeTriggered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-biomarkers:", error);
    // Возвращаем 200 + поле error, чтобы клиент supabase-js не превращал
    // ответ в невнятный FunctionsFetchError ("Failed to send a request...").
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Неизвестная ошибка при анализе биомаркеров",
        stack: error?.stack ? String(error.stack).slice(0, 500) : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
