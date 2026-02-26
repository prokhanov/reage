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
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError) {
      console.error("Error getting user:", userError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      console.error("No user found");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather user context
    console.log("Gathering user context for:", user.id);
    
    // Get AI prompt from settings
    const { data: promptSettings } = await supabase
      .from("ai_prompt_settings")
      .select("prompt_text")
      .eq("key", "health_assistant")
      .single();
    
    const basePrompt = promptSettings?.prompt_text || `Ты - профессиональный AI ассистент по здоровью и долголетию. Твоя задача - помогать пользователю понимать его здоровье, анализировать данные и давать персонализированные рекомендации.

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
10. Ссылайся на конкретные данные пользователя в своих ответах`;
    
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let userContext = "";

    if (profile?.demo_mode_enabled) {
      // Demo user — skip all data queries, provide demo notice
      console.log("User is in demo mode, skipping data queries");
      userContext = `
ВАЖНО: Этот пациент пока не сдавал реальные анализы. Сейчас он находится в демо-режиме и видит примерные данные для ознакомления с платформой.

Личные данные:
- Имя: ${profile?.name || "Не указано"}
- Пол: ${profile?.gender === 'male' ? 'мужской' : 'женский'}

Твоя задача:
- Вежливо сообщить пользователю, что ты пока не можешь дать персонализированные рекомендации, так как у тебя нет его реальных данных
- Объяснить, что после сдачи первого анализа ты сможешь анализировать его показатели и давать конкретные советы
- Можешь отвечать на общие вопросы о здоровье, но подчеркни что без реальных данных это будут общие рекомендации
- Предложи пользователю записаться на анализ
`;
    } else {
      // Real user — gather full context

      // Calculate age for age-dependent context
      const patientAge = profile?.birth_date ? calculateAge(profile.birth_date) : null;
      const patientGender = profile?.gender as 'male' | 'female' | null;

      // Get latest analyses
      const { data: analyses } = await supabase
        .from("analyses")
        .select("*, analysis_values(*, biomarkers(*))")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(3);

      // Get latest biomarker results
      const { data: latestAnalysis } = await supabase
        .from("analyses")
        .select("id, analysis_values(*, biomarkers(*))")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      const biomarkers = latestAnalysis?.analysis_values || [];

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

      // Build context
      const biomarkerLines = biomarkers && biomarkers.length > 0
        ? biomarkers.map((b: any) => {
            const biomarker = b.biomarkers;
            if (!biomarker) return '';
            let normalMin = biomarker.normal_min;
            let normalMax = biomarker.normal_max;
            if (patientAge && patientGender && biomarker.age_ranges) {
              const ageRanges = biomarker.age_ranges[patientGender];
              if (ageRanges) {
                const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
                if (ageRange) { normalMin = ageRange.min; normalMax = ageRange.max; }
              }
            }
            if (patientGender === 'male' && biomarker.normal_min_male !== null) {
              normalMin = biomarker.normal_min_male; normalMax = biomarker.normal_max_male;
            } else if (patientGender === 'female' && biomarker.normal_min_female !== null) {
              normalMin = biomarker.normal_min_female; normalMax = biomarker.normal_max_female;
            }
            return "- " + biomarker.name + ": " + b.value + " " + biomarker.unit + " (норма: " + normalMin + "-" + normalMax + ")";
          }).join("\n")
        : "";

      const symptomLines = symptoms && symptoms.length > 0
        ? symptoms.slice(0, 10).map((s: any) => "- " + s.symptom + " (" + s.category + "): степень " + s.severity).join("\n")
        : "";

      const prescriptionLines = prescriptions && prescriptions.length > 0
        ? prescriptions.map((p: any) => "- " + p.prescription + (p.effect ? " (" + p.effect + ")" : "")).join("\n")
        : "";

      userContext = "ИНФОРМАЦИЯ О ПАЦИЕНТЕ:\n\n" +
        "Личные данные:\n" +
        "- Имя: " + (profile?.name || "Не указано") + "\n" +
        "- Пол: " + (profile?.gender === 'male' ? 'мужской' : 'женский') + "\n" +
        "- Возраст: " + (patientAge || "Не указан") + " лет\n" +
        "- Рост: " + (profile?.height || "Не указан") + " см\n" +
        "- Вес: " + (profile?.weight || "Не указан") + " кг\n" +
        (biomarkerLines ? "\nПоследние показатели биомаркеров:\n" + biomarkerLines + "\n" : "") +
        (symptomLines ? "\nПоследние симптомы:\n" + symptomLines + "\n" : "") +
        (prescriptionLines ? "\nАктивные назначения:\n" + prescriptionLines + "\n" : "") +
        (analyses && analyses.length > 0 ? "\nИстория анализов: " + analyses.length + " записей\nПоследний анализ: биологический возраст " + (analyses[0]?.biological_age || 'н/д') + ", индекс здоровья " + (analyses[0]?.health_index || 'н/д') + "\n" : "");
    }

    // Helper function to calculate age
    function calculateAge(birthDate: string): number {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    const systemPrompt = `${basePrompt}

${userContext}`;

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
