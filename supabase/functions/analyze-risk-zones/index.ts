import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    const targetUserId = userId || user.id;

    console.log("Analyzing risk zones for user:", targetUserId);

    // Fetch AI prompts from settings
    const { data: prompts } = await supabase
      .from("ai_prompt_settings")
      .select("key, prompt_text")
      .in("key", ["risk_zones_risk_map", "risk_zones_aging_blockers", "risk_zones_smart_priorities"]);

    const promptMap = new Map(prompts?.map(p => [p.key, p.prompt_text]) || []);

    // Fetch user data
    const [profileRes, analysesRes, symptomsRes, prescriptionsRes, weightRes, medicalHistoryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("analyses").select("*, analysis_values(*, biomarkers(*))").eq("user_id", targetUserId).order("date", { ascending: false }).limit(3),
      supabase.from("user_symptoms").select("*").eq("user_id", targetUserId).order("tracked_at", { ascending: false }).limit(50),
      supabase.from("prescriptions").select("*, prescription_adherence(*)").eq("user_id", targetUserId).eq("is_archived", false),
      supabase.from("weight_history").select("*").eq("user_id", targetUserId).order("measured_at", { ascending: false }).limit(10),
      supabase.from("medical_history").select("*").eq("user_id", targetUserId)
    ]);

    const profile = profileRes.data;
    const analyses = analysesRes.data || [];
    const symptoms = symptomsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const weightHistory = weightRes.data || [];
    const medicalHistory = medicalHistoryRes.data || [];

    // Build user context
    let userContext = `ДАННЫЕ ПАЦИЕНТА:\n\n`;
    const patientAge = calculateAge(profile?.birth_date);
    userContext += `Профиль:\n- Возраст: ${patientAge} лет\n- Пол: ${profile?.gender === 'male' ? 'мужской' : 'женский'}\n- Рост: ${profile?.height || "не указан"}\n- Вес: ${profile?.weight || "не указан"}\n\n`;

    if (analyses.length > 0) {
      userContext += `ПОСЛЕДНИЕ АНАЛИЗЫ (${analyses.length}):\n`;
      analyses.forEach((analysis: any, idx: number) => {
        userContext += `\nАнализ ${idx + 1} (${analysis.date}):\n`;
        userContext += `- Биологический возраст: ${analysis.biological_age || "н/д"}\n`;
        userContext += `- Индекс здоровья: ${analysis.health_index || "н/д"}\n`;
        userContext += `- Лаборатория: ${analysis.lab_name || "н/д"}\n`;
        
        if (analysis.analysis_values && analysis.analysis_values.length > 0) {
          userContext += `- Биомаркеры (${analysis.analysis_values.length}):\n`;
          analysis.analysis_values.forEach((val: any) => {
            const biomarker = val.biomarkers;
            if (biomarker) {
              // Use age-dependent norms for deviation calculation
              const patientGender = profile?.gender as 'male' | 'female';
              let normalMin = biomarker.normal_min;
              let normalMax = biomarker.normal_max;
              
              // Try to get age-dependent norms
              if (biomarker.age_ranges && patientGender) {
                const ageRanges = biomarker.age_ranges[patientGender];
                if (ageRanges) {
                  const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
                  if (ageRange) {
                    normalMin = ageRange.min;
                    normalMax = ageRange.max;
                  }
                }
              }
              
              // Fallback to gender-specific norms
              if (patientGender === 'male' && biomarker.normal_min_male !== null) {
                normalMin = biomarker.normal_min_male;
                normalMax = biomarker.normal_max_male;
              } else if (patientGender === 'female' && biomarker.normal_min_female !== null) {
                normalMin = biomarker.normal_min_female;
                normalMax = biomarker.normal_max_female;
              }
              
              const deviation = calculateDeviation(val.value, normalMin, normalMax);
              userContext += `  * ${biomarker.name} (${biomarker.category}): ${val.value} ${val.unit_override || biomarker.unit}`;
              if (deviation) {
                userContext += ` ${deviation}`;
              }
              userContext += ` [норма для возраста ${patientAge}: ${normalMin}-${normalMax}]`;
              userContext += `\n`;
            }
          });
        }
      });
    } else {
      // Warn AI that there are no biomarkers
      userContext += `\n⚠️ ВНИМАНИЕ: У пациента нет лабораторных данных биомаркеров.\n`;
    }

    // Check if patient has any biomarkers at all across all analyses
    const hasBiomarkers = analyses.some((a: any) => a.analysis_values && a.analysis_values.length > 0);
    
    // If no biomarkers, return preliminary report without saving
    if (!hasBiomarkers) {
      console.log('No biomarkers found - returning preliminary report without saving');
      
      return new Response(
        JSON.stringify({
          risk_map: {
            categories: [
              {
                name: "Предварительная оценка",
                risk_score: 50,
                trend: "stable",
                insight: "Для точной оценки зон риска необходимы лабораторные данные. Сдайте базовый анализ крови."
              }
            ]
          },
          aging_blockers: {
            blockers: [
              {
                name: "Сдайте базовый анализ крови",
                impact_score: 9,
                evidence: ["Лабораторные данные необходимы для объективной оценки здоровья"],
                recommendation: "Начните с общего и биохимического анализа крови для получения полной картины состояния здоровья"
              }
            ]
          },
          smart_priorities: {
            immediate: {
              focus: {
                title: "Получение базовых данных о здоровье",
                description: "Сдайте анализы для полноценной оценки",
                predicted_improvements: [
                  {
                    metric: "Объективная оценка здоровья",
                    change: "Получение данных",
                    timeline_days: 7,
                    confidence: 100
                  }
                ]
              },
              tasks: [
                { 
                  id: "book_analysis",
                  action: "Записаться на сдачу анализов", 
                  reason: "Необходимы лабораторные данные",
                  timeline: "1-2 дня",
                  prediction: {
                    effect: "Получение базовых данных",
                    metric: "Объективная оценка",
                    confidence: 100,
                    improvement: "Возможность точной диагностики"
                  }
                },
                { 
                  id: "prepare_analysis",
                  action: "Подготовиться к сдаче крови (натощак)", 
                  reason: "Правильная подготовка обеспечит точность результатов",
                  timeline: "1 день",
                  prediction: {
                    effect: "Точные результаты",
                    metric: "Качество данных",
                    confidence: 100,
                    improvement: "Корректная диагностика"
                  }
                }
              ]
            },
            medium_term: { 
              focus: {
                title: "Ожидание результатов",
                description: "После получения результатов анализов вы сможете получить полноценную оценку",
                predicted_improvements: []
              },
              tasks: [] 
            },
            long_term: { 
              focus: {
                title: "Долгосрочная стратегия",
                description: "Будет сформирована после получения лабораторных данных",
                predicted_improvements: []
              },
              tasks: [] 
            }
          },
          has_biomarkers: false,
          analysis_date: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    userContext += `\n\nЛабораторные данные: Доступны результаты анализов с биомаркерами.\n`;

    if (symptoms.length > 0) {
      userContext += `\n\nСИМПТОМЫ (последние ${symptoms.length}):\n`;
      const symptomGroups = symptoms.reduce((acc: any, s: any) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
      }, {});
      
      Object.entries(symptomGroups).forEach(([category, syms]: [string, any]) => {
        userContext += `\n${category}:\n`;
        syms.forEach((s: any) => {
          userContext += `  - ${s.symptom} (severity: ${s.severity}/5) - ${new Date(s.tracked_at).toLocaleDateString()}\n`;
        });
      });
    }

    if (prescriptions.length > 0) {
      userContext += `\n\nНАЗНАЧЕНИЯ (${prescriptions.length} активных):\n`;
      prescriptions.forEach((p: any) => {
        const adherenceData = p.prescription_adherence || [];
        const avgAdherence = adherenceData.length > 0
          ? adherenceData.reduce((sum: number, a: any) => sum + a.adherence_level, 0) / adherenceData.length
          : 0;
        userContext += `\n- ${p.prescription.slice(0, 100)}...\n`;
        userContext += `  Статус: ${p.status}\n`;
        if (p.control_date) userContext += `  Контроль: ${p.control_date}\n`;
        if (adherenceData.length > 0) userContext += `  Среднее соблюдение: ${avgAdherence.toFixed(0)}%\n`;
      });
    }

    if (weightHistory.length > 0) {
      userContext += `\n\nДИНАМИКА ВЕСА (последние ${weightHistory.length} записей):\n`;
      weightHistory.forEach((w: any) => {
        userContext += `- ${new Date(w.measured_at).toLocaleDateString()}: ${w.weight} кг\n`;
      });
    }

    if (medicalHistory.length > 0) {
      userContext += `\n\nМЕДИЦИНСКАЯ ИСТОРИЯ:\n`;
      const historyGroups = medicalHistory.reduce((acc: any, h: any) => {
        if (!acc[h.category]) acc[h.category] = [];
        acc[h.category].push(h.condition);
        return acc;
      }, {});
      
      Object.entries(historyGroups).forEach(([category, conditions]: [string, any]) => {
        userContext += `${category}: ${conditions.join(", ")}\n`;
      });
    }

    // Call AI for each component
    const riskMapData = await callAI(
      promptMap.get("risk_zones_risk_map") || "",
      userContext,
      "analyze_risk_map",
      {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                risk_score: { type: "number" },
                trend: { type: "string", enum: ["up", "down", "stable"] },
                insight: { type: "string" }
              },
              required: ["name", "risk_score", "trend", "insight"]
            }
          }
        },
        required: ["categories"]
      }
    );

    const agingBlockersData = await callAI(
      promptMap.get("risk_zones_aging_blockers") || "",
      userContext,
      "analyze_aging_blockers",
      {
        type: "object",
        properties: {
          blockers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                impact_score: { type: "number" },
                evidence: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" }
              },
              required: ["name", "impact_score", "evidence", "recommendation"]
            }
          }
        },
        required: ["blockers"]
      }
    );

    const smartPrioritiesData = await callAI(
      promptMap.get("risk_zones_smart_priorities") || "",
      userContext,
      "generate_smart_priorities",
      {
        type: "object",
        properties: {
          immediate: {
            type: "object",
            properties: {
              focus: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  predicted_improvements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        change: { type: "string" },
                        timeline_days: { type: "number" },
                        confidence: { type: "number" }
                      },
                      required: ["metric", "change", "timeline_days", "confidence"]
                    }
                  }
                },
                required: ["title", "description", "predicted_improvements"]
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    action: { type: "string" },
                    reason: { type: "string" },
                    timeline: { type: "string" },
                    prediction: {
                      type: "object",
                      properties: {
                        effect: { type: "string" },
                        metric: { type: "string" },
                        confidence: { type: "number" },
                        improvement: { type: "string" }
                      },
                      required: ["effect", "metric", "confidence", "improvement"]
                    }
                  },
                  required: ["id", "action", "reason", "timeline", "prediction"]
                }
              }
            },
            required: ["focus", "tasks"]
          },
          medium_term: {
            type: "object",
            properties: {
              focus: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  predicted_improvements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        change: { type: "string" },
                        timeline_days: { type: "number" },
                        confidence: { type: "number" }
                      },
                      required: ["metric", "change", "timeline_days", "confidence"]
                    }
                  }
                },
                required: ["title", "description", "predicted_improvements"]
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    action: { type: "string" },
                    reason: { type: "string" },
                    timeline: { type: "string" },
                    prediction: {
                      type: "object",
                      properties: {
                        effect: { type: "string" },
                        metric: { type: "string" },
                        confidence: { type: "number" },
                        improvement: { type: "string" }
                      },
                      required: ["effect", "metric", "confidence", "improvement"]
                    }
                  },
                  required: ["id", "action", "reason", "timeline", "prediction"]
                }
              }
            },
            required: ["focus", "tasks"]
          },
          long_term: {
            type: "object",
            properties: {
              focus: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  predicted_improvements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        change: { type: "string" },
                        timeline_days: { type: "number" },
                        confidence: { type: "number" }
                      },
                      required: ["metric", "change", "timeline_days", "confidence"]
                    }
                  }
                },
                required: ["title", "description", "predicted_improvements"]
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    action: { type: "string" },
                    reason: { type: "string" },
                    timeline: { type: "string" },
                    prediction: {
                      type: "object",
                      properties: {
                        effect: { type: "string" },
                        metric: { type: "string" },
                        confidence: { type: "number" },
                        improvement: { type: "string" }
                      },
                      required: ["effect", "metric", "confidence", "improvement"]
                    }
                  },
                  required: ["id", "action", "reason", "timeline", "prediction"]
                }
              }
            },
            required: ["focus", "tasks"]
          }
        },
        required: ["immediate", "medium_term", "long_term"]
      }
    );

    // Save to database (only if we have biomarkers)
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("risk_zone_analyses")
      .insert({
        user_id: targetUserId,
        risk_map: riskMapData,
        aging_blockers: agingBlockersData,
        smart_priorities: smartPrioritiesData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving analysis:", saveError);
    }

    // Reset the needs_risk_refresh flag
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ needs_risk_refresh: false })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    console.log('Risk zone analysis completed successfully');

    return new Response(
      JSON.stringify({
        risk_map: riskMapData,
        aging_blockers: agingBlockersData,
        smart_priorities: smartPrioritiesData,
        has_biomarkers: true,
        analysis_date: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-risk-zones:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function callAI(systemPrompt: string, userContext: string, functionName: string, parameters: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: functionName,
            description: "Analyze patient data and return structured results",
            parameters: parameters
          }
        }
      ],
      tool_choice: { type: "function", function: { name: functionName } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error (${response.status}):`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    console.error("No tool call in response:", JSON.stringify(data));
    throw new Error("No tool call in AI response");
  }

  return JSON.parse(toolCall.function.arguments);
}

function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateDeviation(value: number, min: number | null, max: number | null): string {
  if (min === null || max === null) return "";
  
  if (value < min) {
    const percentBelow = ((min - value) / min * 100).toFixed(0);
    return `(ниже нормы на ${percentBelow}%)`;
  } else if (value > max) {
    const percentAbove = ((value - max) / max * 100).toFixed(0);
    return `(выше нормы на ${percentAbove}%)`;
  }
  return "(в норме)";
}