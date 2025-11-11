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
          // Determine correct normal range based on age and gender
          let normalMin = bm.biomarkers.normal_min;
          let normalMax = bm.biomarkers.normal_max;
          
          // Check age_ranges first if available
          if (age && patientGender && bm.biomarkers.age_ranges && bm.biomarkers.age_ranges[patientGender]) {
            const ageRange = bm.biomarkers.age_ranges[patientGender].find(
              (range: any) => age >= range.age_from && age <= range.age_to
            );
            if (ageRange) {
              normalMin = ageRange.min;
              normalMax = ageRange.max;
            }
          }
          
          // Fallback to gender-specific ranges if no age range found
          if ((normalMin === null || normalMax === null) && patientGender === 'male' && bm.biomarkers.normal_min_male !== null && bm.biomarkers.normal_max_male !== null) {
            normalMin = bm.biomarkers.normal_min_male;
            normalMax = bm.biomarkers.normal_max_male;
          } else if ((normalMin === null || normalMax === null) && patientGender === 'female' && bm.biomarkers.normal_min_female !== null && bm.biomarkers.normal_max_female !== null) {
            normalMin = bm.biomarkers.normal_min_female;
            normalMax = bm.biomarkers.normal_max_female;
          }
          
          const isLow = normalMin !== null && bm.value < normalMin;
          const isHigh = normalMax !== null && bm.value > normalMax;
          const status = isLow ? "⬇️ НИЗКИЙ" : isHigh ? "⬆️ ВЫСОКИЙ" : "✅ НОРМА";
          
          return `
${bm.biomarkers.name} (${bm.biomarkers.code}):
  Значение: ${bm.value} ${bm.biomarkers.unit}
  Норма: ${normalMin || "?"} - ${normalMax || "?"} ${bm.biomarkers.unit}
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
        const categoryReport = data.choices[0].message.content;
        const finishReason = data.choices[0].finish_reason;
        const tokensUsed = (data.usage?.total_tokens || 0);
        
        // Проверка на обрыв текста
        if (finishReason === "length") {
          console.warn(`WARNING: Category ${category} was truncated at token limit`);
          categoryReports[category] = categoryReport + "\n\n[⚠️ ВНИМАНИЕ: Отчёт был сокращён из-за ограничения по длине. Рекомендуется перегенерировать.]";
          categoryStatuses[category] = { success: true, tokens: tokensUsed, truncated: true };
        } else {
          categoryReports[category] = categoryReport;
          categoryStatuses[category] = { success: true, tokens: tokensUsed };
        }
        
        totalTokens += tokensUsed;

        console.log(`Category ${category} completed: ${tokensUsed} tokens, finish_reason: ${finishReason}`);

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

      const summaryUserPromptTemplate = prompts['summary_user'] || `
КОНТЕКСТ ПАЦИЕНТА:
{userContext}

ДЕТАЛЬНЫЕ ОТЧЕТЫ ПО СИСТЕМАМ:
{allReportsText}

На основе этих детальных отчетов дай ОБЩЕЕ РЕЗЮМЕ (3000+ слов):

1. ОБЩАЯ ОЦЕНКА ЗДОРОВЬЯ:
   - Интегральная картина состояния здоровья
   - Общий прогноз

2. КЛЮЧЕВЫЕ ПРОБЛЕМЫ И ПРИОРИТЕТЫ:
   - Топ-3 самых важных проблемы, требующих немедленного внимания
   - Почему именно эти проблемы критичны
   - Какие системы наиболее уязвимы

3. СИСТЕМНЫЕ ВЗАИМОСВЯЗИ:
   - Как проблемы в одной системе влияют на другие
   - Каскадные эффекты
   - Порочные круги, которые нужно разорвать

4. ИНТЕГРИРОВАННЫЙ ПЛАН ДЕЙСТВИЙ:
   - Приоритезация рекомендаций из всех отчетов
   - Что делать СНАЧАЛА (первый месяц)
   - Что добавлять ПОТОМ (2-6 месяцев)
   - Стратегия на год

