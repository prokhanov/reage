import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcAge(birth: string) {
  const t = new Date();
  const b = new Date(birth);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { userId, force } = await req.json().catch(() => ({}));
    const targetUserId = userId || user.id;

    // Cached snapshot (24h)
    if (!force) {
      const { data: cached } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.created_at).getTime() < 24 * 3600 * 1000) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const [profileRes, analysesRes, prescRes, categoriesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("analyses").select("*, analysis_values(value, biomarkers(name, code, category, unit))").eq("user_id", targetUserId).eq("status", "processed").order("date", { ascending: false }).limit(1),
      supabase.from("prescriptions").select("*").eq("user_id", targetUserId).eq("is_archived", false),
      supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
    ]);

    const profile = profileRes.data;
    const latest = analysesRes.data?.[0];
    const prescriptions = prescRes.data || [];
    const categories = categoriesRes.data || [];

    if (!profile || !latest || latest.biological_age == null) {
      return new Response(JSON.stringify({ error: "No analysis data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chronoAge = calcAge(profile.birth_date);
    const currentBio = Number(latest.biological_age);

    // Build biomarker summary by category
    const byCat: Record<string, Array<{ name: string; code: string; value: number; unit: string }>> = {};
    for (const av of latest.analysis_values || []) {
      const b = av.biomarkers;
      if (!b) continue;
      byCat[b.category] = byCat[b.category] || [];
      byCat[b.category].push({ name: b.name, code: b.code, value: av.value, unit: b.unit });
    }

    const categoriesContext = categories.map((c: any) => {
      const items = (byCat[c.name] || []).slice(0, 12).map((b) => `${b.name} (${b.code}): ${b.value} ${b.unit}`).join("; ");
      return `${c.name}: ${items || "нет данных"}`;
    }).join("\n");

    const prescContext = prescriptions.map((p: any) => {
      const title = p.name || p.prescription?.slice(0, 80) || "—";
      return `- ${title} | форма: ${p.form || "—"} | дозировка: ${p.dosage || "—"} | длительность: ${p.duration || "—"} | причина: ${p.reason || "—"} | эффект: ${p.effect || "—"}`;
    }).join("\n");

    const systemNames = categories.map((c: any) => c.name);

    const systemPrompt = `Ты — врач превентивной медицины. По данным пациента рассчитай реалистичный прогноз биологического возраста через 12 месяцев и сформируй план для каждой системы организма. Ответ строго в JSON по схеме инструмента. Прогноз учитывает текущие назначения (приверженность ~70%), тяжесть отклонений биомаркеров и физиологические пределы. Допустимый диапазон снижения биовозраста за 12 мес: -0.3 до -2.5 года. Если пациент уже моложе хроновозраста на >5 лет, прогноз умереннее. Цели систем — короткие (до 100 символов), конкретные, в естественном русском.`;

    const userPrompt = `ПАЦИЕНТ:
- Хронологический возраст: ${chronoAge} лет
- Биологический возраст сейчас: ${currentBio} лет
- Пол: ${profile.gender === "female" ? "женский" : "мужской"}
- Дата анализа: ${latest.date}

БИОМАРКЕРЫ ПО СИСТЕМАМ:
${categoriesContext}

АКТИВНЫЕ НАЗНАЧЕНИЯ:
${prescContext || "(нет)"}

СИСТЕМЫ для goals: ${systemNames.join(", ")}`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_strategy",
        description: "Submit calculated health strategy",
        parameters: {
          type: "object",
          properties: {
            target_bio_age: { type: "number", description: "Целевой биовозраст через 12 месяцев (1 знак после запятой)" },
            rationale: { type: "string", description: "Краткое обоснование прогноза, 1-2 предложения" },
            system_goals: {
              type: "array",
              description: "По одной цели на каждую систему",
              items: {
                type: "object",
                properties: {
                  system: { type: "string", description: "Точное название системы из списка" },
                  goal: { type: "string", description: "Главная цель: что улучшить и до какого значения" },
                  target_biomarkers: { type: "array", items: { type: "string" }, description: "Коды биомаркеров (HbA1c, Mg, ...)" },
                },
                required: ["system", "goal", "target_biomarkers"],
                additionalProperties: false,
              },
            },
            action_map: {
              type: "array",
              description: "Связи между активными назначениями и системами/биомаркерами",
              items: {
                type: "object",
                properties: {
                  prescription_name: { type: "string", description: "Название как в списке назначений" },
                  systems: { type: "array", items: { type: "string" }, description: "Системы, на которые влияет" },
                  biomarker_codes: { type: "array", items: { type: "string" }, description: "Коды затрагиваемых биомаркеров" },
                  expected_effect: { type: "string", description: "Краткое описание эффекта (до 120 символов)" },
                  effect_eta: { type: "string", description: "Срок наступления эффекта, например '14 дней', '4 недели'" },
                },
                required: ["prescription_name", "systems", "biomarker_codes", "expected_effect", "effect_eta"],
                additionalProperties: false,
              },
            },
          },
          required: ["target_bio_age", "rationale", "system_goals", "action_map"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "submit_strategy" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Clamp target
    const minTarget = Math.max(currentBio - 2.5, chronoAge - 15);
    const maxTarget = currentBio - 0.3;
    let target = Number(parsed.target_bio_age);
    if (!isFinite(target)) target = currentBio - 0.7;
    target = Math.min(maxTarget, Math.max(minTarget, target));
    target = Math.round(target * 10) / 10;

    const { data: snapshot, error: insErr } = await supabase
      .from("health_strategy_snapshots")
      .insert({
        user_id: targetUserId,
        analysis_id: latest.id,
        current_bio_age: currentBio,
        chronological_age: chronoAge,
        target_bio_age: target,
        health_index: latest.health_index ? Math.round(latest.health_index) : null,
        system_goals: parsed.system_goals,
        action_map: parsed.action_map,
        rationale: parsed.rationale,
        model: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify(snapshot), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
