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

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function detectAnalysesPerYear(planName?: string | null): number {
  const n = (planName || "").toLowerCase();
  if (n.includes("базов") || n.includes("basic") || n.includes("старт")) return 2;
  if (n.includes("оптим") || n.includes("optim") || n.includes("стандарт")) return 3;
  if (n.includes("прем") || n.includes("premium") || n.includes("макс")) return 4;
  return 3;
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

    const { data: latestAnalysisRow } = await supabase
      .from("analyses")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("status", "processed")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force && latestAnalysisRow) {
      const { data: cached } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("analysis_id", latestAnalysisRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached && cached.roadmap && cached.key_biomarkers) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const [profileRes, analysesRes, prescRes, categoriesRes, complaintsRes, subRes, bookingsRes, adherenceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("analyses").select("*, analysis_values(value, biomarkers(name, code, category, unit, normal_min, normal_max, optimal_min, optimal_max))").eq("user_id", targetUserId).eq("status", "processed").order("date", { ascending: false }).limit(1),
      supabase.from("prescriptions").select("*").eq("user_id", targetUserId).eq("is_archived", false),
      supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      supabase.from("complaints").select("main_complaints, goals, lifestyle").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("subscriptions").select("plan_id, status, start_date, subscription_plans(name, display_name)").eq("user_id", targetUserId).eq("status", "active").order("start_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("analysis_bookings").select("booking_date, status").eq("user_id", targetUserId).gte("booking_date", new Date().toISOString().slice(0, 10)).order("booking_date", { ascending: true }),
      supabase.from("prescription_adherence").select("status").eq("user_id", targetUserId).gte("date", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
    ]);

    const profile = profileRes.data;
    const latest = analysesRes.data?.[0];
    const prescriptions = prescRes.data || [];
    const categories = categoriesRes.data || [];
    const complaints = complaintsRes.data;
    const subscription: any = subRes.data;
    const futureBookings = bookingsRes.data || [];
    const adherenceRows = adherenceRes.data || [];

    if (!profile || !latest || latest.biological_age == null) {
      return new Response(JSON.stringify({ error: "No analysis data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const planName = subscription?.subscription_plans?.display_name || subscription?.subscription_plans?.name || null;
    const analysesPerYear = detectAnalysesPerYear(planName);

    const chronoAge = calcAge(profile.birth_date);
    const currentBio = Number(latest.biological_age);

    // Build biomarker summary + deviation flags
    const byCat: Record<string, Array<{ name: string; code: string; value: number; unit: string; deviated: boolean }>> = {};
    for (const av of latest.analysis_values || []) {
      const b = av.biomarkers;
      if (!b) continue;
      const v = Number(av.value);
      const optMin = b.optimal_min ?? b.normal_min;
      const optMax = b.optimal_max ?? b.normal_max;
      const deviated = (optMin != null && v < Number(optMin)) || (optMax != null && v > Number(optMax));
      byCat[b.category] = byCat[b.category] || [];
      byCat[b.category].push({ name: b.name, code: b.code, value: v, unit: b.unit, deviated });
    }

    const categoriesContext = categories.map((c: any) => {
      const items = (byCat[c.name] || []).slice(0, 14).map((b) => `${b.name} (${b.code}): ${b.value} ${b.unit}${b.deviated ? " [ОТКЛОНЕНИЕ]" : ""}`).join("; ");
      return `${c.name}: ${items || "нет данных"}`;
    }).join("\n");

    const prescContext = prescriptions.map((p: any) => {
      const title = p.name || p.prescription?.slice(0, 80) || "—";
      return `- ${title} | форма: ${p.form || "—"} | дозировка: ${p.dosage || "—"} | длительность: ${p.duration || "—"} | причина: ${p.reason || "—"} | эффект: ${p.effect || "—"}`;
    }).join("\n");

    const systemNames = categories.map((c: any) => c.name);

    // Compute adherence %
    const adherenceTotal = adherenceRows.length;
    const adherenceDone = adherenceRows.filter((r: any) => r.status === "completed" || r.status === "done").length;
    const adherencePct = adherenceTotal > 0 ? Math.round((adherenceDone / adherenceTotal) * 100) : null;

    // Plan analysis milestone dates
    const startDate = new Date(latest.date);
    const intervalMonths = Math.round(12 / analysesPerYear);
    const plannedAnalysisDates: string[] = [];
    for (let i = 1; i < analysesPerYear; i++) {
      plannedAnalysisDates.push(toIso(addMonths(startDate, i * intervalMonths)));
    }
    plannedAnalysisDates.push(toIso(addMonths(startDate, 12)));

    // Override with real booking dates where possible
    const realDates = futureBookings.map((b: any) => b.booking_date).slice(0, plannedAnalysisDates.length);
    const finalAnalysisDates = plannedAnalysisDates.map((d, i) => realDates[i] || d);

    const complaintsText = [complaints?.main_complaints, complaints?.goals, complaints?.lifestyle].filter(Boolean).join(" | ") || "не указано";

    const FIXED_SYSTEMS = [
      { key: "energy", label: "Энергия и выносливость" },
      { key: "sleep", label: "Сон и восстановление" },
      { key: "gut", label: "ЖКТ и пищеварение" },
      { key: "hormones", label: "Гормональный баланс" },
      { key: "metabolism", label: "Метаболизм" },
      { key: "inflammation", label: "Воспаление и иммунитет" },
    ];

    const milestonesCount = analysesPerYear === 2 ? 4 : analysesPerYear === 3 ? 5 : 6;

    const systemPrompt = `Ты — врач превентивной медицины. По данным пациента сформируй:
1) Реалистичный прогноз биовозраста через 12 мес (target_bio_age, trajectory_points).
2) Цели по системам (system_goals) и карту действий (action_map) — связь назначений с биомаркерами.
3) ГОДОВУЮ КАРТУ ПУТИ ПАЦИЕНТА (roadmap) — ровно ${milestonesCount} майлстоунов на 12 месяцев. Майлстоуны типа "analysis" должны быть привязаны к датам плановых анализов: ${finalAnalysisDates.join(", ")}. Первый майлстоун — старт (kind=start, date=${toIso(startDate)}). Последний — итоги года (kind=summary). Промежуточные: первые результаты (kind=milestone, через 2 недели), баланс/коррекция (kind=analysis к датам), стабильность/глубокая оптимизация (kind=milestone или analysis). В bullets КАЖДОГО майлстоуна явно отрази главные жалобы пациента и работу с ними по фазам (например, если жалоба на сон — на этапе 3-4 «работа со сном: кортизол, мелатонин»). Фокус (focus) — короткая мотивирующая фраза до 40 символов.
4) КЛЮЧЕВЫЕ БИОМАРКЕРЫ (key_biomarkers) — РОВНО 6 систем: energy, sleep, gut, hormones, metabolism, inflammation. Для каждой — 2-4 КОДА биомаркеров (HbA1c, Ferritin, B12, VitD, Cortisol, CRP, Insulin, HOMA-IR, Mg и т.п.) из реальных данных пациента; приоритет — отклонённые маркеры.

Допустимый сдвиг биовозраста: -0.3..-2.5 года. Все тексты — естественный русский, без канцелярита.`;

    const userPrompt = `ПАЦИЕНТ:
- Хроновозраст: ${chronoAge} | Биовозраст: ${currentBio} | Пол: ${profile.gender === "female" ? "женский" : "мужской"}
- Тариф: ${planName || "не указан"} → ${analysesPerYear} анализа/год
- Жалобы и цели: ${complaintsText}
- Приверженность назначениям (30 дн): ${adherencePct != null ? adherencePct + "%" : "нет данных"}
- Дата старта: ${toIso(startDate)}
- Плановые даты анализов: ${finalAnalysisDates.join(", ")}

БИОМАРКЕРЫ:
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
            target_bio_age: { type: "number" },
            rationale: { type: "string" },
            system_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  system: { type: "string" },
                  goal: { type: "string" },
                  target_biomarkers: { type: "array", items: { type: "string" } },
                },
                required: ["system", "goal", "target_biomarkers"],
                additionalProperties: false,
              },
            },
            action_map: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prescription_name: { type: "string" },
                  systems: { type: "array", items: { type: "string" } },
                  biomarker_codes: { type: "array", items: { type: "string" } },
                  expected_effect: { type: "string" },
                  effect_eta: { type: "string" },
                },
                required: ["prescription_name", "systems", "biomarker_codes", "expected_effect", "effect_eta"],
                additionalProperties: false,
              },
            },
            cohort_percentile: { type: "integer" },
            cohort_label: { type: "string" },
            trajectory_points: {
              type: "array",
              items: {
                type: "object",
                properties: { month: { type: "integer" }, bio_age: { type: "number" } },
                required: ["month", "bio_age"],
                additionalProperties: false,
              },
            },
            roadmap: {
              type: "array",
              description: `Ровно ${milestonesCount} майлстоунов на год`,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Короткое название этапа, 2-4 слова" },
                  date_iso: { type: "string", description: "Дата майлстоуна YYYY-MM-DD" },
                  kind: { type: "string", enum: ["start", "milestone", "analysis", "summary"] },
                  analysis_number: { type: "integer", description: "№ анализа 1..N для kind=analysis или summary" },
                  description: { type: "string", description: "Подзаголовок, 1 строка" },
                  bullets: { type: "array", items: { type: "string" }, description: "3-4 пункта что произойдёт/будет сделано" },
                  focus: { type: "string", description: "Фокус этапа, до 40 символов" },
                },
                required: ["title", "date_iso", "kind", "description", "bullets", "focus"],
                additionalProperties: false,
              },
            },
            key_biomarkers: {
              type: "array",
              description: "Ровно 6 систем: energy, sleep, gut, hormones, metabolism, inflammation",
              items: {
                type: "object",
                properties: {
                  system_key: { type: "string", enum: ["energy", "sleep", "gut", "hormones", "metabolism", "inflammation"] },
                  system_label: { type: "string" },
                  markers: { type: "array", items: { type: "string" }, description: "2-4 кода биомаркеров" },
                },
                required: ["system_key", "system_label", "markers"],
                additionalProperties: false,
              },
            },
          },
          required: ["target_bio_age", "rationale", "system_goals", "action_map", "cohort_percentile", "cohort_label", "trajectory_points", "roadmap", "key_biomarkers"],
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

    const cohortPct = Number.isFinite(parsed.cohort_percentile)
      ? Math.min(99, Math.max(1, Math.round(parsed.cohort_percentile)))
      : null;

    // Trajectory normalization (unchanged)
    let trajectory: Array<{ month: number; bio_age: number }> | null = null;
    if (Array.isArray(parsed.trajectory_points) && parsed.trajectory_points.length >= 2) {
      const map = new Map<number, number>();
      for (const p of parsed.trajectory_points) {
        const m = Math.round(Number(p.month));
        const v = Number(p.bio_age);
        if (m >= 0 && m <= 12 && isFinite(v)) map.set(m, Math.round(v * 10) / 10);
      }
      map.set(0, Math.round(currentBio * 10) / 10);
      map.set(12, target);
      const filled: Array<{ month: number; bio_age: number }> = [];
      const known = [...map.entries()].sort((a, b) => a[0] - b[0]);
      for (let m = 0; m <= 12; m++) {
        if (map.has(m)) { filled.push({ month: m, bio_age: map.get(m)! }); continue; }
        const prev = [...known].reverse().find(([k]) => k < m)!;
        const next = known.find(([k]) => k > m)!;
        const tt = (m - prev[0]) / (next[0] - prev[0]);
        filled.push({ month: m, bio_age: Math.round((prev[1] + (next[1] - prev[1]) * tt) * 10) / 10 });
      }
      trajectory = filled;
    }

    // Roadmap normalization: force start date + override analysis dates with real bookings
    let roadmap: any[] = Array.isArray(parsed.roadmap) ? parsed.roadmap.slice(0, milestonesCount) : [];
    if (roadmap.length > 0) {
      roadmap[0] = { ...roadmap[0], date_iso: toIso(startDate), kind: "start" };
      let analysisIdx = 0;
      const allAnalysisDates = [toIso(startDate), ...finalAnalysisDates]; // includes start (A1) + future
      for (let i = 0; i < roadmap.length; i++) {
        if (roadmap[i].kind === "analysis" || roadmap[i].kind === "summary" || (i === 0)) {
          if (i === 0) { analysisIdx = 1; continue; }
          if (analysisIdx < allAnalysisDates.length) {
            roadmap[i].date_iso = allAnalysisDates[analysisIdx];
            roadmap[i].analysis_number = analysisIdx + 1;
            analysisIdx++;
          }
        }
      }
      // Force last to be summary at 12 months
      const last = roadmap[roadmap.length - 1];
      last.date_iso = toIso(addMonths(startDate, 12));
      last.kind = "summary";
      last.analysis_number = analysesPerYear;
    }

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
        cohort_percentile: cohortPct,
        cohort_label: parsed.cohort_label || null,
        trajectory,
        roadmap,
        key_biomarkers: parsed.key_biomarkers || [],
        analyses_per_year: analysesPerYear,
        model: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ...snapshot, adherence_pct: adherencePct }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