5. МОТИВАЦИЯ И ПЕРСПЕКТИВЫ:
   - Что уже хорошо - положительные моменты
   - Реалистичные ожидания от выполнения рекомендаций
   - Как будет улучшаться состояние при соблюдении рекомендаций
   - Долгосрочная перспектива здоровья и долголетия
      `.trim();

      const summaryPrompt = summaryUserPromptTemplate
        .replace(/{userContext}/g, userContext)
        .replace(/{allReportsText}/g, allReportsText);

      const summarySystemPrompt = prompts['summary_system'] || 
        "Ты главный врач-куратор долголетия. Твоя задача - дать общую оценку здоровья пациента на основе детальных отчетов по всем системам организма.";

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
        const summaryTokens = summaryData.usage?.total_tokens || 0;
        
        // Проверка на обрыв резюме
        if (summaryFinishReason === "length") {
          console.warn("WARNING: Summary was truncated at token limit");
          summaryReport += "\n\n[⚠️ ВНИМАНИЕ: Резюме было сокращено из-за ограничения по длине. Рекомендуется перегенерировать.]";
        }
        
        totalTokens += summaryTokens;
        console.log(`Summary completed: ${summaryTokens} tokens, finish_reason: ${summaryFinishReason}`);
      } else {
        console.error("Failed to generate summary");
        summaryReport = "Не удалось сгенерировать общее резюме";
      }
    } catch (error: any) {
      console.error("Error generating summary:", error);
      summaryReport = "Ошибка при генерации общего резюме";
    }

    // Сохраняем все отчеты в базу данных
    const recommendationsToInsert = [];

    // 1. Данные пациента (ПЕРВЫМ!)
    recommendationsToInsert.push({
      user_id: analysis.user_id,
      analysis_id: analysisId,
      type: "Данные пациента",
      text: patientDataSection
    });

    // 2. Общее резюме
    if (summaryReport) {
      recommendationsToInsert.push({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        type: "Общее резюме",
        text: summaryReport
      });
    }

    // 3. Детальные отчеты по категориям (9 штук)
    for (const [category, report] of Object.entries(categoryReports)) {
      recommendationsToInsert.push({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        type: category,
        text: report
      });
    }

    // Сохраняем все рекомендации
    const { error: insertError } = await supabase
      .from("recommendations")
      .insert(recommendationsToInsert);

    if (insertError) {
      console.error("Error inserting recommendations:", insertError);
      throw insertError;
    }

    console.log("Recommendations saved successfully. Starting prescriptions generation...");

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
        // Собираем аномальные биомаркеры
        const abnormalBiomarkers = analysis.analysis_values
          .filter((av: any) => {
            const min = av.biomarkers.normal_min;
            const max = av.biomarkers.normal_max;
            return (min !== null && av.value < min) || (max !== null && av.value > max);
          })
          .map((av: any) => 
            `${av.biomarkers.name}: ${av.value} ${av.biomarkers.unit} (норма: ${av.biomarkers.normal_min || "?"}-${av.biomarkers.normal_max || "?"} ${av.biomarkers.unit})`
          )
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
                content: prescriptionsSystemPrompt.prompt_text + "\n\nВажно: Верни ТОЛЬКО валидный JSON в формате: {\"prescriptions\": [{\"prescription\": \"текст\", \"effect\": \"текст\", \"duration_months\": число}]}. Никакого дополнительного текста!"
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
                    prescription: prescription.prescription,
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

    // Вычисляем индекс здоровья и биологический возраст
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
    
    if (totalValues > 0) {
      biomarkers_metadata = compositeBiomarkers.metadata;

      const normalValues = compositeBiomarkers.values.filter((av: any) => {
        if (av.biomarkers.normal_min === null || av.biomarkers.normal_max === null) return true;
        
        // Use age-dependent norms
        let normalMin = av.biomarkers.normal_min;
        let normalMax = av.biomarkers.normal_max;
        
        if (av.biomarkers.age_ranges && patientGender && patientAge !== null) {
          const ageRanges = av.biomarkers.age_ranges[patientGender];
          if (ageRanges) {
            const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
            if (ageRange) {
              normalMin = ageRange.min;
              normalMax = ageRange.max;
            }
          }
        }
        
        // Fallback to gender-specific
        if (patientGender === 'male' && av.biomarkers.normal_min_male !== null) {
          normalMin = av.biomarkers.normal_min_male;
          normalMax = av.biomarkers.normal_max_male;
        } else if (patientGender === 'female' && av.biomarkers.normal_min_female !== null) {
          normalMin = av.biomarkers.normal_min_female;
          normalMax = av.biomarkers.normal_max_female;
        }
        
        return av.value >= normalMin && av.value <= normalMax;
      }).length;
      
      health_index = Math.round((normalValues / totalValues) * 100);
      
      // Calculate biological age only if health_index is valid
      if (profile?.birth_date) {
        const chronologicalAge = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
        biological_age = chronologicalAge - Math.round((health_index - 70) / 3);
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
