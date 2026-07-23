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
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const requestedPatientId = typeof body?.targetUserId === 'string' ? body.targetUserId : null;
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

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const targetUserId = requestedPatientId && uuidPattern.test(requestedPatientId) ? requestedPatientId : user.id;

    if (requestedPatientId && !uuidPattern.test(requestedPatientId)) {
      return new Response(JSON.stringify({ error: "Invalid patient id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId !== user.id) {
      const { data: canViewPatient, error: permissionError } = await supabase.rpc("has_admin_permission", {
        _user_id: user.id,
        _module: "patients",
      });

      if (permissionError || !canViewPatient) {
        console.error("Forbidden patient context request", { requester: user.id, target: targetUserId, permissionError });
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather patient context
    console.log("Gathering patient context for:", targetUserId, "requested by:", user.id);
    
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
      .eq("id", targetUserId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Patient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userContext = "";
    let resolvedPatientGender: 'male' | 'female' | null = null;

    if (profile?.demo_mode_enabled) {
      resolvedPatientGender = profile?.gender === 'male' ? 'male' : profile?.gender === 'female' ? 'female' : null;
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
      resolvedPatientGender = patientGender === 'male' || patientGender === 'female' ? patientGender : null;

      // Get latest weight from weight_history
      const { data: latestWeightRecord } = await supabase
        .from("weight_history")
        .select("weight")
        .eq("user_id", targetUserId)
        .order("measured_at", { ascending: false })
        .limit(1)
        .single();

      const actualWeight = latestWeightRecord?.weight ? Number(latestWeightRecord.weight) : (profile?.weight ? Number(profile.weight) : null);

      // Get latest analyses
      const { data: analyses } = await supabase
        .from("analyses")
        .select("*, analysis_values(*, biomarkers(*))")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false })
        .limit(3);

      // Get latest biomarker results
      const { data: latestAnalysis } = await supabase
        .from("analyses")
        .select("id, analysis_values(*, biomarkers(*))")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      const biomarkers = latestAnalysis?.analysis_values || [];

      // Get latest symptoms
      const { data: symptoms } = await supabase
        .from("user_symptoms")
        .select("*")
        .eq("user_id", targetUserId)
        .order("tracked_at", { ascending: false })
        .limit(50);

      // Get active prescriptions
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("status", "confirmed")
        .eq("is_archived", false);

      // Get recommendations for latest analysis (report sections)
      const { data: recommendations } = latestAnalysis?.id ? await supabase
        .from("recommendations")
        .select("type, text, content_json")
        .eq("user_id", targetUserId)
        .eq("analysis_id", latestAnalysis.id)
        .order("created_at", { ascending: true }) : { data: [] as any[] };

      // Get latest health strategy snapshot
      const { data: strategy } = await supabase
        .from("health_strategy_snapshots")
        .select("current_bio_age, chronological_age, target_bio_age, health_index, cohort_percentile, cohort_label, system_goals, action_map, roadmap, key_biomarkers, trajectory, expectations, rationale, created_at")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build context
      const biomarkerLines = biomarkers && biomarkers.length > 0
        ? biomarkers.map((b: any) => {
            const biomarker = b.biomarkers;
            if (!biomarker) return '';
            let normalMin = biomarker.normal_min;
            let normalMax = biomarker.normal_max;
            let optimalMin = biomarker.optimal_min;
            let optimalMax = biomarker.optimal_max;
            let criticalMin = biomarker.critical_min;
            let criticalMax = biomarker.critical_max;

            // Age-dependent ranges (highest priority, only if range_mode is 'age')
            if (biomarker.range_mode === 'age' && patientAge && patientGender && biomarker.age_ranges) {
              const ageRanges = biomarker.age_ranges[patientGender];
              if (ageRanges) {
                const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
                if (ageRange) {
                  normalMin = ageRange.min;
                  normalMax = ageRange.max;
                  if (ageRange.optimal_min != null) optimalMin = ageRange.optimal_min;
                  if (ageRange.optimal_max != null) optimalMax = ageRange.optimal_max;
                  if (ageRange.critical_min != null) criticalMin = ageRange.critical_min;
                  if (ageRange.critical_max != null) criticalMax = ageRange.critical_max;
                }
              }
            }

            // Gender-specific fallback (only if not already set by age-dependent ranges)
            if (patientGender === 'male') {
              if (normalMin === biomarker.normal_min && biomarker.normal_min_male != null) { normalMin = biomarker.normal_min_male; normalMax = biomarker.normal_max_male; }
              if (optimalMin === biomarker.optimal_min && biomarker.optimal_min_male != null) { optimalMin = biomarker.optimal_min_male; optimalMax = biomarker.optimal_max_male; }
              if (criticalMin === biomarker.critical_min && biomarker.critical_min_male != null) { criticalMin = biomarker.critical_min_male; criticalMax = biomarker.critical_max_male; }
            } else if (patientGender === 'female') {
              if (normalMin === biomarker.normal_min && biomarker.normal_min_female != null) { normalMin = biomarker.normal_min_female; normalMax = biomarker.normal_max_female; }
              if (optimalMin === biomarker.optimal_min && biomarker.optimal_min_female != null) { optimalMin = biomarker.optimal_min_female; optimalMax = biomarker.optimal_max_female; }
              if (criticalMin === biomarker.critical_min && biomarker.critical_min_female != null) { criticalMin = biomarker.critical_min_female; criticalMax = biomarker.critical_max_female; }
            }

            // Determine 4-tier status
            const value = b.value;
            let status = '🟡 ДОПУСТИМО';
            if (optimalMin != null && optimalMax != null && value >= optimalMin && value <= optimalMax) {
              status = '🟢 ОПТИМАЛЬНО';
            } else if ((criticalMin != null && value < criticalMin) || (criticalMax != null && value > criticalMax)) {
              status = '🔴 КРИТИЧНО';
            } else if (value < normalMin || value > normalMax) {
              status = '🟠 РИСК';
            }

            const genderLabel = patientGender === 'female' ? 'женский/персональный референс' : patientGender === 'male' ? 'мужской/персональный референс' : 'персональный референс';
            let rangeInfo = `${genderLabel}; норма: ${normalMin}-${normalMax}`;
            if (optimalMin != null && optimalMax != null) rangeInfo = `${genderLabel}; оптимум: ${optimalMin}-${optimalMax} | норма: ${normalMin}-${normalMax}`;
            if (criticalMin != null || criticalMax != null) rangeInfo += ` | крит: ${criticalMin != null ? '<' + criticalMin : ''}${criticalMin != null && criticalMax != null ? ' / ' : ''}${criticalMax != null ? '>' + criticalMax : ''}`;

            return "- " + biomarker.name + ": " + b.value + " " + biomarker.unit + " " + status + " (" + rangeInfo + ")";
          }).join("\n")
        : "";

      const symptomLines = symptoms && symptoms.length > 0
        ? symptoms.slice(0, 10).map((s: any) => "- " + s.symptom + " (" + s.category + "): степень " + s.severity).join("\n")
        : "";

      const prescriptionLines = prescriptions && prescriptions.length > 0
        ? prescriptions.map((p: any) => "- " + p.prescription + (p.effect ? " (" + p.effect + ")" : "")).join("\n")
        : "";

      const truncate = (s: string, n = 800) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");
      const recommendationsBlock = recommendations && recommendations.length > 0
        ? recommendations.map((r: any) => {
            const body = r.text ? truncate(r.text, 900)
              : r.content_json ? truncate(JSON.stringify(r.content_json), 900)
              : "";
            return `### ${r.type}\n${body}`;
          }).join("\n\n")
        : "";

      let strategyBlock = "";
      if (strategy) {
        const goals = Array.isArray(strategy.system_goals) ? strategy.system_goals : [];
        const goalsStr = goals.slice(0, 8).map((g: any) =>
          `- ${g.system || g.name || 'система'}: ${g.current ?? '—'} → ${g.target ?? '—'}${g.priority ? ' (приоритет: ' + g.priority + ')' : ''}`
        ).join("\n");
        const roadmap = strategy.roadmap ? truncate(JSON.stringify(strategy.roadmap), 700) : "";
        const actions = strategy.action_map ? truncate(JSON.stringify(strategy.action_map), 700) : "";
        strategyBlock = `\nСТРАТЕГИЯ ЗДОРОВЬЯ (снимок от ${new Date(strategy.created_at).toLocaleDateString('ru-RU')}):
- Биовозраст сейчас: ${strategy.current_bio_age} (хроно: ${strategy.chronological_age}, цель: ${strategy.target_bio_age})
- Индекс здоровья: ${strategy.health_index ?? '—'}
- Когорта: ${strategy.cohort_label ?? '—'}${strategy.cohort_percentile != null ? ' (перцентиль ' + strategy.cohort_percentile + ')' : ''}
${goalsStr ? "\nЦели по системам:\n" + goalsStr : ""}
${actions ? "\nActions map (JSON, кратко):\n" + actions : ""}
${roadmap ? "\nRoadmap (JSON, кратко):\n" + roadmap : ""}
${strategy.rationale ? "\nОбоснование: " + truncate(strategy.rationale, 500) : ""}
`;
      }

      const latestA: any = analyses && analyses[0];
      const bioAge = latestA?.biological_age;
      const hIndex = latestA?.health_index;
      const ageDiff = (bioAge != null && patientAge != null) ? (Number(bioAge) - patientAge).toFixed(1) : null;

      userContext = genderHardRule + "ИНФОРМАЦИЯ О ПАЦИЕНТЕ:\n\n" +
        "Личные данные:\n" +
        "- Имя: " + (profile?.name || "Не указано") + "\n" +
        "- Пол: " + (profile?.gender === 'male' ? 'мужской' : 'женский') + "\n" +
        "- Возраст: " + (patientAge || "Не указан") + " лет\n" +
        "- Рост: " + (profile?.height || "Не указан") + " см\n" +
        "- Вес: " + (actualWeight || "Не указан") + " кг\n" +
        (biomarkerLines ? "\nПоследние показатели биомаркеров:\n" + biomarkerLines + "\n" : "") +
        (symptomLines ? "\nПоследние симптомы:\n" + symptomLines + "\n" : "") +
        (prescriptionLines ? "\nАктивные назначения:\n" + prescriptionLines + "\n" : "") +
        (analyses && analyses.length > 0
          ? "\nИстория анализов: " + analyses.length + " записей\n" +
            "Последний анализ (" + (latestA?.date || 'н/д') + "):\n" +
            "- Биологический возраст: " + (bioAge ?? 'н/д') + (ageDiff != null ? " (Δ к хроно: " + (Number(ageDiff) >= 0 ? "+" : "") + ageDiff + ")" : "") + "\n" +
            "- Индекс здоровья: " + (hIndex ?? 'н/д') + "\n"
          : "") +
        (recommendationsBlock ? "\nРЕКОМЕНДАЦИИ И РАЗДЕЛЫ ОТЧЁТА (последний анализ):\n" + recommendationsBlock + "\n" : "") +
        strategyBlock;
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

    const genderOverride = resolvedPatientGender === 'female'
      ? `

# ЖЁСТКОЕ ПРАВИЛО ДЛЯ ЭТОГО ДИАЛОГА

Пациент — женщина. Запрещено упоминать мужские нормы, мужские референсы и любые формулировки вида «для мужчин». Если вопрос пользователя содержит такую фразу из прошлого ответа, признай это как ошибку формулировки и сразу дай корректный ответ для женщины, не повторяя мужскую норму и не сравнивая с мужчинами.`
      : resolvedPatientGender === 'male'
        ? `

# ЖЁСТКОЕ ПРАВИЛО ДЛЯ ЭТОГО ДИАЛОГА

Пациент — мужчина. Запрещено упоминать женские нормы, женские референсы и любые формулировки вида «для женщин». Если вопрос пользователя содержит такую фразу из прошлого ответа, признай это как ошибку формулировки и сразу дай корректный ответ для мужчины, не повторяя женскую норму и не сравнивая с женщинами.`
        : "";

    const sanitizeConversationHistory = (chatMessages: any[], patientGender: 'male' | 'female' | null) => {
      if (!Array.isArray(chatMessages) || !patientGender) return Array.isArray(chatMessages) ? chatMessages : [];

      const oppositeGenderPattern = patientGender === 'female'
        ? /(для\s+мужчин|у\s+мужчин|мужск\w*\s+(?:норм|референс)|референс\w*\s+(?:для\s+)?мужчин)/giu
        : /(для\s+женщин|у\s+женщин|женск\w*\s+(?:норм|референс)|референс\w*\s+(?:для\s+)?женщин)/giu;

      return chatMessages.map((message) => {
        if (message?.role !== 'assistant' || typeof message?.content !== 'string') return message;
        return {
          ...message,
          content: message.content.replace(oppositeGenderPattern, 'персональный референс пациента'),
        };
      });
    };

    const sanitizedMessages = sanitizeConversationHistory(messages, resolvedPatientGender);

    const systemPrompt = `${basePrompt}${genderOverride}

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
          ...sanitizedMessages,
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
