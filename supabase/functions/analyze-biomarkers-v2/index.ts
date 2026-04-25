// Edge function: analyze-biomarkers-v2
// Цель: изолированно сгенерировать рекомендации (нутрицевтики + образ жизни + доп. обследования)
// и сохранить их в новые таблицы prescriptions_v2 и lifestyle_recommendations_v2.
// Использует те же промпты (prescriptions_system / prescriptions_user), что и старая функция,
// но не зависит от расщепления по двум таблицам — каждая сущность хранится в своей.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ---------- 1. Загружаем анализ + биомаркеры ----------
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select(`*, analysis_values(*, biomarkers(*))`)
      .eq("id", analysisId)
      .single();
    if (analysisError || !analysis) throw new Error("Анализ не найден");

    // ---------- 2. Чистим старые v2-данные для этого анализа ----------
    await supabase.from("prescriptions_v2").delete().eq("analysis_id", analysisId);
    await supabase.from("lifestyle_recommendations_v2").delete().eq("analysis_id", analysisId);

    // ---------- 3. Загружаем профиль + контекст пациента ----------
    const [{ data: profile }, { data: latestWeightRecord }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", analysis.user_id).single(),
      supabase
        .from("weight_history")
        .select("weight")
        .eq("user_id", analysis.user_id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const actualWeight = latestWeightRecord?.weight
      ? Number(latestWeightRecord.weight)
      : profile?.weight
      ? Number(profile.weight)
      : null;

    const [{ data: medicalHistory }, { data: complaints }, { data: userSymptoms }] =
      await Promise.all([
        supabase.from("medical_history").select("*").eq("user_id", analysis.user_id),
        supabase
          .from("complaints")
          .select("*")
          .eq("user_id", analysis.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("user_symptoms")
          .select("*")
          .eq("user_id", analysis.user_id)
          .order("tracked_at", { ascending: false })
          .limit(50),
      ]);

    // ---------- 4. Промпты ----------
    const { data: promptSettings } = await supabase.from("ai_prompt_settings").select("*");
    const sysPrompt = promptSettings?.find((p) => p.key === "prescriptions_system");
    const userPrompt = promptSettings?.find((p) => p.key === "prescriptions_user");
    if (!sysPrompt || !userPrompt) {
      throw new Error("Промпты prescriptions_system/prescriptions_user не найдены");
    }

    // ---------- 5. Готовим helpers и контекст ----------
    const age = profile?.birth_date
      ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear()
      : null;
    const gender = profile?.gender === "male" ? "male" : profile?.gender === "female" ? "female" : null;

    const calculateBMI = (w: number | null, h: number | null) => {
      if (!w || !h || h <= 0) return null;
      const m = h / 100;
      return (w / (m * m)).toFixed(1);
    };
    const bmi = calculateBMI(actualWeight, profile?.height ? Number(profile.height) : null);

    const groupedMedical = (medicalHistory || []).reduce((acc: any, item: any) => {
      (acc[item.category] ||= []).push(item.condition);
      return acc;
    }, {} as Record<string, string[]>);
    const medicalText = Object.keys(groupedMedical).length
      ? Object.entries(groupedMedical)
          .map(([cat, conds]) => `  ${cat}:\n    - ${(conds as string[]).join("\n    - ")}`)
          .join("\n")
      : "  Не указана";

    const groupedSymptoms = (userSymptoms || []).reduce((acc: any, s: any) => {
      (acc[s.category] ||= []).push(`${s.symptom} (${s.severity}/3)`);
      return acc;
    }, {} as Record<string, string[]>);
    const symptomsText = Object.keys(groupedSymptoms).length
      ? Object.entries(groupedSymptoms)
          .map(([cat, list]) => `  ${cat}:\n    - ${(list as string[]).join("\n    - ")}`)
          .join("\n")
      : "  Симптомы не указаны";

    const userContext = `
ДАННЫЕ ПАЦИЕНТА:
Имя: ${profile?.name || "Не указано"}
Возраст: ${age || "Не указано"} лет
Пол: ${profile?.gender || "Не указано"}
Рост: ${profile?.height ? `${profile.height} см` : "Не указано"}
Вес: ${actualWeight ? `${actualWeight} кг` : "Не указано"}
BMI: ${bmi || "Не рассчитан"}

МЕДИЦИНСКИЙ АНАМНЕЗ:
${medicalText}

ЖАЛОБЫ:
${complaints && complaints.length > 0 ? complaints.map((c: any) => `- ${c.main_complaints || "—"}`).join("\n") : "Не указаны"}

СИМПТОМЫ (дневник):
${symptomsText}

ЦЕЛИ:
${complaints && complaints[0]?.goals ? complaints[0].goals : "Не указаны"}

ОБРАЗ ЖИЗНИ:
${complaints && complaints[0]?.lifestyle ? complaints[0].lifestyle : "Не указан"}
`.trim();

    // ---------- 6. Список биомаркеров и отклонений ----------
    const formatBiomarkers = (filterAbnormal: boolean) =>
      analysis.analysis_values
        .filter((av: any) => {
          let normalMin = av.biomarkers.normal_min;
          let normalMax = av.biomarkers.normal_max;
          let critMin = av.biomarkers.critical_min;
          let critMax = av.biomarkers.critical_max;
          if (normalMin === null && gender === "male" && av.biomarkers.normal_min_male !== null) {
            normalMin = av.biomarkers.normal_min_male;
            normalMax = av.biomarkers.normal_max_male;
          } else if (normalMin === null && gender === "female" && av.biomarkers.normal_min_female !== null) {
            normalMin = av.biomarkers.normal_min_female;
            normalMax = av.biomarkers.normal_max_female;
          }
          if (!filterAbnormal) return true;
          const isOutsideNormal =
            (normalMin !== null && av.value < normalMin) || (normalMax !== null && av.value > normalMax);
          const isCritical =
            (critMin !== null && av.value < critMin) || (critMax !== null && av.value > critMax);
          return isOutsideNormal || isCritical;
        })
        .map((av: any) => {
          let normalMin = av.biomarkers.normal_min;
          let normalMax = av.biomarkers.normal_max;
          if (normalMin === null && gender === "male" && av.biomarkers.normal_min_male !== null) {
            normalMin = av.biomarkers.normal_min_male;
            normalMax = av.biomarkers.normal_max_male;
          } else if (normalMin === null && gender === "female" && av.biomarkers.normal_min_female !== null) {
            normalMin = av.biomarkers.normal_min_female;
            normalMax = av.biomarkers.normal_max_female;
          }
          return `${av.biomarkers.name}: ${av.value} ${av.biomarkers.unit} (норма: ${normalMin ?? "?"}-${normalMax ?? "?"})`;
        })
        .join("\n");

    const abnormalBiomarkers = formatBiomarkers(true) || "Все показатели в пределах нормы";
    const allBiomarkers = formatBiomarkers(false);

    // ---------- 7. Подставляем плейсхолдеры в user-prompt ----------
    const finalUserPrompt = userPrompt.prompt_text
      .replace(/{userContext}/g, userContext)
      .replace(/{keyFindings}/g, abnormalBiomarkers)
      .replace(/{abnormalBiomarkers}/g, abnormalBiomarkers)
      .replace(/{allBiomarkers}/g, allBiomarkers)
      .replace(/{categoryRecommendations}/g, "—");

    // ---------- 8. Вызов AI ----------
    console.log("[v2] Calling AI for prescriptions...");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              sysPrompt.prompt_text +
              `\n\nВажно: Верни ТОЛЬКО валидный JSON в формате: {"prescriptions": [{"name":"…","form":"…","dosage":"…","how_to_take":"…","duration":"…","prescription":"…","reason":"…","effect":"…"}], "lifestyle": {"nutrition":["…"],"activity":["…"],"sleep":["…"]}, "follow_ups": [{"specialist":"…","goal":"…","trigger":"…"}]}. Все три ключа обязательны. Если блок неприменим — пустой массив. Никакого дополнительного текста.`,
          },
          { role: "user", content: finalUserPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI gateway error ${aiResp.status}: ${errText}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("[v2] AI content snippet:", content.substring(0, 300));

    // ---------- 9. Парсим JSON ----------
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("В ответе AI не найден JSON");
    }
    const parsed = JSON.parse(content.substring(jsonStart, jsonEnd));

    const prescriptions = Array.isArray(parsed.prescriptions)
      ? parsed.prescriptions
          .filter((p: any) => (p.name || p.prescription || "").toString().trim())
          .map((p: any) => ({
            name: (p.name || "").toString().trim().substring(0, 500),
            form: (p.form || "").toString().trim().substring(0, 500),
            dosage: (p.dosage || "").toString().trim().substring(0, 500),
            how_to_take: (p.how_to_take || "").toString().trim().substring(0, 1000),
            duration: (p.duration || "").toString().trim().substring(0, 500),
            prescription: (p.prescription || p.name || "").toString().trim().substring(0, 5000),
            reason: (p.reason || "").toString().trim().substring(0, 2000),
            effect: (p.effect || "").toString().trim().substring(0, 5000),
          }))
      : [];

    const cleanBullets = (arr: any): string[] =>
      Array.isArray(arr)
        ? arr
            .map((s: any) => (typeof s === "string" ? s.trim() : ""))
            .filter((s: string) => s.length > 0)
            .map((s: string) => s.substring(0, 1000))
            .slice(0, 15)
        : [];

    const ls = parsed.lifestyle || {};
    const lifestyle = {
      nutrition: cleanBullets(ls.nutrition),
      activity: cleanBullets(ls.activity),
      sleep: cleanBullets(ls.sleep),
    };

    const followUps = Array.isArray(parsed.follow_ups)
      ? parsed.follow_ups
          .map((f: any) => ({
            specialist: (f?.specialist || "").toString().trim().substring(0, 200),
            goal: (f?.goal || "").toString().trim().substring(0, 500),
            trigger: (f?.trigger || "").toString().trim().substring(0, 500),
          }))
          .filter((f: any) => f.specialist && f.goal)
          .slice(0, 20)
      : [];

    console.log(
      `[v2] Parsed: ${prescriptions.length} presc, lifestyle ${lifestyle.nutrition.length}/${lifestyle.activity.length}/${lifestyle.sleep.length}, follow-ups ${followUps.length}`,
    );

    // ---------- 10. Сохраняем prescriptions_v2 ----------
    let prescCreated = 0;
    if (prescriptions.length > 0) {
      const rows = prescriptions.map((p) => ({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        name: p.name,
        form: p.form,
        dosage: p.dosage,
        how_to_take: p.how_to_take,
        duration: p.duration,
        prescription: p.prescription,
        reason: p.reason,
        effect: p.effect,
        status: "approved" as const,
      }));
      const { error: insErr, count } = await supabase
        .from("prescriptions_v2")
        .insert(rows, { count: "exact" });
      if (insErr) {
        console.error("[v2] insert prescriptions_v2 failed:", insErr);
        throw insErr;
      }
      prescCreated = count ?? rows.length;
    }

    // ---------- 11. Сохраняем lifestyle_recommendations_v2 ----------
    const hasLifestyle =
      lifestyle.nutrition.length + lifestyle.activity.length + lifestyle.sleep.length > 0;
    const hasFollowUps = followUps.length > 0;

    if (hasLifestyle || hasFollowUps) {
      const { error: lsErr } = await supabase.from("lifestyle_recommendations_v2").insert({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        nutrition: lifestyle.nutrition,
        activity: lifestyle.activity,
        sleep: lifestyle.sleep,
        follow_ups: followUps,
      });
      if (lsErr) {
        console.error("[v2] insert lifestyle_recommendations_v2 failed:", lsErr);
        throw lsErr;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        prescriptions_created: prescCreated,
        lifestyle: {
          nutrition: lifestyle.nutrition.length,
          activity: lifestyle.activity.length,
          sleep: lifestyle.sleep.length,
        },
        follow_ups: followUps.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("[v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
