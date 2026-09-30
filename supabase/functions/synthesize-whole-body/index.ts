// synthesize-whole-body: собирает единый раздел «Организм в целом» из уже
// сгенерированных разделов по системам, затем удаляет разделы по системам
// и включает скрытия презентации (без данных пациента и плашек показателей).
//
// Вызывается report-orchestrator последним шагом при report_kind = whole_body.
// Промпты — только из ai_prompt_settings (whole_body_system / whole_body_user).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHOLE_BODY_TYPE = "Организм в целом";

function extractBiomarkerCodes(text: string): string[] {
  const anchored = [...text.matchAll(/<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/gi)]
    .map((match) => match[1]?.trim())
    .filter((code): code is string => Boolean(code));
  if (anchored.length > 0) return anchored;

  // Старые целостные разделы могли потерять якорные комментарии, но сохранили
  // заголовки «Название (CODE)». Это позволяет безопасно пересобрать их.
  return [...text.matchAll(/^.{2,160}\s\(([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9_.%/+\- ]{0,30})\)\s*$/gm)]
    .map((match) => match[1]?.trim())
    .filter((code): code is string => Boolean(code));
}

function extractDeviationCodes(text: string): string[] {
  const chunks: Array<{ code: string; content: string }> = [];
  const anchored = [...text.matchAll(
    /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->([\s\S]*?)<!--\s*anchor:biomarker_end\s*-->/gi,
  )];
  if (anchored.length > 0) {
    for (const match of anchored) chunks.push({ code: match[1]?.trim() || "", content: match[2] || "" });
  } else {
    const headings = [...text.matchAll(/^.{2,160}\s\(([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9_.%/+\- ]{0,30})\)\s*$/gm)];
    for (let index = 0; index < headings.length; index++) {
      const start = headings[index].index ?? 0;
      const end = headings[index + 1]?.index ?? text.length;
      chunks.push({ code: headings[index][1]?.trim() || "", content: text.slice(start, end) });
    }
  }
  return chunks
    .filter(({ content }) => {
      const valueLine = content.split("\n").find((line) => /^\s*Ваш/i.test(line)) || "";
      return /находится\s+(?:ниже|выше)|находится\s+в\s+критическ|отклонен|отклонён/i.test(valueLine);
    })
    .map(({ code }) => code)
    .filter(Boolean);
}

