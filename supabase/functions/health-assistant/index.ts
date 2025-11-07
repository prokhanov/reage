import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user context from authorization header
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather user context
    console.log("Gathering user context for:", user.id);
    
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get latest analyses
    const { data: analyses } = await supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("analysis_date", { ascending: false })
      .limit(5);

    // Get latest biomarker results
    const { data: biomarkers } = await supabase
      .from("biomarker_results")
      .select(`
        *,
        biomarkers (
          name,
          unit,
          optimal_min,
          optimal_max
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get latest symptoms
    const { data: symptoms } = await supabase
      .from("user_symptoms")
      .select("*")
      .eq("user_id", user.id)
      .order("tracked_at", { ascending: false })
      .limit(50);

    // Get active prescriptions
    const { data: prescriptions } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .eq("is_archived", false);

    // Get latest reports
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    // Build context
    const userContext = `
ИНФОРМАЦИЯ О ПАЦИЕНТЕ:

Личные данные:
- Имя: ${profile?.name || "Не указано"}
- Пол: ${profile?.gender || "Не указано"}
- Дата рождения: ${profile?.date_of_birth || "Не указана"}
- Группа крови: ${profile?.blood_group || "Не указана"}
- Рост: ${profile?.height || "Не указан"} см
- Вес: ${profile?.weight || "Не указан"} кг

${biomarkers && biomarkers.length > 0 ? `
Последние показатели биомаркеров:
${biomarkers.map(b => `- ${b.biomarkers?.name}: ${b.value} ${b.biomarkers?.unit} (норма: ${b.biomarkers?.optimal_min}-${b.biomarkers?.optimal_max})`).join("\n")}
` : ""}

${symptoms && symptoms.length > 0 ? `
Последние симптомы:
${symptoms.slice(0, 10).map(s => `- ${s.symptom} (${s.category}): степень ${s.severity}`).join("\n")}
` : ""}

${prescriptions && prescriptions.length > 0 ? `
Активные назначения:
${prescriptions.map(p => `- ${p.prescription}${p.effect ? ` (${p.effect})` : ""}`).join("\n")}
` : ""}

${reports && reports.length > 0 ? `
Последние отчеты (${reports.length}):
${reports.map(r => `- ${r.title}: ${r.content?.substring(0, 200)}...`).join("\n")}
` : ""}

${analyses && analyses.length > 0 ? `
История анализов: ${analyses.length} записей
` : ""}
`;

    const systemPrompt = `Ты - профессиональный AI ассистент по здоровью и долголетию. Твоя задача - помогать пользователю понимать его здоровье, анализировать данные и давать персонализированные рекомендации.

${userContext}

ВАЖНЫЕ ПРАВИЛА:
1. Всегда учитывай контекст пациента при ответах
2. Если у пациента есть отклонения в показателях, обращай на это внимание
3. Давай конкретные, действенные советы
4. Будь эмпатичным и поддерживающим
5. Если видишь тревожные симптомы или показатели, рекомендуй обратиться к врачу
6. Объясняй медицинские термины простым языком
7. Отвечай на русском языке
8. Будь кратким, но информативным
9. Используй эмодзи для лучшего восприятия
10. Ссылайся на конкретные данные пользователя в своих ответах

Ты можешь отвечать на вопросы о:
- Интерпретации анализов и биомаркеров
- Значении симптомов
- Рекомендациях по образу жизни
- Питании и добавках
- Физической активности
- Сне и восстановлении
- Общих вопросах о здоровье`;

    console.log("Calling Lovable AI with context");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов. Пожалуйста, попробуйте позже." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Необходимо пополнить баланс Lovable AI." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Ошибка AI сервиса" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Health assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
