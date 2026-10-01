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

// Группы кодов одного биомаркера. Анкор-ремонт иногда ставит две метки подряд
// (например «D_25_OH» и «25-OH D») — это алиасы одного показателя, ИИ достаточно
// вывести любую из них.
function extractBiomarkerGroups(text: string): string[][] {
  const anchors = [...text.matchAll(/<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/gi)];
  if (anchors.length > 0) {
    const groups: string[][] = [];
    let prevEnd = -1;
    for (const m of anchors) {
      const code = m[1]?.trim();
      if (!code) continue;
      const start = m.index ?? 0;
      const between = prevEnd >= 0 ? text.slice(prevEnd, start) : "x";
      if (groups.length > 0 && between.trim() === "") groups[groups.length - 1].push(code);
      else groups.push([code]);
      prevEnd = start + m[0].length;
    }
    return groups;
  }

  // Старые целостные разделы могли потерять якорные комментарии, но сохранили
  // заголовки «Название (CODE)». Это позволяет безопасно пересобрать их.
  return [...text.matchAll(/^.{2,160}\s\(([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9_.%/+\- ]{0,30})\)\s*$/gm)]
    .map((match) => match[1]?.trim())
    .filter((code): code is string => Boolean(code))
    .map((code) => [code]);
}

function extractBiomarkerCodes(text: string): string[] {
  return extractBiomarkerGroups(text).flat();
}

function dedupeGroups(groups: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const g of groups) {
    const key = g.map((c) => c.toLowerCase()).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
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
  // Эталон — обычный отчёт: блок «Что это значит для вас» обязателен только
  // там, где он уже есть в разделе по системам.
  return chunks
    .filter(({ content }) => /Что это значит для вас/i.test(content))
    .map(({ code }) => code)
    .filter(Boolean);
}

// Отклонение определяется по первой фразе строки «Ваш показатель…».
// «В допустимом/оптимальном диапазоне … ниже оптимального» — это норма.
export function isDeviationValueLine(line: string): boolean {
  const first = (line.split(/(?<=[.!?])\s+/)[0] || line).trim();
  if (/в\s+(?:допустимом|оптимальном|референсном|нормальном)\s+диапазоне|в\s+пределах\s+(?:нормы|референс)/i.test(first)) {
    return false;
  }
  return /находится\s+(?:ниже|выше)|критическ|отклонен|отклонён/i.test(first);
}

function validateBiomarkerStructure(
  text: string,
  expectedGroups: string[][],
  deviationCodes: string[],
): string | null {
  const blocks = [...text.matchAll(
    /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->([\s\S]*?)<!--\s*anchor:biomarker_end\s*-->/gi,
  )];
  const foundCodes = new Set(
    [...text.matchAll(/<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/gi)]
      .map((match) => match[1]?.trim().toLowerCase())
      .filter((c) => c && c !== "end"),
  );
  const missingGroups = expectedGroups.filter((group) => !group.some((code) => foundCodes.has(code.toLowerCase())));
  if (missingGroups.length > 0) {
    return `пропущены биомаркеры: ${missingGroups.map((g) => g.join(" / ")).join(", ")}`;
  }

  const deviationSet = new Set(deviationCodes.map((c) => c.toLowerCase()));
  const isDeviation = (code: string) => {
    const lower = code.toLowerCase();
    const group = expectedGroups.find((g) => g.some((c) => c.toLowerCase() === lower)) ?? [code];
    return group.some((c) => deviationSet.has(c.toLowerCase()));
  };

  for (const block of blocks) {
    const code = block[1]?.trim() || "?";
    const content = block[2] || "";
    const paragraphs = content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    if (paragraphs.length < 3) return `${code}: нет полного описания и персонального разбора`;
    if (!/Ваш(?:а|е|и)?\s+(?:абсолютный\s+)?(?:показатель|уровень|значение|индекс|результат)/i.test(content)) {
      return `${code}: нет строки «Ваш показатель…»`;
    }
    if (isDeviation(code) && !/Что это значит для вас/i.test(content)) {
      return `${code}: при отклонении нет блока «Что это значит для вас»`;
    }

  }

  return null;
}

