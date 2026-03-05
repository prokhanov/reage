import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded CATEGORY_EXPERTS removed - now loaded from database

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId } = await req.json();

    if (!analysisId) {
      throw new Error("Не указан ID анализа");
    }

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
      "Обмен веществ и детоксикация": "metabolism"
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

    // Получаем профиль пользователя
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", analysis.user_id)
      .single();

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
      profile?.weight ? Number(profile.weight) : null,
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
Вес: ${profile?.weight ? `${profile.weight} кг` : "Не указано"}
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
- **Вес:** ${profile?.weight ? `${profile.weight} кг` : 'Не указано'}
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

    // Получаем тренды для каждой категории
    const getCategoryTrends = (category: string) => {
      if (!previousAnalyses || previousAnalyses.length === 0) {
        return "Нет предыдущих анализов для сравнения";
      }

      const trends: string[] = [];
      previousAnalyses.forEach((prevAnalysis: any) => {
        const prevValues = prevAnalysis.analysis_values.filter(
          (av: any) => av.biomarkers.category === category
        );
        if (prevValues.length > 0) {
          trends.push(`\nАнализ от ${new Date(prevAnalysis.date).toLocaleDateString("ru-RU")}:`);
          prevValues.forEach((pv: any) => {
            trends.push(`  ${pv.biomarkers.name}: ${pv.value} ${pv.biomarkers.unit}`);
          });
        }
      });

      return trends.length > 0 ? trends.join("\n") : "Нет данных по этой категории в предыдущих анализах";
    };

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
        const categoryKey = CATEGORY_KEY_MAP[category];
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

        // Подставляем данные в шаблон
        const categoryPrompt = userPromptTemplate
          .replace(/{userContext}/g, userContext)
          .replace(/{category}/g, category)
          .replace(/{biomarkersText}/g, biomarkersText)
          .replace(/{biomarkers}/g, biomarkersText)
          .replace(/{trends}/g, getCategoryTrends(category))
          .replace(/{recommendations}/g, getCategoryRecommendations(category));

        const systemPrompt = prompts[systemPromptKey] || 
          `Ты ${expert.role} с 20-летним опытом. Специализируешься на ${expert.specialization}.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
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
            max_completion_tokens: 16000
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

        while ((!categoryReport || categoryReport.length < MIN_CONTENT_LENGTH) && retryCount < 2) {
          retryCount++;
          console.warn(`RETRY ${retryCount}/2 for ${category}: content too short (${categoryReport?.length || 0} chars)`);
          await new Promise(r => setTimeout(r, 3000));

          const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: categoryPrompt }
              ],
              max_completion_tokens: 16000
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

    // Формируем общее резюме на основе всех отчетов
    let summaryReport = "";
    try {
      const allReportsText = Object.entries(categoryReports).map(([cat, report]) => 
        `=== ${cat} ===\n${report.substring(0, 2000)}...`
      ).join("\n\n");

      const summaryUserPromptTemplate = prompts['summary_user'];
      
      if (!summaryUserPromptTemplate) {
        console.error("Summary user prompt not found in database");
        throw new Error("Промпт для общего резюме не найден в настройках");
      }

      const summaryPrompt = summaryUserPromptTemplate
        .replace(/{userContext}/g, userContext)
        .replace(/{allReportsText}/g, allReportsText);

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
          model: "google/gemini-2.5-flash",
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
          max_completion_tokens: 16000
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
        
        // Проверка на обрыв резюме
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

    // Сохраняем только Общее резюме (Данные пациента и категории уже сохранены выше)
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

    console.log("All recommendations saved. Starting prescriptions generation...");

    // Генерация назначений
    let prescriptionsCreated = 0;
    let prescriptionsStatus = "skipped";

    try {
      // Загружаем промпты для назначений
      const prescriptionsSystemPrompt = promptSettings?.find(p => p.key === 'prescriptions_system');
      const prescriptionsUserPrompt = promptSettings?.find(p => p.key === 'prescriptions_user');

      if (!prescriptionsSystemPrompt || !prescriptionsUserPrompt) {
        console.log("Prescriptions prompts not found, skipping prescriptions generation");
      } else {
        // Собираем аномальные биомаркеры (risk + critical) с учётом возрастных и гендерных диапазонов
        const prescPatientGender = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
        
        const abnormalBiomarkers = analysis.analysis_values
          .filter((av: any) => {
            let normalMin = av.biomarkers.normal_min;
            let normalMax = av.biomarkers.normal_max;
            let critMin = av.biomarkers.critical_min;
            let critMax = av.biomarkers.critical_max;
            
            // 1. Check age_ranges first (only if range_mode is 'age')
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
            
            // 2. Fallback to gender-specific ranges
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

        // Извлекаем ключевые находки из сгенерированных отчетов
        const keyFindings = Object.entries(categoryReports)
          .map(([category, report]) => `${category}: ${report.substring(0, 300)}...`)
          .join('\n\n');

        // Формируем финальный промпт
        const finalPrescriptionsPrompt = prescriptionsUserPrompt.prompt_text
          .replace('{userContext}', userContext)
          .replace('{keyFindings}', keyFindings)
          .replace('{abnormalBiomarkers}', abnormalBiomarkers || 'Все показатели в пределах нормы');

        console.log("Starting prescriptions generation...");

        // Вызываем AI для генерации назначений (без tool calling, только JSON)
        const prescriptionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "system", 
                content: prescriptionsSystemPrompt.prompt_text + "\n\nВажно: Верни ТОЛЬКО валидный JSON в формате: {\"prescriptions\": [{\"prescription\": \"текст\", \"reason\": \"причина с биомаркером\", \"effect\": \"текст\", \"duration_months\": число}]}. Никакого дополнительного текста!"
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
          
          console.log(`Got model content snippet: ${content.substring(0, 200)}...`);

          try {
            // Извлекаем JSON из ответа
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            if (jsonStart === -1 || jsonEnd <= jsonStart) {
              throw new Error("No JSON found in response");
            }
            
            const jsonStr = content.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonStr);
            let prescriptionsToCreate = parsed.prescriptions || [];
            
            // Валидация и очистка данных
            prescriptionsToCreate = prescriptionsToCreate
              .filter((p: any) => p.prescription && p.prescription.trim())
              .map((p: any) => ({
                prescription: p.prescription.trim().substring(0, 5000),
                reason: (p.reason || "").trim().substring(0, 2000),
                effect: (p.effect || "").trim().substring(0, 5000),
                duration_months: [1, 2, 3, 4, 6].includes(p.duration_months) ? p.duration_months : 3
              }));
            
            console.log(`Parsed ${prescriptionsToCreate.length} valid prescriptions`);
            
            // Сохраняем назначения в БД
            if (prescriptionsToCreate.length > 0) {
              const analysisDate = new Date(analysis.date);
              
              for (const prescription of prescriptionsToCreate) {
                const controlDate = new Date(analysisDate);
                controlDate.setMonth(controlDate.getMonth() + prescription.duration_months);
                
                const { error: prescriptionError } = await supabase
                  .from("prescriptions")
                  .insert({
                    user_id: analysis.user_id,
                    analysis_id: analysisId,
                    recommendation_id: prescriptionRecommendationId,
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
              
              prescriptionsStatus = "success";
              console.log(`Successfully created ${prescriptionsCreated} prescriptions in database`);
            } else {
              prescriptionsStatus = "success";
              console.log("No prescriptions were needed based on analysis");
            }
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
      // Не блокируем основной анализ при ошибке генерации назначений
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
      totalBiomarkersInSystem: number
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
        
        if (normalMin === null || normalMax === null) continue;
        
        const range = normalMax - normalMin;
        if (range <= 0) continue;
        
        const agingWeight = av.biomarkers.aging_weight || 1.0;
        
        // 4-tier penalty calculation
        let penalty = 0;
        let tier = 'optimal';
        
        const isCriticalLow = criticalMin !== null && av.value < criticalMin;
        const isCriticalHigh = criticalMax !== null && av.value > criticalMax;
        const isOutsideNormal = av.value < normalMin || av.value > normalMax;
        const isInOptimal = optimalMin !== null && optimalMax !== null
          ? av.value >= optimalMin && av.value <= optimalMax
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
      
      // Normalize: avg_penalty × 25
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
        return nMin !== null && nMax !== null && (nMax - nMin) > 0;
      }).length;
      
      if (markerCount === 0) return { raw: 70, adjusted: 70, coverage: 0, confidenceFactor: 0, penalties: [] };
      
      const avgPenalty = totalPenalty / markerCount;
      const rawHealthIndex = Math.max(0, Math.min(100, 100 - avgPenalty * 25));
      
      // Confidence factor based on coverage
      const coverage = markerCount / totalBiomarkersInSystem;
      const confidenceFactor = Math.min(1.0, coverage / 0.5);
      
      // Adjust toward 70 when low coverage
      const adjustedHealthIndex = 70 + (rawHealthIndex - 70) * confidenceFactor;
      
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
      // Get total biomarkers count in the system
      const { count: totalBiomarkersInSystem } = await supabase
        .from("biomarkers")
        .select("id", { count: "exact", head: true });
      
      const healthResult = calculateHealthIndex(
        compositeBiomarkers.values,
        patientAge,
        patientGender,
        totalBiomarkersInSystem || 71
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
              model: "google/gemini-2.5-flash",
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
