// finalize-analysis: вторая фаза pipeline (после analyze-biomarkers).
// Делает только: общее резюме (AI) → snapshot (AI tool) → bio age (AI tool) → метрики.
// Все «тяжёлые» данные (категориальные отчёты, назначения) уже сохранены в БД
// предыдущей функцией. Эта функция держится в пределах edge runtime лимитов.

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

  let body: { analysisId?: string; mode?: unknown; background?: boolean; phase?: "summary" | "bioage" | "all" } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Некорректный JSON запроса" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!body.analysisId) {
    return new Response(
      JSON.stringify({ success: false, error: "Не указан ID анализа" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  const phase: "summary" | "bioage" | "all" =
    body.phase === "summary" || body.phase === "bioage" ? body.phase : "all";

  return finalize({ analysisId: body.analysisId, mode, phase });
});

async function finalize({ analysisId, mode, phase }: { analysisId: string; mode: "standard" | "deep"; phase: "summary" | "bioage" | "all" }) {
  const doSummary = phase === "summary" || phase === "all";
  const doBioAge = phase === "bioage" || phase === "all";
  console.log(`finalize-analysis phase=${phase} doSummary=${doSummary} doBioAge=${doBioAge}`);
  try {
    const aiProfile = mode === "deep"
      ? {
          model: "google/gemini-2.5-pro",
          reasoning: { effort: "high" as const },
          tokenMultiplier: 1.25,
        }
      : {
          model: "google/gemini-2.5-flash",
          reasoning: undefined as undefined | { effort: "high" },
          tokenMultiplier: 1,
        };
    console.log(`finalize-analysis mode=${mode} model=${aiProfile.model}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Не настроены переменные окружения");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ===== 1. Загружаем все необходимые данные =====
    const [
      { data: biomarkerCategoriesData },
      { data: promptSettings },
      { data: analysis, error: analysisError },
    ] = await Promise.all([
      supabase.from("biomarker_categories").select("*").order("display_order"),
      supabase.from("ai_prompt_settings").select("*"),
      supabase
        .from("analyses")
        .select(`*, analysis_values (*, biomarkers (*))`)
        .eq("id", analysisId)
        .single(),
    ]);

    if (analysisError || !analysis) throw new Error("Анализ не найден");

    const prompts = (promptSettings || []).reduce((acc: Record<string, string>, p: any) => {
      acc[p.key] = p.prompt_text;
      return acc;
    }, {});

    const [
      { data: profile },
      { data: latestWeightRecord },
      { data: medicalHistory },
      { data: complaints },
      { data: previousAnalyses },
      { data: userSymptoms },
      { data: prescriptionsRows },
      { data: existingRecs },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", analysis.user_id).single(),
      supabase.from("weight_history").select("weight").eq("user_id", analysis.user_id).order("measured_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("medical_history").select("*").eq("user_id", analysis.user_id),
      supabase.from("complaints").select("*").eq("user_id", analysis.user_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("analyses").select(`*, analysis_values (*, biomarkers (*))`).eq("user_id", analysis.user_id).lt("date", analysis.date).order("date", { ascending: false }).limit(5),
      supabase.from("user_symptoms").select("*").eq("user_id", analysis.user_id).order("tracked_at", { ascending: false }).limit(50),
      supabase.from("prescriptions").select("*").eq("analysis_id", analysisId),
      supabase.from("recommendations").select("id, type, text").eq("analysis_id", analysisId),
    ]);

    // categoryReports собираем из уже сохранённых рекомендаций (одна запись на категорию)
    const categoryNames = new Set<string>(
      analysis.analysis_values.map((av: any) => av.biomarkers?.category).filter(Boolean),
    );
    const categoryReports: Record<string, string> = {};
    for (const rec of (existingRecs || []) as any[]) {
      if (rec.type && categoryNames.has(rec.type) && rec.text) {
        categoryReports[rec.type] = rec.text;
      }
    }
    if (Object.keys(categoryReports).length === 0) {
      throw new Error("Категориальные отчёты не найдены — analyze-biomarkers ещё не завершил работу");
    }

    // ===== 2. Контекст пациента =====
    const actualWeight = latestWeightRecord?.weight ? Number(latestWeightRecord.weight) : (profile?.weight ? Number(profile.weight) : null);
    const calculateBMI = (w: number | null, h: number | null) => {
      if (!w || !h || h <= 0) return null;
      const m = h / 100;
      return (w / (m * m)).toFixed(1);
    };
    const bmi = calculateBMI(actualWeight, profile?.height ? Number(profile.height) : null);
    const age = profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : null;
    const patientGender = profile?.gender === "male" ? "male" : profile?.gender === "female" ? "female" : null;

    const groupedMedical = (medicalHistory || []).reduce((acc: any, item: any) => {
      (acc[item.category] = acc[item.category] || []).push(item.condition);
      return acc;
    }, {});
    const medicalHistoryText = Object.keys(groupedMedical).length > 0
      ? Object.entries(groupedMedical).map(([c, items]) => `  ${c}: ${(items as string[]).join(", ")}`).join("\n")
      : "  Не указана";

    const groupedSymptoms = (userSymptoms || []).reduce((acc: any, s: any) => {
      (acc[s.category] = acc[s.category] || []).push(`${s.symptom} (${s.severity}/3)`);
      return acc;
    }, {});
    const symptomsText = Object.keys(groupedSymptoms).length > 0
      ? Object.entries(groupedSymptoms).map(([c, items]) => `  ${c}: ${(items as string[]).join(", ")}`).join("\n")
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
${medicalHistoryText}

ТЕКУЩИЕ ЖАЛОБЫ:
${complaints && complaints.length > 0 ? complaints.map((c: any) => `- ${c.main_complaints || "Не указано"}`).join("\n") : "Не указаны"}

ТЕКУЩИЕ СИМПТОМЫ:
${symptomsText}
    `.trim();

    // ===== 3. Глобальные сводки биомаркеров для summary =====
    const globalBiomarkersSummary = analysis.analysis_values.map((av: any) => {
      const nMin = av.biomarkers.normal_min;
      const nMax = av.biomarkers.normal_max;
      const isOut = (nMin !== null && av.value < nMin) || (nMax !== null && av.value > nMax);
      return `${av.biomarkers.name} (${av.biomarkers.code}): ${av.value} ${av.unit_override || av.biomarkers.unit}${isOut ? " ⚠️" : ""} (норма: ${nMin ?? "—"}–${nMax ?? "—"})`;
    }).join("\n");

    // Список «коротких» рекомендаций из готовых отчётов
    const categoryRecommendations = Object.entries(categoryReports)
      .map(([cat, txt]) => `--- ${cat} ---\n${(txt as string).substring(0, 1200)}`)
      .join("\n\n");

    // Список назначений из БД (могут быть пустыми) — передаём ВСЕ структурные поля,
    // чтобы AI summary видел реальные дозировки, формы и длительности.
    const prescriptionsList = (prescriptionsRows && prescriptionsRows.length > 0)
      ? prescriptionsRows.map((p: any, i: number) => {
          const title = p.name || p.prescription || "(без названия)";
          const meta = [
            p.form && `форма: ${p.form}`,
            p.dosage && `дозировка: ${p.dosage}`,
            p.how_to_take && `приём: ${p.how_to_take}`,
            p.duration && `длительность: ${p.duration}`,
          ].filter(Boolean).join("; ");
          const reason = p.reason ? ` — ${p.reason}` : "";
          return `${i + 1}. ${title}${meta ? ` [${meta}]` : ""}${reason}`;
        }).join("\n")
      : "Назначения не сгенерированы";

    let totalTokens = 0;

    // ===== 4. ОБЩЕЕ РЕЗЮМЕ =====
    let summaryReport = "";
    let summaryRecommendationId: string | null = null;
    if (doSummary) {
    try {
      const allReportsText = Object.entries(categoryReports)
        .map(([cat, report]) => `=== ${cat} ===\n${(report as string).substring(0, 8000)}`)
        .join("\n\n");

      const summaryUserPromptTemplate = prompts["summary_user"];
      const summarySystemPrompt = prompts["summary_system"];
      if (!summaryUserPromptTemplate || !summarySystemPrompt) {
        throw new Error("Промпты для общего резюме не найдены");
      }

      const summaryPrompt = summaryUserPromptTemplate
        .replace(/{userContext}/g, userContext)
        .replace(/{allReportsText}/g, allReportsText)
        .replace(/{globalBiomarkers}/g, globalBiomarkersSummary)
        .replace(/{categoryRecommendations}/g, categoryRecommendations)
        .replace(/{prescriptionsList}/g, prescriptionsList);

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiProfile.model,
          ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
          messages: [
            { role: "system", content: summarySystemPrompt },
            { role: "user", content: summaryPrompt },
          ],
          max_completion_tokens: Math.round(16000 * aiProfile.tokenMultiplier),
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summaryReport = summaryData.choices?.[0]?.message?.content || "";
        totalTokens += summaryData.usage?.total_tokens || 0;
        console.log(`Summary: tokens=${summaryData.usage?.total_tokens}, length=${summaryReport.length}`);
      } else {
        console.error("Summary AI failed:", summaryResponse.status, await summaryResponse.text());
        summaryReport = "Не удалось сгенерировать общее резюме";
      }
    } catch (e: any) {
      console.error("Error generating summary:", e);
      summaryReport = "Ошибка при генерации общего резюме";
    }

    // Сохраняем «Общее резюме». ВАЖНО: не делаем DELETE+INSERT — у таблицы
    // prescriptions есть FK recommendation_id → recommendations.id ON DELETE
    // CASCADE, и удаление старой записи «Общее резюме» каскадно сносит все
    // ранее сгенерированные нутрицевтики этого анализа. Используем UPDATE
    // существующей записи, либо INSERT, если её ещё нет.
    if (summaryReport) {
      const { data: existing } = await supabase
        .from("recommendations")
        .select("id")
        .eq("analysis_id", analysisId)
        .eq("type", "Общее резюме")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        summaryRecommendationId = existing.id;
        // @ts-ignore — content_json обновим ниже, здесь только text
        const { error: updErr } = await supabase
          .from("recommendations")
          .update({ text: summaryReport })
          .eq("id", existing.id);
        if (updErr) console.error("Error updating summary:", updErr);
        else console.log(`Updated: Общее резюме (id: ${summaryRecommendationId})`);
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("recommendations")
          .insert({
            user_id: analysis.user_id,
            analysis_id: analysisId,
            type: "Общее резюме",
            text: summaryReport,
          })
          .select("id")
          .single();
        if (insErr) {
          console.error("Error inserting summary:", insErr);
        } else {
          summaryRecommendationId = inserted?.id || null;
          console.log(`Inserted: Общее резюме (id: ${summaryRecommendationId})`);
        }
      }

      // Связываем уже сохранённые prescriptions с этой записью (если ещё не связаны)
      if (summaryRecommendationId && prescriptionsRows && prescriptionsRows.length > 0) {
        await supabase
          .from("prescriptions")
          .update({ recommendation_id: summaryRecommendationId })
          .eq("analysis_id", analysisId)
          .is("recommendation_id", null);
      }
    }

    // ===== 5. SNAPSHOT (детерминированная сборка) =====
    //
    // Раньше snapshot строился через AI tool-call, что приводило к двум проблемам:
    //   1) AI пересказывал/сокращал нарратив категорий → терялись интерпретации
    //      биомаркеров, появлялись расхождения с разделом «Назначения».
    //   2) При невалидном ответе fallback не всегда срабатывал, и в БД попадал
    //      пустой content_json — фронт уходил в legacy путь, теряя структуру.
    //
    // Теперь собираем snapshot вручную, детерминированно. Нарратив категории
    // (который AI уже сгенерировал в analyze-biomarkers с интерпретациями
    // каждого биомаркера) сохраняется ЦЕЛИКОМ как text-блок, под ним —
    // структурированные карточки биомаркеров (со шкалой), а в самом конце
    // добавляется блок «Назначения» из таблицы prescriptions.
    try {
      const biomarkersForSnapshot = analysis.analysis_values.map((av: any) => ({
        biomarker_id: av.biomarker_id,
        name: av.biomarkers.name,
        code: av.biomarkers.code,
        category: av.biomarkers.category,
        value: av.value,
        unit: av.unit_override || av.biomarkers.unit,
      }));

      // Группируем биомаркеры по категориям (с сохранением порядка из БД)
      const biomarkersByCategory = biomarkersForSnapshot.reduce((acc: any, b: any) => {
        (acc[b.category] = acc[b.category] || []).push(b);
        return acc;
      }, {} as Record<string, any[]>);

      // Порядок категорий: как в biomarker_categories (display_order),
      // плюс категории, которых там нет, — в конце.
      const orderedCategories: string[] = [];
      for (const cat of (biomarkerCategoriesData || [])) {
        if (categoryReports[cat.name] || biomarkersByCategory[cat.name]) {
          orderedCategories.push(cat.name);
        }
      }
      for (const cat of Object.keys(categoryReports)) {
        if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
      }
      for (const cat of Object.keys(biomarkersByCategory)) {
        if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
      }

      const categoryEmoji: Record<string, string> = (biomarkerCategoriesData || [])
        .reduce((acc: any, cat: any) => {
          if (cat.emoji) acc[cat.name] = cat.emoji;
          return acc;
        }, {});

      const blocks: any[] = [];

      // 1) Общее резюме — отдельная секция в самом начале
      if (summaryReport && summaryReport.trim()) {
        blocks.push({ type: "section", title: "Общее резюме", emoji: "📋" });
        blocks.push({ type: "summary", content: summaryReport, scope: "overall" });
        blocks.push({ type: "spacer", size: "medium" });
      }

      // 2) Категории: заголовок + ИНТЕРЛИВИНГ нарратива и карточек биомаркеров.
      //
      // Нарратив (analyze-biomarkers) имеет структуру с HTML-якорями:
      //   <!-- anchor:intro_start --> ... <!-- anchor:intro_end -->
      //   Интерпретация биомаркеров
      //   <!-- anchor:biomarker КОД -->
      //   Имя биомаркера
      //   <интерпретация — несколько абзацев>
      //   <!-- anchor:biomarker КОД2 -->
      //   ...
      //
      // Сплитим текст по якорям `<!-- anchor:biomarker КОД -->` и формируем:
      //   text(вступление + intro) → biomarker(карточка с интерпретацией в commentary)
      //   → biomarker(карточка с интерпретацией) → ...
      //
      // КЛЮЧЕВОЕ: AI обязан ставить закрывающий якорь
      // `<!-- anchor:biomarker_end -->` сразу после интерпретации каждого
      // биомаркера. Парсер режет сегмент строго `[anchor_start..anchor_end]`,
      // что устраняет «протечку» хвоста (особенно у последнего биомаркера
      // в категории, который раньше «съедал» всё до конца текста).
      // Текст между `biomarker_end` и следующим `biomarker`-якорем (или до
      // конца) попадает в обычный нарративный text-блок категории.
      const BIO_ANCHOR_RE = /<!--\s*anchor:biomarker\s+([^\s>]+?)\s*-->/g;
      const BIO_END_RE = /<!--\s*anchor:biomarker_end\s*-->/;
      // Доп. «жёсткие границы» — если AI забыл biomarker_end, не даём
      // интерпретации последнего биомаркера утечь в блоки strengths/pagebreak
      // или в заголовок «Общая оценка».
      const HARD_STOP_RE = /<!--\s*anchor:(?:strengths_start|strengths_end|pagebreak|intro_start|intro_end)\s*-->|^\s*#{1,6}\s*Общая оценка/im;

      for (const cat of orderedCategories) {
        const emoji = categoryEmoji[cat];
        blocks.push({ type: "section", title: cat, ...(emoji ? { emoji } : {}) });

        const narrative = categoryReports[cat];
        const markers = biomarkersByCategory[cat] || [];

        const markerByKey = new Map<string, any>();
        for (const m of markers) {
          if (m.code) markerByKey.set(String(m.code).toUpperCase().trim(), m);
          if (m.name) markerByKey.set(String(m.name).toUpperCase().trim(), m);
        }
        const usedIds = new Set<string>();

        if (narrative && narrative.trim()) {
          const raw = String(narrative);

          // Найдём все позиции biomarker-якорей.
          const anchors: { code: string; start: number; end: number }[] = [];
          let m: RegExpExecArray | null;
          BIO_ANCHOR_RE.lastIndex = 0;
          while ((m = BIO_ANCHOR_RE.exec(raw)) !== null) {
            anchors.push({ code: m[1].trim(), start: m.index, end: m.index + m[0].length });
          }

          // Чистилка от прочих якорей и заголовков-обёрток.
          const stripMisc = (s: string) =>
            s
              .replace(/<!--\s*anchor:[^\n>]*?-->/g, "")
              .replace(/^\s*Интерпретация биомаркеров\s*$/im, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

          if (anchors.length === 0) {
            // Якорей нет — кладём весь нарратив одним текстовым блоком.
            const cleaned = stripMisc(raw);
            if (cleaned) blocks.push({ type: "text", content: cleaned });
          } else {
            // Вступление — всё до первого biomarker-якоря.
            const intro = stripMisc(raw.slice(0, anchors[0].start));
            if (intro) blocks.push({ type: "text", content: intro });

            // Каждый сегмент: от end текущего biomarker-якоря до:
            //   1) ближайшего `<!-- anchor:biomarker_end -->` (приоритет), либо
            //   2) start следующего biomarker-якоря, либо
            //   3) конца текста.
            // Текст после biomarker_end (но до следующего biomarker-якоря) —
            // это «нарративный мост» категории, кладём его отдельным text-блоком,
            // чтобы он не «протёк» в карточку биомаркера.
            for (let i = 0; i < anchors.length; i++) {
              const a = anchors[i];
              const nextStart = i + 1 < anchors.length ? anchors[i + 1].start : raw.length;
              const region = raw.slice(a.end, nextStart);

              const endMatch = region.match(BIO_END_RE);
              const hardStopMatch = region.match(HARD_STOP_RE);
              // Берём наименьший индекс из biomarker_end и hard-stop границ.
              let cutIndex: number | null = null;
              let cutLength = 0;
              if (endMatch && typeof endMatch.index === "number") {
                cutIndex = endMatch.index;
                cutLength = endMatch[0].length;
              }
              if (hardStopMatch && typeof hardStopMatch.index === "number") {
                if (cutIndex === null || hardStopMatch.index < cutIndex) {
                  cutIndex = hardStopMatch.index;
                  // hard-stop НЕ съедаем — оставляем в хвосте, чтобы он
                  // корректно обработался дальше (strengths рендерится отдельно).
                  cutLength = 0;
                }
              }
              const commentaryRaw = cutIndex !== null
                ? region.slice(0, cutIndex)
                : region;
              const tailRaw = cutIndex !== null
                ? region.slice(cutIndex + cutLength)
                : "";

              // Убираем первую строку-заголовок (имя биомаркера) — оно
              // дублирует название в карточке.
              const cleanedSegment = commentaryRaw.replace(/^\s*\n*[^\n]+\n+/, "");
              const commentary = stripMisc(cleanedSegment);

              const matched =
                markerByKey.get(a.code.toUpperCase()) ||
                null;

              if (matched) {
                usedIds.add(matched.biomarker_id);
                blocks.push({
                  type: "biomarker",
                  biomarker_id: matched.biomarker_id,
                  commentary,
                });
              } else if (commentary) {
                blocks.push({ type: "text", content: commentary });
              }

              // Хвост между biomarker_end и следующим biomarker-якорем —
              // нарративный «мост» категории.
              const tail = stripMisc(tailRaw);
              if (tail) {
                blocks.push({ type: "text", content: tail });
              }
            }
          }
        }

        // Биомаркеры, которые не упомянуты в нарративе, добавляем в конце
        // как карточки без комментария — чтобы шкала всё равно была видна.
        const leftover = markers.filter((m: any) => !usedIds.has(m.biomarker_id));
        if (leftover.length > 0) {
          blocks.push({ type: "spacer", size: "small" });
          for (const m of leftover) {
            blocks.push({
              type: "biomarker",
              biomarker_id: m.biomarker_id,
              commentary: "",
            });
          }
        }
        blocks.push({ type: "spacer", size: "medium" });
      }

      // 3) Блок «Назначения» НЕ добавляем в snapshot — раздел рендерится в
      //    Recommendations.tsx структурно из таблицы prescriptions (со
      //    статусами, контрольными датами и формой). Если положить его сюда,
      //    в UI получится дубликат (один в snapshot, второй — снаружи).

      const finalSnapshot = blocks.length > 0
        ? {
            version: 1 as const,
            blocks,
            meta: {
              generated_at: new Date().toISOString(),
              model: "deterministic",
              mode,
              analysis_id: analysisId,
            },
          }
        : null;

      console.log(
        `Snapshot built (deterministic): ${blocks.length} blocks, ` +
        `${orderedCategories.length} categories, ` +
        `${prescriptionsRows?.length || 0} prescriptions`,
      );

      // Если по какой-то причине у нас нет recommendation для «Общее резюме»,
      // создаём минимальную запись, чтобы было куда положить snapshot.
      if (finalSnapshot && !summaryRecommendationId) {
        const { data: created, error: createErr } = await supabase
          .from("recommendations")
          .insert({
            user_id: analysis.user_id,
            analysis_id: analysisId,
            type: "Общее резюме",
            text: summaryReport || "Резюме недоступно — отчёт сформирован в режиме fallback.",
          })
          .select("id")
          .single();
        if (createErr) console.error("Fallback summary insert error:", createErr.message);
        else {
          summaryRecommendationId = created?.id || null;
          if (summaryRecommendationId && prescriptionsRows && prescriptionsRows.length > 0) {
            await supabase
              .from("prescriptions")
              .update({ recommendation_id: summaryRecommendationId })
              .eq("analysis_id", analysisId)
              .is("recommendation_id", null);
          }
        }
      }

      if (finalSnapshot && summaryRecommendationId) {
        const { error: snapErr } = await supabase
          .from("recommendations")
          // @ts-ignore
          .update({ content_json: finalSnapshot })
          .eq("id", summaryRecommendationId);
        if (snapErr) console.error("Snapshot save error:", snapErr.message);
        else console.log(`Snapshot saved (${finalSnapshot.blocks.length} blocks, fallback=${finalSnapshot.meta?.fallback === true})`);
      }
    } catch (e: any) {
      console.error("Snapshot error (non-fatal):", e.message);
    }

    // ===== 6. BIOLOGICAL AGE + HEALTH INDEX =====
    let health_index: number | null = null;
    let biological_age: number | null = null;
    let biomarkers_metadata: any = null;

    // Композитные биомаркеры (окно 4 месяца)
    const compositeBiomarkers = buildCompositeBiomarkers(analysis, previousAnalyses || [], 4);
    const totalValues = compositeBiomarkers.values.length;

    if (totalValues > 0) {
      let planBiomarkersCount: number | null = null;
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", analysis.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subscription?.plan_id) {
        const { count } = await supabase
          .from("plan_biomarkers")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", subscription.plan_id);
        if (count && count > 0) planBiomarkersCount = count;
      }
      const totalBiomarkersForCoverage = planBiomarkersCount || compositeBiomarkers.values.length;

      const patientBMI = bmi ? Number(bmi) : null;
      const healthResult = calculateHealthIndex(
        compositeBiomarkers.values,
        age,
        patientGender,
        totalBiomarkersForCoverage,
        patientBMI,
      );
      health_index = Math.round(healthResult.adjusted);

      console.log(`health_index=${health_index} coverage=${healthResult.coverage}%`);

      const chronologicalAge = age;
      if (chronologicalAge) {
        const baseBioAge = chronologicalAge + (70 - health_index) * 0.15;

        try {
          const biomarkersForAI = compositeBiomarkers.values.map((av: any) => ({
            name: av.biomarkers.name,
            code: av.biomarkers.code,
            category: av.biomarkers.category,
            value: av.value,
            unit: av.unit_override || av.biomarkers.unit,
            normal_min: av.biomarkers.normal_min,
            normal_max: av.biomarkers.normal_max,
            aging_weight: av.biomarkers.aging_weight || 1.0,
            source: av.source,
            analysis_date: av.analysis_date,
          }));

          const previousAnalysesForAI = (previousAnalyses || []).slice(0, 3).map((pa: any) => ({
            date: pa.date,
            biological_age: pa.biological_age,
            health_index: pa.health_index,
            biomarkers_count: pa.analysis_values?.length || 0,
          }));
          const symptomsForAI = (userSymptoms || []).slice(0, 10).map((s: any) => ({
            category: s.category, symptom: s.symptom, severity: s.severity,
          }));

          const categoriesList = (biomarkerCategoriesData || []).map((cat: any) => `${cat.emoji} ${cat.name}`).join("\n");

          const systemPrompt = prompts["biological_age_system"] || "Ты эксперт по биомаркерам старения.";
          const userPromptTemplate = prompts["biological_age_user"] ||
            `Рассчитай биологический возраст для пациента {chronologicalAge} лет, пол {gender}.\nБиомаркеры: {biomarkersData}`;
          const userPrompt = userPromptTemplate
            .replace(/{chronologicalAge}/g, String(age))
            .replace(/{gender}/g, patientGender === "male" ? "мужской" : "женский")
            .replace(/{biomarkersData}/g, JSON.stringify(biomarkersForAI, null, 2))
            .replace(/{previousAnalysesData}/g, previousAnalysesForAI.length > 0 ? JSON.stringify(previousAnalysesForAI, null, 2) : "Нет предыдущих анализов")
            .replace(/{symptomsData}/g, symptomsForAI.length > 0 ? JSON.stringify(symptomsForAI, null, 2) : "Симптомы не указаны")
            .replace(/{categoriesList}/g, categoriesList);

          const aiConstraintPrompt = `\n\nВАЖНО: Сервер уже рассчитал base_bio_age = ${baseBioAge.toFixed(1)} и health_index = ${health_index}.
Скорректируй biological_age в [${(baseBioAge - 3).toFixed(1)}, ${(baseBioAge + 3).toFixed(1)}].
health_index ДОЛЖЕН быть равен ${health_index}.`;

          const categoryScoresProperties = (biomarkerCategoriesData || []).reduce((acc: any, cat: any) => {
            acc[cat.name] = {
              type: "object",
              properties: {
                score: { type: "integer" },
                impact: { type: "string", enum: ["low", "moderate", "high"] },
                key_markers: { type: "array", items: { type: "string" } },
              },
            };
            return acc;
          }, {});
          const categoryScoresRequired = (biomarkerCategoriesData || []).map((cat: any) => cat.name);

          const bioAgeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: aiProfile.model,
              ...(aiProfile.reasoning ? { reasoning: aiProfile.reasoning } : {}),
              temperature: 0,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt + aiConstraintPrompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "calculate_biological_age",
                  parameters: {
                    type: "object",
                    properties: {
                      biological_age: { type: "number" },
                      confidence_score: { type: "integer" },
                      aging_rate: { type: "number" },
                      health_index: { type: "integer" },
                      category_scores: { type: "object", properties: categoryScoresProperties, required: categoryScoresRequired },
                      key_aging_markers: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            normal_max: { type: "number" },
                            deviation: { type: "string" },
                            impact: { type: "string", enum: ["low", "moderate", "high"] },
                            reason: { type: "string" },
                          },
                          required: ["name", "value", "impact", "reason"],
                        },
                      },
                      missing_critical_markers: { type: "array", items: { type: "string" } },
                      explanation: { type: "string" },
                    },
                    required: ["biological_age", "confidence_score", "health_index", "category_scores", "key_aging_markers", "explanation"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "calculate_biological_age" } },
            }),
          });

          if (!bioAgeResponse.ok) throw new Error("Failed to get AI adjustment");
          const bioAgeData = await bioAgeResponse.json();
          totalTokens += bioAgeData.usage?.total_tokens || 0;
          const toolCall = bioAgeData.choices?.[0]?.message?.tool_calls?.[0];

          if (toolCall?.function?.arguments) {
            const aiResult = JSON.parse(toolCall.function.arguments);
            let aiBioAge = aiResult.biological_age;
            aiBioAge = Math.max(baseBioAge - 3, Math.min(baseBioAge + 3, aiBioAge));
            aiBioAge = Math.max(chronologicalAge - 15, Math.min(chronologicalAge + 15, aiBioAge));
            biological_age = Math.round(aiBioAge * 10) / 10;

            biomarkers_metadata = {
              ...compositeBiomarkers.metadata,
              server_calculation: {
                raw_health_index: healthResult.raw,
                adjusted_health_index: healthResult.adjusted,
                base_bio_age: Math.round(baseBioAge * 10) / 10,
                coverage_percent: healthResult.coverage,
                confidence_factor: healthResult.confidenceFactor,
                top_penalties: healthResult.penalties.slice(0, 5),
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
              },
            };
            console.log(`Final bio age: ${biological_age} (base: ${baseBioAge.toFixed(1)})`);
          } else {
            throw new Error("AI did not return structured data");
          }
        } catch (e: any) {
          console.error("AI bio age error, using fallback:", e.message);
          biological_age = Math.round(baseBioAge * 10) / 10;
          biomarkers_metadata = {
            ...compositeBiomarkers.metadata,
            server_calculation: {
              raw_health_index: healthResult.raw,
              adjusted_health_index: healthResult.adjusted,
              base_bio_age: Math.round(baseBioAge * 10) / 10,
              coverage_percent: healthResult.coverage,
              confidence_factor: healthResult.confidenceFactor,
            },
            calculation_method: "server_only_fallback",
            error: String(e),
          };
        }
      } else {
        biomarkers_metadata = {
          ...compositeBiomarkers.metadata,
          server_calculation: {
            raw_health_index: healthResult.raw,
            adjusted_health_index: healthResult.adjusted,
            coverage_percent: healthResult.coverage,
            confidence_factor: healthResult.confidenceFactor,
          },
          error: "No birth date available",
        };
      }
    }

    // ===== 7. Сохраняем результаты =====
    await supabase
      .from("analyses")
      .update({ health_index, biological_age, biomarkers_metadata })
      .eq("id", analysisId);

    console.log(`finalize-analysis done. tokens=${totalTokens}`);

    return new Response(
      JSON.stringify({
        success: true,
        health_index,
        biological_age,
        total_tokens: totalTokens,
        summary_length: summaryReport.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in finalize-analysis:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Неизвестная ошибка финализации",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

// ============= Helpers =============

function buildCompositeBiomarkers(currentAnalysis: any, previousAnalyses: any[], windowMonths = 4) {
  const currentDate = new Date(currentAnalysis.date);
  const windowStartDate = new Date(currentDate);
  windowStartDate.setMonth(windowStartDate.getMonth() - windowMonths);
  const map = new Map<string, any>();
  currentAnalysis.analysis_values.forEach((av: any) => {
    map.set(av.biomarker_id, { ...av, source: "current", analysis_date: currentAnalysis.date });
  });
  previousAnalyses
    .filter((a) => new Date(a.date) >= windowStartDate && new Date(a.date) < currentDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((prev) => {
      prev.analysis_values?.forEach((av: any) => {
        if (!map.has(av.biomarker_id)) {
          map.set(av.biomarker_id, { ...av, source: "historical", analysis_date: prev.date });
        }
      });
    });
  const values = Array.from(map.values());
  const currentCount = values.filter((v) => v.source === "current").length;
  const historicalCount = values.filter((v) => v.source === "historical").length;
  const oldestDate = historicalCount > 0
    ? values.filter((v) => v.source === "historical")
        .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())[0]?.analysis_date
    : null;
  return {
    values,
    metadata: {
      total_count: values.length,
      current_count: currentCount,
      historical_count: historicalCount,
      oldest_historical_date: oldestDate,
      window_months: windowMonths,
    },
  };
}

function calculateHealthIndex(
  biomarkerValues: any[],
  patientAge: number | null,
  patientGender: string | null,
  totalBiomarkersInSystem: number,
  patientBMI: number | null = null,
): { raw: number; adjusted: number; coverage: number; confidenceFactor: number; penalties: any[] } {
  let totalPenalty = 0;
  const penalties: any[] = [];

  for (const av of biomarkerValues) {
    let normalMin = av.biomarkers.normal_min;
    let normalMax = av.biomarkers.normal_max;
    let optimalMin = av.biomarkers.optimal_min;
    let optimalMax = av.biomarkers.optimal_max;
    let criticalMin = av.biomarkers.critical_min;
    let criticalMax = av.biomarkers.critical_max;

    if (av.biomarkers.range_mode === "age" && av.biomarkers.age_ranges && patientGender && patientAge !== null) {
      const ageRanges = av.biomarkers.age_ranges[patientGender];
      if (ageRanges) {
        const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
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
    if (normalMin === av.biomarkers.normal_min && patientGender === "male" && av.biomarkers.normal_min_male !== null) {
      normalMin = av.biomarkers.normal_min_male; normalMax = av.biomarkers.normal_max_male;
    } else if (normalMin === av.biomarkers.normal_min && patientGender === "female" && av.biomarkers.normal_min_female !== null) {
      normalMin = av.biomarkers.normal_min_female; normalMax = av.biomarkers.normal_max_female;
    }
    if (optimalMin === null && patientGender === "male" && av.biomarkers.optimal_min_male !== null) {
      optimalMin = av.biomarkers.optimal_min_male; optimalMax = av.biomarkers.optimal_max_male;
    } else if (optimalMin === null && patientGender === "female" && av.biomarkers.optimal_min_female !== null) {
      optimalMin = av.biomarkers.optimal_min_female; optimalMax = av.biomarkers.optimal_max_female;
    }
    if (criticalMin === null && patientGender === "male" && av.biomarkers.critical_min_male !== null) {
      criticalMin = av.biomarkers.critical_min_male; criticalMax = av.biomarkers.critical_max_male;
    } else if (criticalMin === null && patientGender === "female" && av.biomarkers.critical_min_female !== null) {
      criticalMin = av.biomarkers.critical_min_female; criticalMax = av.biomarkers.critical_max_female;
    }

    if (normalMin === null && normalMax === null) continue;
    const range = normalMin !== null && normalMax !== null ? normalMax - normalMin : 1;
    if (normalMin !== null && normalMax !== null && range <= 0) continue;

    const agingWeight = av.biomarkers.aging_weight || 1.0;
    let penalty = 0;
    let tier = "optimal";
    const isCriticalLow = criticalMin !== null && av.value < criticalMin;
    const isCriticalHigh = criticalMax !== null && av.value > criticalMax;
    const isOutsideNormal = (normalMin !== null && av.value < normalMin) || (normalMax !== null && av.value > normalMax);
    const isInOptimal = optimalMin !== null || optimalMax !== null
      ? (optimalMin === null || av.value >= optimalMin) && (optimalMax === null || av.value <= optimalMax)
      : !isOutsideNormal;

    if (isCriticalLow || isCriticalHigh) { penalty = 15 * agingWeight; tier = "critical"; }
    else if (isOutsideNormal) { penalty = 5 * agingWeight; tier = "risk"; }
    else if (!isInOptimal) { penalty = 1 * agingWeight; tier = "acceptable"; }

    totalPenalty += penalty;
    if (penalty > 0) penalties.push({ name: av.biomarkers.name, code: av.biomarkers.code, tier, penalty, weight: agingWeight });
  }

  let bmiMarkerAdded = false;
  if (patientBMI !== null) {
    const bmiWeight = 5.0;
    let bmiPenalty = 0;
    let bmiTier = "optimal";
    if (patientBMI > 30 || patientBMI < 16) { bmiPenalty = 15 * bmiWeight; bmiTier = "critical"; }
    else if (patientBMI > 27 || patientBMI < 17) { bmiPenalty = 5 * bmiWeight; bmiTier = "risk"; }
    else if (patientBMI > 25 || patientBMI < 18.5) { bmiPenalty = 1 * bmiWeight; bmiTier = "acceptable"; }
    totalPenalty += bmiPenalty;
    bmiMarkerAdded = true;
    if (bmiPenalty > 0) penalties.push({ name: "Индекс массы тела", code: "BMI", tier: bmiTier, penalty: bmiPenalty, weight: bmiWeight });
  }

  const markerCount = biomarkerValues.filter((av) => {
    let nMin = av.biomarkers.normal_min;
    let nMax = av.biomarkers.normal_max;
    if (av.biomarkers.range_mode === "age" && av.biomarkers.age_ranges && patientGender && patientAge !== null) {
      const ageRanges = av.biomarkers.age_ranges[patientGender];
      if (ageRanges) {
        const ageRange = ageRanges.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to);
        if (ageRange) { nMin = ageRange.min; nMax = ageRange.max; }
      }
    }
    if (nMin === av.biomarkers.normal_min && patientGender === "male" && av.biomarkers.normal_min_male !== null) {
      nMin = av.biomarkers.normal_min_male; nMax = av.biomarkers.normal_max_male;
    } else if (nMin === av.biomarkers.normal_min && patientGender === "female" && av.biomarkers.normal_min_female !== null) {
      nMin = av.biomarkers.normal_min_female; nMax = av.biomarkers.normal_max_female;
    }
    if (nMin === null && nMax === null) return false;
    if (nMin !== null && nMax !== null && (nMax - nMin) <= 0) return false;
    return true;
  }).length + (bmiMarkerAdded ? 1 : 0);

  if (markerCount === 0) return { raw: 70, adjusted: 70, coverage: 0, confidenceFactor: 0, penalties: [] };

  const avgPenalty = totalPenalty / markerCount;
  const rawHealthIndex = Math.max(0, Math.min(100, 100 - avgPenalty * 15));
  const coverage = markerCount / totalBiomarkersInSystem;
  const confidenceFactor = Math.min(1.0, coverage / 0.5);

  return {
    raw: Math.round(rawHealthIndex * 10) / 10,
    adjusted: Math.round(rawHealthIndex * 10) / 10,
    coverage: Math.round(coverage * 100),
    confidenceFactor: Math.round(confidenceFactor * 100) / 100,
    penalties: penalties.sort((a, b) => b.penalty - a.penalty).slice(0, 10),
  };
}