const BLOCK_RE = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->([\s\S]*?)<!--\s*anchor:biomarker_end\s*-->/gi;

function blockIsIncomplete(code: string, content: string, isDeviation: (c: string) => boolean): boolean {
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < 3) return true;
  if (!/Ваш(?:а|е|и)?\s+(?:абсолютный\s+)?(?:показатель|уровень|значение|индекс|результат)/i.test(content)) return true;
  if (isDeviation(code) && !/Что это значит для вас/i.test(content)) return true;
  return false;
}

// Дословно подставляет из системных разделов блоки показателей, которые ИИ
// потерял или обрезал, и дописывает пропавшие показатели целиком.
export function repairFromSource(
  out: string,
  source: string,
  expectedGroups: string[][],
  deviationCodes: string[],
): { text: string; repaired: string[]; missing: number } {
  const srcBlocks = new Map<string, string>();
  for (const m of source.matchAll(BLOCK_RE)) {
    const code = m[1]?.trim().toLowerCase();
    if (code && !srcBlocks.has(code)) srcBlocks.set(code, m[0]);
  }
  const groupOf = (code: string) =>
    expectedGroups.find((g) => g.some((c) => c.toLowerCase() === code.toLowerCase())) ?? [code];
  const devSet = new Set(deviationCodes.map((c) => c.toLowerCase()));
  const isDeviation = (code: string) => groupOf(code).some((c) => devSet.has(c.toLowerCase()));
  const srcFor = (code: string) => {
    for (const c of groupOf(code)) { const b = srcBlocks.get(c.toLowerCase()); if (b) return b; }
    return null;
  };

  const repaired: string[] = [];
  let text = out.replace(BLOCK_RE, (whole, rawCode: string, content: string) => {
    const code = rawCode.trim();
    if (!blockIsIncomplete(code, content, isDeviation)) return whole;
    const src = srcFor(code);
    if (!src) return whole;
    repaired.push(code);
    return src;
  });

  const found = new Set([...text.matchAll(/<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/gi)]
    .map((m) => m[1]?.trim().toLowerCase()));
  const missingGroups = expectedGroups.filter((g) => !g.some((c) => found.has(c.toLowerCase())));
  const appended: string[] = [];
  for (const g of missingGroups) {
    const src = srcFor(g[0]);
    if (src) { appended.push(src); repaired.push(g.join(" / ")); }
  }
  if (appended.length) text = `${text.trim()}\n\n${appended.join("\n\n")}`;
  const keep = new Set(expectedGroups.filter((g) => g.some((c) => devSet.has(c.toLowerCase()))).flat().map((c) => c.toLowerCase()));
  return { text: normalizeMeaningBlocks(text, keep), repaired, missing: missingGroups.length };
}