function validateBiomarkerStructure(
  text: string,
  expectedCodes: string[],
  deviationCodes: string[],
): string | null {
  const blocks = [...text.matchAll(
    /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->([\s\S]*?)<!--\s*anchor:biomarker_end\s*-->/gi,
  )];
  const foundCodes = new Set(blocks.map((match) => match[1]?.trim().toLowerCase()));
  const missingCodes = expectedCodes.filter((code) => !foundCodes.has(code.toLowerCase()));
  if (missingCodes.length > 0) return `пропущены биомаркеры: ${missingCodes.join(", ")}`;

  for (const block of blocks) {
    const code = block[1]?.trim() || "?";
    const content = block[2] || "";
    const paragraphs = content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    if (paragraphs.length < 3) return `${code}: нет полного описания и персонального разбора`;
    if (!/Ваш(?:а|е|и)?\s+(?:абсолютный\s+)?(?:показатель|уровень|значение|индекс|результат)/i.test(content)) {
      return `${code}: нет строки «Ваш показатель…»`;
    }
    if (
      deviationCodes.some((expected) => expected.toLowerCase() === code.toLowerCase()) &&
      !/Что это значит для вас/i.test(content)
    ) {
      return `${code}: при отклонении нет блока «Что это значит для вас»`;
    }
  }

  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  // Служебный вызов оркестратора или прямой запуск сотрудником из админки.
  const auth = req.headers.get("Authorization") ?? "";
  const callerToken = auth.replace(/^Bearer\s+/i, "");

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const analysisId = typeof body.analysisId === "string" ? body.analysisId : "";
  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) return json({ success: false, error: "analysisId required" }, 400);
  if (!LOVABLE_API_KEY) return json({ success: false, error: "LOVABLE_API_KEY missing" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (callerToken !== SERVICE_KEY) {
      const { data: { user } } = await supabase.auth.getUser(callerToken);
      if (!user) return json({ success: false, error: "unauthorized" }, 401);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id)
        .in("role", ["admin", "superadmin", "doctor"]);
      if (!roles?.length) return json({ success: false, error: "forbidden" }, 403);
    }

    const [{ data: cats }, { data: prompts }, { data: recs }, { data: analysis }] = await Promise.all([
      supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      supabase.from("ai_prompt_settings").select("key, prompt_text").in("key", ["whole_body_system", "whole_body_user"]),
      supabase.from("recommendations").select("id, type, text, created_at").eq("analysis_id", analysisId),
      supabase.from("analyses").select("user_id, cover_overrides").eq("id", analysisId).maybeSingle(),
    ]);
    if (!analysis) return json({ success: false, error: "analysis not found" }, 404);

    const catOrder = new Map((cats ?? []).map((c: any, i: number) => [c.name, i]));
    const categoryRecs = (recs ?? [])
      .filter((r: any) => catOrder.has(r.type) && (r.text ?? "").trim().length > 0)
      .sort((a: any, b: any) => (catOrder.get(a.type)! - catOrder.get(b.type)!));
    const existingWhole = (recs ?? []).find((r: any) => r.type === WHOLE_BODY_TYPE);

    if (categoryRecs.length === 0 && !existingWhole) {
      return json({ success: false, error: "Нет разделов по системам для объединения" }, 400);
    }

    const promptMap = new Map((prompts ?? []).map((p: any) => [p.key, p.prompt_text as string]));
    const systemPrompt = promptMap.get("whole_body_system");
    const userTemplate = promptMap.get("whole_body_user");
    if (!systemPrompt || !userTemplate) {
      return json({ success: false, error: "Не найдены промпты whole_body_system / whole_body_user в настройках ИИ" }, 400);
    }

    // При повторной сборке исходником служит уже созданный целостный раздел:
    // медицинские выводы и значения сохраняются, меняется только структура.
    const sourceRecs = categoryRecs.length > 0 ? categoryRecs : [existingWhole];
    const categoryReports = sourceRecs
      .map((r: any) => `===== РАЗДЕЛ: ${r.type} =====\n${r.text}`)
      .join("\n\n");
    const expectedCodes = [...new Set(extractBiomarkerCodes(categoryReports))];
    const deviationCodes = [...new Set(extractDeviationCodes(categoryReports))];
    const userPrompt = userTemplate.replace(/{categoryReports}/g, categoryReports);

    const model = mode === "deep" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
    let text = "";
    let lastErr = "";
    for (let attempt = 1; attempt <= 2 && !text; attempt++) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (r.status === 429 || r.status === 402) {
        return json({ success: false, error: `AI gateway ${r.status}` }, r.status);
      }
      if (!r.ok) { lastErr = `AI ${r.status}: ${(await r.text()).slice(0, 300)}`; continue; }
      const data = await r.json();
      const out = String(data?.choices?.[0]?.message?.content ?? "")
        .replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "")
        // Отступы табом/4 пробелами превращают абзац в блок кода (моноширинный, без переноса)
        .replace(/^[\t ]+(?=\S)/gm, "")
        .trim();
      const structureError = validateBiomarkerStructure(out, expectedCodes, deviationCodes);
      if (out.length < 1500 || expectedCodes.length === 0 || structureError) {
        lastErr = `Ответ ИИ не прошёл проверку: ${structureError || `длина ${out.length}, биомаркеров ${expectedCodes.length}`}`;
        continue;
      }
      text = out.startsWith(WHOLE_BODY_TYPE) ? out : `${WHOLE_BODY_TYPE}\n\n${out}`;
    }
    if (!text) return json({ success: false, error: lastErr || "empty AI response" }, 502);

    // Сначала сохраняем новый раздел, затем удаляем разделы по системам —
    // при сбое между шагами отчёт не останется пустым.
    if (existingWhole && categoryRecs.length > 0) {
      await supabase.from("recommendations").delete().eq("id", existingWhole.id);
    }
    if (existingWhole && categoryRecs.length === 0) {
      const { error: updateErr } = await supabase.from("recommendations").update({ text }).eq("id", existingWhole.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insErr } = await supabase.from("recommendations").insert({
        analysis_id: analysisId,
        user_id: analysis.user_id,
        type: WHOLE_BODY_TYPE,
        text,
      });
      if (insErr) throw insErr;
    }

    if (categoryRecs.length > 0) {
      const { error: delErr } = await supabase
        .from("recommendations")
        .delete()
        .in("id", categoryRecs.map((r: any) => r.id));
      if (delErr) throw delErr;
    }

    await applyPresentation(supabase, analysisId, analysis.cover_overrides);

    // Черновик документа собирается заново из свежих разделов.
    await supabase.from("report_documents").update({ blocks: [], edited_at: null, edited_by: null })
      .eq("analysis_id", analysisId);

    return json({ success: true, merged: categoryRecs.length, length: text.length });
  } catch (e: any) {
    console.error("synthesize-whole-body error:", e);
    return json({ success: false, error: e?.message ?? String(e) }, 500);
  }
});

async function applyPresentation(supabase: any, analysisId: string, current: unknown) {
  const base = current && typeof current === "object" ? (current as Record<string, any>) : {};
  const next = {
    ...base,
    report_kind: "whole_body",
    presentation: {
      hidePatientData: true,
      hideCoverMeta: true,
      hideOverviewStats: true,
      ...(base.presentation ?? {}),
    },
  };
  await supabase.from("analyses").update({ cover_overrides: next }).eq("id", analysisId);
}
