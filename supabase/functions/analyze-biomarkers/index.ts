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

  let body: { analysisId?: string; mode?: unknown; background?: boolean } = {};
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

  // Глубокий отчёт почти всегда длиннее клиентского/relay timeout.
  // Поэтому запрос подтверждаем сразу, а сам pipeline продолжаем внутри этого же runtime.
  if (mode === "deep" && !body.background) {
    const runPromise = processAnalysis({ analysisId: body.analysisId, rawMode: body.mode })
      .then((response) => console.log(`Deep analysis background completed with status ${response.status}`))
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
      JSON.stringify({ success: true, accepted: true, mode, analysisId: body.analysisId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return processAnalysis({ analysisId: body.analysisId, rawMode: body.mode });
});

async function processAnalysis({ analysisId, rawMode }: { analysisId: string; rawMode?: unknown }) {
  try {
    // ===== Режим генерации: standard (быстрее, дефолт) | deep (качественнее, медленнее) =====
    const mode: "standard" | "deep" = rawMode === "deep" ? "deep" : "standard";
    const aiProfile = mode === "deep"
      ? {
          model: "google/gemini-3-flash-preview",
        reasoning: { effort: "low" as const },
        tokenMultiplier: 1,
        maxRetries: 1,
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

    // Сохраняем "Данные пациента" сразу — клиент увидит прогресс
    await supabase.from("recommendations").insert({
      user_id: analysis.user_id,
      analysis_id: analysisId,
      type: "Данные пациента",
      text: patientDataSection
    });
    console.log("Saved: Данные пациента");

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

    // Параллельные запросы для каждой категории
    const categoryReports: Record<string, string> = {};
    const categoryStatuses: Record<string, any> = {};
    let totalTokens = 0;

    const categoryPromises = Object.entries(categorizedBiomarkers).map(async ([category, biomarkers]) => {
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

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: systemPrompt
              },
              {
                role: "user",
                content: categoryPrompt
              }
            ],
            // Метаболизм требует больше токенов из-за расширенного промпта (печень+почки+электролиты+детоксикация)
            max_completion_tokens: categoryMaxCompletionTokens
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
      }
    });

    // Ждем завершения всех категорий
    await Promise.all(categoryPromises);

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
    let prescriptionsToCreateFinal: Array<{ name: string; form: string; dosage: string; how_to_take: string; duration: string; prescription: string; reason: string; effect: string; duration_months: number }> = [];
    // Дополнительные блоки раздела «Назначения»: питание/образ жизни и доп. обследования.
    // Сохраняются в recommendations.content_json (type = 'Назначения').
    let lifestyleFinal: { nutrition: string[]; activity: string[]; sleep: string[] } = { nutrition: [], activity: [], sleep: [] };
    let followUpsFinal: Array<{ specialist: string; goal: string; trigger: string }> = [];

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
                content: prescriptionsSystemPrompt.prompt_text + "\n\nВажно: Верни ТОЛЬКО валидный JSON в формате: {\"prescriptions\": [{\"name\": \"короткое название (например Витамин D3)\", \"form\": \"биодоступная форма (например холекальциферол)\", \"dosage\": \"дозировка (например 5000 МЕ)\", \"how_to_take\": \"схема приёма (например 1 капсула ежедневно утром с едой)\", \"duration\": \"длительность курса (например 6 месяцев)\", \"prescription\": \"полный текст назначения\", \"reason\": \"причина с биомаркером\", \"effect\": \"на что это влияет\", \"duration_months\": число}], \"lifestyle\": {\"nutrition\": [\"буллет 1\", \"буллет 2\"], \"activity\": [\"буллет 1\"], \"sleep\": [\"буллет 1\"]}, \"follow_ups\": [{\"specialist\": \"кардиолог\", \"goal\": \"оценка сосудистого риска\", \"trigger\": \"ЛПНП 4.2 ммоль/л\"}]}. Все три ключа (prescriptions, lifestyle, follow_ups) обязательны. Если какой-то блок неприменим — верни пустой массив/пустые массивы внутри объекта. Никакого дополнительного текста!"
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
          
          console.log(`Got prescriptions content snippet: ${content.substring(0, 200)}...`);

          try {
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            if (jsonStart === -1 || jsonEnd <= jsonStart) {
              throw new Error("No JSON found in response");
            }
            
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
                duration_months: [1, 2, 3, 4, 6].includes(p.duration_months) ? p.duration_months : 3
              }));

            // ── Lifestyle (питание / активность / сон) ──
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

            // ── Follow-ups (доп. консультации и обследования) ──
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

            console.log(`Parsed ${prescriptionsToCreateFinal.length} prescriptions, lifestyle bullets: ${lifestyleFinal.nutrition.length}/${lifestyleFinal.activity.length}/${lifestyleFinal.sleep.length}, follow-ups: ${followUpsFinal.length}`);
            prescriptionsStatus = "success";
          } catch (parseError) {
            console.error("Failed to parse prescriptions JSON:", parseError, "Content:", content);
            prescriptionsStatus = "error";
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

    // ====== ФОРМИРУЕМ ОБЩЕЕ РЕЗЮМЕ (ПОСЛЕ НАЗНАЧЕНИЙ — видит конкретные назначения) ======
    let summaryReport = "";
    try {
      const allReportsText = Object.entries(categoryReports).map(([cat, report]) => 
        `=== ${cat} ===\n${report.substring(0, 8000)}${report.length > 8000 ? '...' : ''}`
      ).join("\n\n");

      // Формируем список назначений для передачи в резюме
      const prescriptionsList = prescriptionsToCreateFinal.length > 0
        ? prescriptionsToCreateFinal.map((p, i) => `${i + 1}. ${p.prescription} — ${p.reason}`).join('\n')
        : 'Назначения не сгенерированы';

      const summaryUserPromptTemplate = prompts['summary_user'];
      
      if (!summaryUserPromptTemplate) {
        console.error("Summary user prompt not found in database");
        throw new Error("Промпт для общего резюме не найден в настройках");
      }

      let summaryPrompt = summaryUserPromptTemplate
        .replace(/{userContext}/g, userContext)
        .replace(/{allReportsText}/g, allReportsText)
        .replace(/{globalBiomarkers}/g, globalBiomarkersSummary)
        .replace(/{categoryRecommendations}/g, categoryRecommendations || 'Нет извлечённых рекомендаций')
        .replace(/{prescriptionsList}/g, prescriptionsList);

      // Inject contradictions warning into summary prompt
      if (contradictionsBlock) {
        summaryPrompt += "\n" + contradictionsBlock;
      }

      const summarySystemPrompt = prompts['summary_system'];
      
      if (!summarySystemPrompt) {
        console.error("Summary system prompt not found in database");
        throw new Error("Системный промпт для общего резюме не найден в настройках");
      }

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: summarySystemPrompt
            },
            {
              role: "user",
              content: summaryPrompt
            }
          ],
          max_completion_tokens: Math.round(16000 * aiProfile.tokenMultiplier)
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summaryFinishReason = summaryData.choices[0].finish_reason;
        summaryReport = summaryData.choices[0].message.content;
        const summaryPromptTokens = summaryData.usage?.prompt_tokens || 0;
        const summaryCompletionTokens = summaryData.usage?.completion_tokens || 0;
        const summaryTokens = summaryData.usage?.total_tokens || 0;
        const summaryContentLen = summaryReport?.length || 0;
        
        console.log(`Summary: finish_reason=${summaryFinishReason}, prompt_tokens=${summaryPromptTokens}, completion_tokens=${summaryCompletionTokens}, total_tokens=${summaryTokens}, content_length=${summaryContentLen}`);
        
        if (summaryFinishReason === "length") {
          console.warn("WARNING: Summary was truncated at token limit");
          summaryReport += "\n\n[⚠️ ВНИМАНИЕ: Резюме было сокращено из-за ограничения по длине. Рекомендуется перегенерировать.]";
        }
        
        totalTokens += summaryTokens;
      } else {
        console.error("Failed to generate summary");
        summaryReport = "Не удалось сгенерировать общее резюме";
      }
    } catch (error: any) {
      console.error("Error generating summary:", error);
      summaryReport = "Ошибка при генерации общего резюме";
    }

    // Сохраняем Общее резюме
    let prescriptionRecommendationId: string | null = null;

    if (summaryReport) {
      const { data: summaryInserted, error: summaryInsertError } = await supabase
        .from("recommendations")
        .insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          type: "Общее резюме",
          text: summaryReport
        })
        .select("id")
        .single();

      if (summaryInsertError) {
        console.error("Error inserting summary:", summaryInsertError);
      } else {
        prescriptionRecommendationId = summaryInserted?.id || null;
        console.log(`Saved: Общее резюме (id: ${prescriptionRecommendationId})`);
      }
    }

    // ====== ЭТАП 3: ГЕНЕРАЦИЯ STRUCTURED REPORT SNAPSHOT (JSON) ======
    // Из готовых текстовых отчётов + UUID биомаркеров строим единый JSON snapshot,
    // который становится источником истины для рендера на сайте и в PDF.
    // Старые text-поля сохраняются для обратной совместимости и админ-редактирования.
    const buildAndSaveSnapshot = async () => {
      try {
        console.log("Building report snapshot via AI tool calling...");

      // Список биомаркеров с UUID, именами, кодами и статусами — для AI
      const biomarkersForSnapshot = analysis.analysis_values.map((av: any) => ({
        biomarker_id: av.biomarker_id,
        name: av.biomarkers.name,
        code: av.biomarkers.code,
        category: av.biomarkers.category,
        value: av.value,
        unit: av.unit_override || av.biomarkers.unit,
      }));

      // Конкатенация всех текстовых отчётов категорий + резюме
      const categoryReportsForSnapshot = Object.entries(categoryReports)
        .map(([cat, txt]) => `### КАТЕГОРИЯ: ${cat}\n\n${txt}`)
        .join("\n\n---\n\n");

      const snapshotSystemPrompt = `Ты — преобразователь медицинских отчётов в структурированный JSON.

Твоя задача: на основе готовых текстовых отчётов по категориям и общего резюме построить единый структурированный snapshot для рендеринга.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. Используй ТОЛЬКО biomarker_id из переданного списка. НЕ выдумывай UUID.
2. Сохраняй ВСЕ биомаркеры пациента — каждый должен попасть в свою категорию как блок biomarker.
3. Структура отчёта (порядок блоков):
   - section "Общее резюме" + блок summary (scope: "overall") с текстом общего резюме
   - Для каждой категории биомаркеров:
     * section с названием категории и emoji
     * text-блоки с полным разбором категории (markdown как есть)
     * biomarker-блоки для всех маркеров этой категории — commentary это AI-комментарий о клиническом значении конкретного маркера (1-3 предложения, markdown)
     * spacer между категориями
4. НЕ создавай summary-блоки внутри категорий. Используй summary ТОЛЬКО для общего резюме (scope: "overall"). Категорийные тексты идут как обычные text-блоки.
5. НЕ дублируй данные биомаркера (значение, единицы, шкалы) в commentary — они подтянутся из БД автоматически.
6. В commentary биомаркера — только клиническая интерпретация и рекомендации, не повторяй число.
7. Сохраняй markdown-форматирование внутри полей content и commentary (жирный, списки, **выделения**).
8. Не добавляй блоки section с заголовками "Биомаркеры" или "Ключевые показатели" — структура и так очевидна.
9. version всегда = 1.

Возвращай результат через вызов функции build_report_snapshot.`;

      const snapshotUserPrompt = `СПИСОК БИОМАРКЕРОВ ПАЦИЕНТА (используй ТОЛЬКО эти biomarker_id):
${JSON.stringify(biomarkersForSnapshot, null, 2)}

ОБЩЕЕ РЕЗЮМЕ:
${summaryReport || "(нет)"}

ОТЧЁТЫ ПО КАТЕГОРИЯМ:
${categoryReportsForSnapshot}

Построй ReportSnapshot, точно следуя правилам в system prompt.`;

      // JSON schema для tool calling — соответствует REPORT_SNAPSHOT_JSON_SCHEMA из src/lib/reportSnapshot.ts
      const snapshotTool = {
        type: "function",
        function: {
          name: "build_report_snapshot",
          description: "Построить структурированный snapshot отчёта",
          parameters: {
            type: "object",
            properties: {
              // Намеренно без enum:[1] — Gemini ломает схему при enum на числе.
              // Версию контролируем валидацией Zod на бэке после JSON.parse.
              version: { type: "number", description: "Версия схемы, всегда 1" },
              blocks: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["text", "section", "summary", "biomarker", "spacer", "pagebreak"],
                    },
                    content: { type: "string", description: "Markdown — для type=text и type=summary" },
                    title: { type: "string", description: "Заголовок секции — для type=section" },
                    emoji: { type: "string", description: "Emoji категории — для type=section" },
                    scope: { type: "string", enum: ["overall", "category"], description: "Для type=summary" },
                    biomarker_id: { type: "string", description: "UUID — для type=biomarker (из списка)" },
                    commentary: { type: "string", description: "Клинический комментарий — для type=biomarker" },
                    size: { type: "string", enum: ["small", "medium", "large"], description: "Для type=spacer" },
                  },
                  required: ["type"],
                },
              },
            },
            required: ["version", "blocks"],
          },
        },
      };

      const snapshotResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiProfile.model,
          ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
          temperature: 0,
          messages: [
            { role: "system", content: snapshotSystemPrompt },
            { role: "user", content: snapshotUserPrompt },
          ],
          tools: [snapshotTool],
          tool_choice: { type: "function", function: { name: "build_report_snapshot" } },
        }),
      });

      if (!snapshotResponse.ok) {
        const errText = await snapshotResponse.text();
        console.error(`Snapshot AI call failed: ${snapshotResponse.status} ${errText}`);
        throw new Error(`Snapshot generation failed: ${snapshotResponse.status}`);
      }

      const snapshotData = await snapshotResponse.json();
      const toolCall = snapshotData.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall?.function?.arguments) {
        throw new Error("AI did not return snapshot tool call");
      }

      const snapshotJson = JSON.parse(toolCall.function.arguments);

      // Валидация на уровне UUID — AI мог что-то выдумать
      const validBiomarkerIds = new Set(biomarkersForSnapshot.map((b: any) => b.biomarker_id));
      const invalidBlocks: string[] = [];
      const cleanedBlocks = (snapshotJson.blocks || []).filter((block: any) => {
        if (block.type === "biomarker") {
          if (!validBiomarkerIds.has(block.biomarker_id)) {
            invalidBlocks.push(block.biomarker_id || "(нет id)");
            return false;
          }
        }
        return true;
      });

      if (invalidBlocks.length > 0) {
        console.warn(`Removed ${invalidBlocks.length} invalid biomarker blocks: ${invalidBlocks.join(", ")}`);
      }

      // Гарантия: все биомаркеры пациента должны быть в snapshot
      const includedBiomarkerIds = new Set(
        cleanedBlocks.filter((b: any) => b.type === "biomarker").map((b: any) => b.biomarker_id)
      );
      const missingBiomarkers = biomarkersForSnapshot.filter(
        (b: any) => !includedBiomarkerIds.has(b.biomarker_id)
      );

      if (missingBiomarkers.length > 0) {
        console.warn(`AI missed ${missingBiomarkers.length} biomarkers, appending fallback blocks`);
        // Группируем missing по категориям и добавляем в конец
        const missingByCategory = missingBiomarkers.reduce((acc: any, b: any) => {
          if (!acc[b.category]) acc[b.category] = [];
          acc[b.category].push(b);
          return acc;
        }, {});

        for (const [cat, markers] of Object.entries(missingByCategory)) {
          cleanedBlocks.push({ type: "section", title: `${cat} — дополнительные показатели` });
          for (const m of markers as any[]) {
            cleanedBlocks.push({
              type: "biomarker",
              biomarker_id: m.biomarker_id,
              commentary: "",
            });
          }
          cleanedBlocks.push({ type: "spacer", size: "medium" });
        }
      }

      const finalSnapshot = {
        version: 1 as const,
        blocks: cleanedBlocks,
        meta: {
          generated_at: new Date().toISOString(),
          model: aiProfile.model,
          mode,
          analysis_id: analysisId,
        },
      };

      console.log(
        `Snapshot built: ${cleanedBlocks.length} blocks (${
          cleanedBlocks.filter((b: any) => b.type === "biomarker").length
        } biomarkers)`
      );

      // Сохраняем snapshot в content_json записи "Общее резюме"
      if (prescriptionRecommendationId) {
        const { error: snapshotUpdateError } = await supabase
          .from("recommendations")
          // @ts-ignore — content_json появится в типах после регенерации
          .update({ content_json: finalSnapshot })
          .eq("id", prescriptionRecommendationId);

        if (snapshotUpdateError) {
          console.error("Failed to save snapshot:", snapshotUpdateError.message);
        } else {
          console.log(`Snapshot saved to recommendation ${prescriptionRecommendationId}`);
        }
      } else {
        console.warn("No summary recommendation id — snapshot not saved");
      }
      } catch (snapshotError: any) {
        console.error("Snapshot generation error (non-fatal):", snapshotError.message);
        // Не падаем — текстовые отчёты уже сохранены, фронт отрендерит fallback
      }
    };

    const edgeRuntime = globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
    };

    if (edgeRuntime.EdgeRuntime?.waitUntil) {
      edgeRuntime.EdgeRuntime.waitUntil(buildAndSaveSnapshot());
    } else {
      void buildAndSaveSnapshot();
    }

    // Сохраняем назначения в БД (после резюме, чтобы иметь prescriptionRecommendationId)
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
            recommendation_id: prescriptionRecommendationId,
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
    // type = 'Назначения', данные в content_json. Поле text — короткое summary
    // (для совместимости со старыми UI/админкой, которые могут отображать text).
    const hasLifestyle =
      lifestyleFinal.nutrition.length + lifestyleFinal.activity.length + lifestyleFinal.sleep.length > 0;
    const hasFollowUps = followUpsFinal.length > 0;

    if (hasLifestyle || hasFollowUps) {
      const summaryParts: string[] = [];
      if (hasLifestyle) {
        const totalBullets =
          lifestyleFinal.nutrition.length + lifestyleFinal.activity.length + lifestyleFinal.sleep.length;
        summaryParts.push(`Питание и образ жизни: ${totalBullets} рекомендаций`);
      }
      if (hasFollowUps) {
        summaryParts.push(`Дополнительные обследования: ${followUpsFinal.length}`);
      }
      const summaryText = summaryParts.join(". ") + ".";

      const { error: rxRecError } = await supabase
        .from("recommendations")
        .insert({
          user_id: analysis.user_id,
          analysis_id: analysisId,
          type: "Назначения",
          text: summaryText,
          content_json: {
            lifestyle: lifestyleFinal,
            follow_ups: followUpsFinal,
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

    // ============== STANDARDIZED BIOLOGICAL AGE CALCULATION ==============
    
    // Define patient age and gender for age-dependent norm calculations
    const patientAge = age;
    const patientGender = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
    
    // Строим композитный набор биомаркеров (окно 4 месяца)
    const compositeBiomarkers = buildCompositeBiomarkers(
      analysis,
      previousAnalyses || [],
      4 // окно 4 месяца
    );

    const totalValues = compositeBiomarkers.values.length;
    
    let health_index = null;
    let biological_age = null;
    let biomarkers_metadata = null;
    
    // ---- Server-side calculateHealthIndex ----
    function calculateHealthIndex(
      biomarkerValues: any[],
      patientAge: number | null,
      patientGender: string | null,
      totalBiomarkersInSystem: number,
      patientBMI: number | null = null
    ): { raw: number; adjusted: number; coverage: number; confidenceFactor: number; penalties: any[] } {
      let totalPenalty = 0;
      const penalties: any[] = [];
      
      for (const av of biomarkerValues) {
        // Determine correct ranges
        let normalMin = av.biomarkers.normal_min;
        let normalMax = av.biomarkers.normal_max;
        let optimalMin = av.biomarkers.optimal_min;
        let optimalMax = av.biomarkers.optimal_max;
        let criticalMin = av.biomarkers.critical_min;
        let criticalMax = av.biomarkers.critical_max;
        
        if (av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges && patientGender && patientAge !== null) {
          const ageRanges = av.biomarkers.age_ranges[patientGender];
          if (ageRanges) {
            const ageRange = ageRanges.find((r: any) => 
              patientAge >= r.age_from && patientAge <= r.age_to
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
        }
        
        if (normalMin === av.biomarkers.normal_min && patientGender === 'male' && av.biomarkers.normal_min_male !== null) {
          normalMin = av.biomarkers.normal_min_male;
          normalMax = av.biomarkers.normal_max_male;
        } else if (normalMin === av.biomarkers.normal_min && patientGender === 'female' && av.biomarkers.normal_min_female !== null) {
          normalMin = av.biomarkers.normal_min_female;
          normalMax = av.biomarkers.normal_max_female;
        }
        if (optimalMin === null && patientGender === 'male' && av.biomarkers.optimal_min_male !== null) {
          optimalMin = av.biomarkers.optimal_min_male; optimalMax = av.biomarkers.optimal_max_male;
        } else if (optimalMin === null && patientGender === 'female' && av.biomarkers.optimal_min_female !== null) {
          optimalMin = av.biomarkers.optimal_min_female; optimalMax = av.biomarkers.optimal_max_female;
        }
        if (criticalMin === null && patientGender === 'male' && av.biomarkers.critical_min_male !== null) {
          criticalMin = av.biomarkers.critical_min_male; criticalMax = av.biomarkers.critical_max_male;
        } else if (criticalMin === null && patientGender === 'female' && av.biomarkers.critical_min_female !== null) {
          criticalMin = av.biomarkers.critical_min_female; criticalMax = av.biomarkers.critical_max_female;
        }
        
        if (normalMin === null && normalMax === null) continue;
        
        const range = (normalMin !== null && normalMax !== null) ? normalMax - normalMin : 1;
        if (normalMin !== null && normalMax !== null && range <= 0) continue;
        
        const agingWeight = av.biomarkers.aging_weight || 1.0;
        
        // 4-tier penalty calculation
        let penalty = 0;
        let tier = 'optimal';
        
        const isCriticalLow = criticalMin !== null && av.value < criticalMin;
        const isCriticalHigh = criticalMax !== null && av.value > criticalMax;
        const isOutsideNormal = 
          (normalMin !== null && av.value < normalMin) || 
          (normalMax !== null && av.value > normalMax);
        const isInOptimal = (optimalMin !== null || optimalMax !== null)
          ? (optimalMin === null || av.value >= optimalMin) && 
            (optimalMax === null || av.value <= optimalMax)
          : !isOutsideNormal;
        
        if (isCriticalLow || isCriticalHigh) {
          penalty = 15 * agingWeight; // Critical
          tier = 'critical';
        } else if (isOutsideNormal) {
          penalty = 5 * agingWeight; // Risk
          tier = 'risk';
        } else if (!isInOptimal) {
          penalty = 1 * agingWeight; // Acceptable (within normal but not optimal)
          tier = 'acceptable';
        }
        // Optimal = 0 penalty
        
        totalPenalty += penalty;
        if (penalty > 0) {
          penalties.push({
            name: av.biomarkers.name,
            code: av.biomarkers.code,
            tier,
            penalty,
            weight: agingWeight
          });
        }
      }
      
      // BMI as virtual biomarker
      let bmiMarkerAdded = false;
      if (patientBMI !== null) {
        const bmiWeight = 5.0;
        let bmiPenalty = 0;
        let bmiTier = 'optimal';
        
        if (patientBMI > 30 || patientBMI < 16) {
          bmiPenalty = 15 * bmiWeight;
          bmiTier = 'critical';
        } else if (patientBMI > 27 || patientBMI < 17) {
          bmiPenalty = 5 * bmiWeight;
          bmiTier = 'risk';
        } else if (patientBMI > 25 || patientBMI < 18.5) {
          bmiPenalty = 1 * bmiWeight;
          bmiTier = 'acceptable';
        }
        
        totalPenalty += bmiPenalty;
        bmiMarkerAdded = true;
        
        if (bmiPenalty > 0) {
          penalties.push({
            name: 'Индекс массы тела',
            code: 'BMI',
            tier: bmiTier,
            penalty: bmiPenalty,
            weight: bmiWeight
          });
        }
        
        console.log(`BMI ${patientBMI}: tier=${bmiTier}, penalty=${bmiPenalty}`);
      }
      
      // Normalize: avg_penalty × 15
      const markerCount = biomarkerValues.filter(av => {
        let nMin = av.biomarkers.normal_min;
        let nMax = av.biomarkers.normal_max;
        if (av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges && patientGender && patientAge !== null) {
          const ageRanges = av.biomarkers.age_ranges[patientGender];
          if (ageRanges) {
            const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
            if (ageRange) { nMin = ageRange.min; nMax = ageRange.max; }
          }
        }
        if (nMin === av.biomarkers.normal_min && patientGender === 'male' && av.biomarkers.normal_min_male !== null) { nMin = av.biomarkers.normal_min_male; nMax = av.biomarkers.normal_max_male; }
        else if (nMin === av.biomarkers.normal_min && patientGender === 'female' && av.biomarkers.normal_min_female !== null) { nMin = av.biomarkers.normal_min_female; nMax = av.biomarkers.normal_max_female; }
        if (nMin === null && nMax === null) return false;
        if (nMin !== null && nMax !== null && (nMax - nMin) <= 0) return false;
        return true;
      }).length + (bmiMarkerAdded ? 1 : 0);
      
      if (markerCount === 0) return { raw: 70, adjusted: 70, coverage: 0, confidenceFactor: 0, penalties: [] };
      
      const avgPenalty = totalPenalty / markerCount;
      const rawHealthIndex = Math.max(0, Math.min(100, 100 - avgPenalty * 15));
      
      // Confidence factor based on coverage
      const coverage = markerCount / totalBiomarkersInSystem;
      const confidenceFactor = Math.min(1.0, coverage / 0.5);
      
      // Confidence factor is informational only (for UI), does not affect score
      const adjustedHealthIndex = rawHealthIndex;
      
      return {
        raw: Math.round(rawHealthIndex * 10) / 10,
        adjusted: Math.round(adjustedHealthIndex * 10) / 10,
        coverage: Math.round(coverage * 100),
        confidenceFactor: Math.round(confidenceFactor * 100) / 100,
        penalties: penalties.sort((a, b) => b.penalty - a.penalty).slice(0, 10)
      };
    }
    
    // ---- Server-side calculateBaseBioAge ----
    function calculateBaseBioAge(chronologicalAge: number, healthIndex: number): number {
      return chronologicalAge + (70 - healthIndex) * 0.15;
    }
    
    if (totalValues > 0) {
      // Get biomarkers count from patient's subscription plan (not all system biomarkers)
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
        
        if (count && count > 0) {
          planBiomarkersCount = count;
        }
      }
      
      // Fallback: if no plan found, use submitted marker count (confidence = 1.0)
      const totalBiomarkersForCoverage = planBiomarkersCount || compositeBiomarkers.values.length;
      
      const patientBMI = bmi ? Number(bmi) : null;
      const healthResult = calculateHealthIndex(
        compositeBiomarkers.values,
        patientAge,
        patientGender,
        totalBiomarkersForCoverage,
        patientBMI
      );
      
      health_index = Math.round(healthResult.adjusted);
      
      console.log(`Server health_index: raw=${healthResult.raw}, adjusted=${healthResult.adjusted}, coverage=${healthResult.coverage}%, confidence=${healthResult.confidenceFactor}`);
      console.log(`Top penalties:`, healthResult.penalties.slice(0, 5));
      
      const chronologicalAge = patientAge || (profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : null);
      
      if (chronologicalAge) {
        const baseBioAge = calculateBaseBioAge(chronologicalAge, health_index);
        console.log(`Server base_bio_age: ${baseBioAge} (chrono: ${chronologicalAge})`);
        
        // Now use AI for ±3 year adjustment with temperature: 0
        try {
          // Подготавливаем данные для AI
          const biomarkersForAI = compositeBiomarkers.values.map((av: any) => {
            let normalMin = av.biomarkers.normal_min;
            let normalMax = av.biomarkers.normal_max;
            
            if (av.biomarkers.range_mode === 'age' && av.biomarkers.age_ranges && patientGender && patientAge !== null) {
              const ageRanges = av.biomarkers.age_ranges[patientGender];
              if (ageRanges) {
                const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
                if (ageRange) { normalMin = ageRange.min; normalMax = ageRange.max; }
              }
            }
            if (normalMin === av.biomarkers.normal_min && patientGender === 'male' && av.biomarkers.normal_min_male !== null) { normalMin = av.biomarkers.normal_min_male; normalMax = av.biomarkers.normal_max_male; }
            else if (normalMin === av.biomarkers.normal_min && patientGender === 'female' && av.biomarkers.normal_min_female !== null) { normalMin = av.biomarkers.normal_min_female; normalMax = av.biomarkers.normal_max_female; }
            
            return {
              name: av.biomarkers.name,
              code: av.biomarkers.code,
              category: av.biomarkers.category,
              value: av.value,
              unit: av.unit_override || av.biomarkers.unit,
              normal_min: normalMin,
              normal_max: normalMax,
              aging_weight: av.biomarkers.aging_weight || 1.0,
              source: av.source,
              analysis_date: av.analysis_date
            };
          });

          const previousAnalysesForAI = (previousAnalyses || []).slice(0, 3).map(pa => ({
            date: pa.date,
            biological_age: pa.biological_age,
            health_index: pa.health_index,
            biomarkers_count: pa.analysis_values?.length || 0
          }));

          const symptomsForAI = (userSymptoms || []).slice(0, 10).map(s => ({
            category: s.category,
            symptom: s.symptom,
            severity: s.severity
          }));

          const biomarkersData = JSON.stringify(biomarkersForAI, null, 2);
          const previousAnalysesData = previousAnalysesForAI.length > 0 ? JSON.stringify(previousAnalysesForAI, null, 2) : "Нет предыдущих анализов";
          const symptomsData = symptomsForAI.length > 0 ? JSON.stringify(symptomsForAI, null, 2) : "Симптомы не указаны";

          const categoriesList = (biomarkerCategoriesData || []).map(cat => `${cat.emoji} ${cat.name}`).join("\n");

          const systemPrompt = prompts['biological_age_system'] || "Ты эксперт по биомаркерам старения.";

          const userPrompt = (prompts['biological_age_user'] || 
            `Рассчитай биологический возраст для пациента {chronologicalAge} лет, пол {gender}.\nБиомаркеры: {biomarkersData}`)
            .replace(/{chronologicalAge}/g, String(patientAge || age))
            .replace(/{gender}/g, patientGender === 'male' ? 'мужской' : 'женский')
            .replace(/{biomarkersData}/g, biomarkersData)
            .replace(/{previousAnalysesData}/g, previousAnalysesData)
            .replace(/{symptomsData}/g, symptomsData)
            .replace(/{categoriesList}/g, categoriesList);

          // Additional context for AI: server-calculated base values
          const aiConstraintPrompt = `\n\nВАЖНО: Сервер уже рассчитал base_bio_age = ${baseBioAge.toFixed(1)} и health_index = ${health_index} по детерминированной формуле.
Твоя задача — скорректировать biological_age в диапазоне [${(baseBioAge - 3).toFixed(1)}, ${(baseBioAge + 3).toFixed(1)}] (±3 года от базового).
health_index ДОЛЖЕН быть равен ${health_index} (серверное значение, не изменяй).
Используй свою экспертизу для тонкой корректировки на основе синергий маркеров, симптомов и динамики.`;

          // Build dynamic category_scores schema
          const categoryScoresProperties = (biomarkerCategoriesData || []).reduce((acc, cat) => {
            acc[cat.name] = {
              type: "object",
              properties: {
                score: { type: "integer", description: "Оценка 0-100" },
                impact: { type: "string", enum: ["low", "moderate", "high"] },
                key_markers: { type: "array", items: { type: "string" } }
              }
            };
            return acc;
          }, {} as Record<string, any>);

          const categoryScoresRequired = (biomarkerCategoriesData || []).map(cat => cat.name);

          const bioAgeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: aiProfile.model,
              ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
              temperature: 0,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt + aiConstraintPrompt }
              ],
              tools: [{
                type: "function",
                function: {
                  name: "calculate_biological_age",
                  description: "Скорректировать биологический возраст в пределах ±3 года от серверного base_bio_age",
                  parameters: {
                    type: "object",
                    properties: {
                      biological_age: {
                        type: "number",
                        description: `Скорректированный биологический возраст. ДОЛЖЕН быть в диапазоне [${(baseBioAge - 3).toFixed(1)}, ${(baseBioAge + 3).toFixed(1)}]`
                      },
                      confidence_score: { type: "integer", description: "Уверенность 0-100" },
                      aging_rate: { type: "number", description: "Скорость старения (1.0 = норма)" },
                      health_index: { type: "integer", description: `ДОЛЖЕН быть ${health_index}` },
                      category_scores: {
                        type: "object",
                        properties: categoryScoresProperties,
                        required: categoryScoresRequired
                      },
                      key_aging_markers: {
                        type: "array",
                        description: "Топ-5 маркеров старения",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            normal_max: { type: "number" },
                            deviation: { type: "string" },
                            impact: { type: "string", enum: ["low", "moderate", "high"] },
                            reason: { type: "string" }
                          },
                          required: ["name", "value", "impact", "reason"]
                        }
                      },
                      missing_critical_markers: { type: "array", items: { type: "string" } },
                      explanation: { type: "string" }
                    },
                    required: ["biological_age", "confidence_score", "health_index", "category_scores", "key_aging_markers", "explanation"],
                    additionalProperties: false
                  }
                }
              }],
              tool_choice: { type: "function", function: { name: "calculate_biological_age" } }
            }),
          });

          if (!bioAgeResponse.ok) {
            throw new Error("Failed to get AI adjustment");
          }

          const bioAgeData = await bioAgeResponse.json();
          const toolCall = bioAgeData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const aiResult = JSON.parse(toolCall.function.arguments);
            
            // Clamp AI biological_age to ±3 from baseBioAge
            let aiBioAge = aiResult.biological_age;
            aiBioAge = Math.max(baseBioAge - 3, Math.min(baseBioAge + 3, aiBioAge));
            
            // Additional clamp: bio_age within ±15 years of chrono
            aiBioAge = Math.max(chronologicalAge - 15, Math.min(chronologicalAge + 15, aiBioAge));
            
            biological_age = Math.round(aiBioAge * 10) / 10;
            
            // health_index stays as server-calculated value (ignore AI's value)
            
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
                normalization_multiplier: 25,
                coverage_threshold: 50
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
                temperature: 0
              }
            };

            console.log(`Final biological age: ${biological_age} (base: ${baseBioAge.toFixed(1)}, AI raw: ${aiResult.biological_age}, adjustment: ${(biological_age - baseBioAge).toFixed(1)})`);
          } else {
            throw new Error("AI did not return structured data");
          }
        } catch (error) {
          console.error("Error in AI bio age adjustment:", error);
          
          // Use server-calculated values as fallback
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
              formula_coefficient: 0.15,
              normalization_multiplier: 25,
              coverage_threshold: 50
            },
            calculation_method: 'server_only_fallback',
            error: String(error)
          };

          console.log(`Fallback bio age (server only): ${biological_age}`);
        }
      } else {
        // No chronological age available
        biomarkers_metadata = {
          ...compositeBiomarkers.metadata,
          server_calculation: {
            raw_health_index: healthResult.raw,
            adjusted_health_index: healthResult.adjusted,
            coverage_percent: healthResult.coverage,
            confidence_factor: healthResult.confidenceFactor
          },
          error: 'No birth date available for bio age calculation'
        };
      }
    }

    console.log(`Composite biomarkers calculation: ${totalValues} total (${compositeBiomarkers.metadata.current_count} current + ${compositeBiomarkers.metadata.historical_count} historical)`);

    // Обновляем анализ (БЕЗ изменения статуса - он меняется вручную врачом)
    await supabase
      .from("analyses")
      .update({ health_index, biological_age, biomarkers_metadata })
      .eq("id", analysisId);

    const estimatedCostCredits = (totalTokens / 50000).toFixed(2);

    console.log(`Analysis completed. Total tokens: ${totalTokens}, Estimated cost: ${estimatedCostCredits} credits`);

    return new Response(
      JSON.stringify({
        success: true,
        health_index,
        biological_age,
        categories_processed: categoryStatuses,
        total_tokens: totalTokens,
        estimated_cost_credits: estimatedCostCredits,
        summary: summaryReport.substring(0, 500) + "...",
        prescriptions_created: prescriptionsCreated,
        prescriptions_status: prescriptionsStatus
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