// Приводит блок «Что это значит для вас» к эталону обычного отчёта:
// только при 🟠/🔴 (выше/ниже нормы, критично), заголовок с двоеточием,
// «Это может проявляться:» перед пунктами и фиксированная финальная строка.
const FINAL_LINE = "Рекомендации по коррекции вы найдёте в разделе «Рекомендации».";
// keepCodes — показатели, у которых блок есть в эталонном разделе по системам:
// их блок никогда не вырезается, даже если формулировка строки «Ваш…» неочевидна.
export function normalizeMeaningBlocks(text: string, keepCodes?: Set<string>): string {
  return text.replace(
    /(<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->)([\s\S]*?)(<!--\s*anchor:biomarker_end\s*-->)/gi,
    (_m, open, rawCode: string, body: string, close) => {
      const idx = body.search(/^\s*Что это значит для вас:?\s*$/im);
      if (idx < 0) return open + body + close;
      const head = body.slice(0, idx).replace(/\s+$/, "");
      const valueLine = head.split("\n").find((l) => /^\s*Ваш/i.test(l)) || "";
      const keep = keepCodes?.has(rawCode.trim().toLowerCase()) ?? false;
      const isDeviation = keep || isDeviationValueLine(valueLine);
      if (!isDeviation) return `${open}${head}\n${close}`;
      const rawLines = body.slice(idx).split("\n").map((l) => l.trim());
      const lines = rawLines.slice(rawLines.findIndex((l) => /^Что это значит для вас/i.test(l)) + 1);
      const bulletIdx = lines.map((l, i) => (/^[•\-]/.test(l) ? i : -1)).filter((i) => i >= 0);
      if (bulletIdx.length === 0) return open + body + close;
      const first = bulletIdx[0], last = bulletIdx[bulletIdx.length - 1];
      let intro = lines.slice(0, first).filter(Boolean).join(" ");
      if (!/Это может проявляться:\s*$/.test(intro)) {
        intro = (intro ? intro.replace(/\s*Это может проявляться\.?\s*$/, "") + " " : "") + "Это может проявляться:";
      }
      const bullets = lines.slice(first, last + 1).filter(Boolean)
        .map((l) => "• " + l.replace(/^[•\-]\s*/, ""));
      return `${open}${head}\n\nЧто это значит для вас:\n\n${intro}\n${bullets.join("\n")}\n${FINAL_LINE}\n${close}`;
    },
  );
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
    const expectedGroups = dedupeGroups(extractBiomarkerGroups(categoryReports));
    const expectedCodes = [...new Set(extractBiomarkerCodes(categoryReports))];
    const deviationCodes = [...new Set(extractDeviationCodes(categoryReports))];
    const userPrompt = userTemplate.replace(/{categoryReports}/g, categoryReports);
    const devLower = new Set(deviationCodes.map((c) => c.toLowerCase()));
    const keepMeaningCodes = new Set(
      expectedGroups.filter((g) => g.some((c) => devLower.has(c.toLowerCase()))).flat().map((c) => c.toLowerCase()),
    );

    const model = mode === "deep" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
    const startedAt = Date.now();
    let text = "";
    let lastErr = "";
    let repairedCodes: string[] = [];
    let best: { text: string; repaired: string[] } | null = null;
    for (let attempt = 1; attempt <= 2 && !text; attempt++) {
      // Второй вызов ИИ — только если первый уложился быстро: иначе оркестратор
      // оборвёт шаг по таймауту и прогресс «зависнет».
      if (attempt === 2 && Date.now() - startedAt > 55_000) break;
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
      let out = String(data?.choices?.[0]?.message?.content ?? "")
        .replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "")
        // Отступы табом/4 пробелами превращают абзац в блок кода (моноширинный, без переноса)
        .replace(/^[\t ]+(?=\S)/gm, "")
        .trim();
      out = normalizeMeaningBlocks(out, keepMeaningCodes);
      if (out.length < 1500 || expectedCodes.length === 0) {
        lastErr = `Ответ ИИ не прошёл проверку: длина ${out.length}, биомаркеров ${expectedCodes.length}`;
        continue;
      }
      const fixed = repairFromSource(out, categoryReports, expectedGroups, deviationCodes);
      const structureError = validateBiomarkerStructure(fixed.text, expectedGroups, deviationCodes);
      if (structureError) {
        lastErr = `Ответ ИИ не прошёл проверку: ${structureError}`;
        continue;
      }
      if (fixed.repaired.length > 3 && attempt === 1) {
        // Много пропусков — пробуем ещё раз, но этот вариант держим как запасной.
        best = fixed;
        lastErr = `ИИ потерял блоки у ${fixed.repaired.length} показателей`;
        continue;
      }
      if (best && best.repaired.length <= fixed.repaired.length) { /* keep best */ } else best = fixed;
      break;
    }
    if (best) {
      repairedCodes = best.repaired;
      text = best.text.startsWith(WHOLE_BODY_TYPE) ? best.text : `${WHOLE_BODY_TYPE}\n\n${best.text}`;
      if (repairedCodes.length) console.log(`[whole-body] repaired from source: ${repairedCodes.join(", ")}`);
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

    return json({ success: true, merged: categoryRecs.length, length: text.length, repaired: repairedCodes });
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
