// Report QA Pass — sanity-checks AI-generated biomarker reports and auto-fixes
// the most common failure modes:
//   1. Missing biomarker anchor tags (<!-- anchor:biomarker CODE -->).
//   2. Truncated / typographically corrupted anchor tags.
//   3. Missing educational paragraph for a biomarker card (only "Ваш показатель …"
//      with no introduction). Regenerated via Lovable AI Gateway using the same
//      model as the original report.
//   4. Biomarker codes that do not correspond to any analysis_value (orphans).
//
// Streams progress as Server-Sent Events. Triggered manually from the admin UI
// (button in EditReportDialog).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// ───────────────────── helpers (mirror analyze-biomarkers) ─────────────────────

function normalizeAnchorTypography(text: string): string {
  if (!text) return text;
  return text
    .replace(/<\s*!\s*[-–—]{1,3}\s*(anchor:)/gi, "<!-- $1")
    .replace(/(anchor:[^\n<>]*?)\s*[-–—]{1,3}\s*>/gi, "$1 -->")
    .replace(
      /<!--\s*anchor:([^\n>]*?)-->/gi,
      (_m, body) =>
        `<!-- anchor:${String(body).replace(/\u00A0/g, " ").trim()} -->`,
    );
}

function normalizeBiomarkerCode(code: string): string {
  if (!code) return "";
  return String(code)
    .toLowerCase()
    .trim()
    .replace(/α/g, "a")
    .replace(/β/g, "b")
    .replace(/γ/g, "g")
    .replace(/δ/g, "d")
    .replace(/μ/g, "u")
    .replace(/[\s\-_+()]/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find truncated anchor openings like `<!-- anchor:biomark` (no closing `-->`). */
function repairTruncatedAnchors(text: string): { text: string; fixed: number } {
  if (!text) return { text, fixed: 0 };
  let fixed = 0;
  // Find `<!--` that is NOT followed by a matching `-->` within 200 chars and
  // looks like an anchor opening — drop it (safer than guessing the code).
  const result = text.replace(/<!--\s*anchor:[^\n>]{0,200}(?!-->)$/gm, (m) => {
    fixed++;
    return ""; // strip the broken comment
  });
  return { text: result, fixed };
}

function injectMissingBiomarkerAnchors(
  report: string,
  biomarkers: Array<{ name: string; code: string }>,
): { text: string; injectedCodes: string[] } {
  if (!report || biomarkers.length === 0) {
    return { text: report, injectedCodes: [] };
  }
  const sorted = biomarkers
    .filter((e) => e.name && e.code)
    .sort((a, b) => b.name.length - a.name.length);
  if (sorted.length === 0) return { text: report, injectedCodes: [] };

  const anchoredCodes = new Set<string>();
  const anchorRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
  for (const m of report.matchAll(anchorRegex)) {
    if (m[1]) anchoredCodes.add(normalizeBiomarkerCode(m[1]));
  }

  const interpretationMatch =
    /^\s*(?:#{1,3}\s+)?Интерпретация\s+биомаркеров\b/im.exec(report);
  if (!interpretationMatch) return { text: report, injectedCodes: [] };
  const interpretationStart =
    interpretationMatch.index! + interpretationMatch[0].length;
  const summaryMatch =
    /^\s*(?:#{1,3}\s+)?(?:Общая\s+оценка(?:\s+системы)?|Сильные\s+стороны|Дефициты\s+и\s+дисфункции|Заключение|Резюме|Итоги?|Выводы?)/im
      .exec(report);
  const summaryStart = summaryMatch ? summaryMatch.index! : report.length;

  type Hit = { start: number; end: number; code: string; nameLen: number };
  const hits: Hit[] = [];
  for (const { name, code } of sorted) {
    if (anchoredCodes.has(normalizeBiomarkerCode(code))) continue;
    const re = new RegExp(
      `^(?!#{1,6}\\s)(?!\\s*[-*•])\\s*(?:${escapeRegex(name)})(?:\\s*\\([^()\\n]{1,30}\\))?\\s+(?=[A-ZА-ЯЁ0-9])[^\n]+$`,
      "gm",
    );
    re.lastIndex = interpretationStart;
    let m: RegExpExecArray | null;
    while ((m = re.exec(report)) !== null) {
      if (m.index! >= summaryStart) break;
      hits.push({
        start: m.index!,
        end: m.index! + m[0].length,
        code,
        nameLen: name.length,
      });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  if (hits.length === 0) return { text: report, injectedCodes: [] };

  hits.sort((a, b) => a.start - b.start || b.nameLen - a.nameLen);
  const seen = new Set<string>();
  const filtered: Hit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start < lastEnd) continue;
    if (seen.has(h.code)) continue;
    filtered.push(h);
    seen.add(h.code);
    lastEnd = h.end;
  }

  let result = report;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const cur = filtered[i];
    const next = filtered[i + 1];
    const blockEnd = next ? next.start : summaryStart;
    result =
      result.slice(0, blockEnd) +
      `\n<!-- anchor:biomarker_end -->\n` +
      result.slice(blockEnd);
    result =
      result.slice(0, cur.start) +
      `<!-- anchor:biomarker ${cur.code} -->\n` +
      result.slice(cur.start);
  }
  return { text: result, injectedCodes: filtered.map((f) => f.code) };
}

/**
 * Parse biomarker blocks from a report (text between
 * `<!-- anchor:biomarker CODE -->` and `<!-- anchor:biomarker_end -->` OR next
 * biomarker open). Returns content WITHOUT the anchor markers.
 */
function extractBiomarkerBlocks(
  report: string,
): Array<{ code: string; content: string; start: number; end: number }> {
  const blocks: Array<{ code: string; content: string; start: number; end: number }> = [];
  const openRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
  const opens = [...report.matchAll(openRegex)];
  for (let i = 0; i < opens.length; i++) {
    const open = opens[i];
    const code = open[1].trim();
    const tagEnd = open.index! + open[0].length;
    const explicitEndRegex = /<!--\s*anchor:biomarker_end\s*-->/g;
    explicitEndRegex.lastIndex = tagEnd;
    const explicitEnd = explicitEndRegex.exec(report);
    const nextOpen = opens[i + 1];
    let blockEnd = report.length;
    if (explicitEnd && (!nextOpen || explicitEnd.index < nextOpen.index!)) {
      blockEnd = explicitEnd.index;
    } else if (nextOpen) {
      blockEnd = nextOpen.index!;
    }
    const content = report.slice(tagEnd, blockEnd).trim();
    blocks.push({ code, content, start: open.index!, end: blockEnd });
  }
  return blocks;
}

/**
 * Decide whether a biomarker block lacks educational text.
 * Heuristic: the educational paragraph must come BEFORE the
 * "Ваш показатель/уровень/значение/индекс" sentence and contain at least
 * one full sentence (>= 80 chars of plain prose, excluding the title line).
 */
function isBiomarkerMissingEducation(content: string): boolean {
  if (!content) return true;
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*#{1,6}\s+.*$/gm, " ") // headers
    .trim();
  if (stripped.length < 60) return true;
  const valueMatch =
    /Ваш(?:а|е|и)?\s+(?:показатель|уровень|значение|индекс|результат)/i.exec(
      stripped,
    );
  if (!valueMatch) return false; // no value sentence — probably custom block, skip
  const prefix = stripped.slice(0, valueMatch.index).trim();
  // Drop the first line (likely the biomarker title) and check what's left
  const withoutTitle = prefix.split(/\n/).slice(1).join(" ").trim();
  return withoutTitle.length < 60;
}

// ──────────────────── AI helper ────────────────────

async function generateBiomarkerEducation(
  biomarkerName: string,
  biomarkerCode: string,
  valueLine: string,
  model: string,
  reportContext: string,
): Promise<string | null> {
  const system = `Ты медицинский редактор. Верни ТОЛЬКО Markdown-блок одного биомаркера в формате (без обёрток, без поясняющих фраз):

<!-- anchor:biomarker ${biomarkerCode} -->
${biomarkerName}

[1–2 коротких абзаца простым языком: что это за показатель и за что он отвечает в организме. Без чисел и без оценок пациента.]

${valueLine}

[Если отклонение — добавь блок «Что это значит для вас» с практическим выводом для конкретного значения.]
<!-- anchor:biomarker_end -->`;

  const user = `Биомаркер: ${biomarkerName} (код ${biomarkerCode}).
Контекст отчёта (для тонального соответствия, не цитируй):
${reportContext.slice(0, 2000)}

Сгенерируй блок биомаркера по шаблону выше. Не используй списки, не используй заголовки кроме первой строки с названием биомаркера. Только проза.`;

  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  );

  if (!resp.ok) {
    console.error("AI gateway error:", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return text.trim() || null;
}

// ──────────────────── handler ────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: { analysisId?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const analysisId = payload.analysisId;
  if (!analysisId) {
    return new Response(JSON.stringify({ error: "analysisId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller is staff (admin/superadmin) using user-scoped client
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: hasPerm } = await userClient.rpc("has_admin_permission", {
    _user_id: userData.user.id,
    _module: "patients",
  });
  if (!hasPerm) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const fixes: string[] = [];

      try {
        send({ type: "status", message: "Загружаю отчёт…" });

        // Load analysis + biomarker dictionary + analysis_values
        const { data: analysis, error: aErr } = await admin
          .from("analyses")
          .select("id, biomarkers_metadata")
          .eq("id", analysisId)
          .single();
        if (aErr) throw aErr;

        const { data: avRows, error: avErr } = await admin
          .from("analysis_values")
          .select("biomarker_id, biomarkers!inner(code, name)")
          .eq("analysis_id", analysisId);
        if (avErr) throw avErr;

        const biomarkers = (avRows || []).map((r: any) => ({
          code: r.biomarkers?.code,
          name: r.biomarkers?.name,
        }));
        const knownCodesNorm = new Set(
          biomarkers.map((b) => normalizeBiomarkerCode(b.code)),
        );

        const aiModel: string =
          (analysis as any)?.biomarkers_metadata?.ai_model ||
          "google/gemini-2.5-pro";

        send({ type: "status", message: "Загружаю секции рекомендаций…" });
        const { data: recs, error: rErr } = await admin
          .from("recommendations")
          .select("id, type, text")
          .eq("analysis_id", analysisId);
        if (rErr) throw rErr;

        // Process each markdown section (skip "Назначения" — это JSON)
        const sections = (recs || []).filter(
          (r: any) => r.type !== "Назначения" && typeof r.text === "string",
        );
        send({
          type: "status",
          message: `Найдено секций: ${sections.length}. Запускаю проверки…`,
        });

        for (const sec of sections as any[]) {
          let text: string = sec.text;
          const sectionLabel = sec.type;

          // 1. Normalize typography
          const before1 = text;
          text = normalizeAnchorTypography(text);
          if (before1 !== text) {
            const msg = `[${sectionLabel}] Нормализованы типографские артефакты в anchor-тегах`;
            fixes.push(msg);
            send({ type: "fix", message: msg });
          }

          // 2. Repair truncated anchors
          const rep = repairTruncatedAnchors(text);
          if (rep.fixed > 0) {
            text = rep.text;
            const msg = `[${sectionLabel}] Удалены обрезанные anchor-теги: ${rep.fixed}`;
            fixes.push(msg);
            send({ type: "fix", message: msg });
          }

          // 3. Inject missing anchors (only if this section is a category — has biomarker zone)
          const inj = injectMissingBiomarkerAnchors(text, biomarkers);
          if (inj.injectedCodes.length > 0) {
            text = inj.text;
            const msg = `[${sectionLabel}] Восстановлены anchor-теги для: ${inj.injectedCodes.join(", ")}`;
            fixes.push(msg);
            send({ type: "fix", message: msg });
          }

          // 4. Detect orphan codes (anchors that don't match analysis_values)
          const blocks = extractBiomarkerBlocks(text);
          const orphans = blocks
            .map((b) => b.code)
            .filter(
              (code) =>
                knownCodesNorm.size > 0 &&
                !knownCodesNorm.has(normalizeBiomarkerCode(code)),
            );
          if (orphans.length > 0) {
            const msg = `[${sectionLabel}] ⚠ Биомаркеры без значения в анализе: ${orphans.join(", ")} (требуют ручной проверки)`;
            fixes.push(msg);
            send({ type: "warn", message: msg });
          }

          // 5. AI repair for blocks missing educational text
          const reportContext = text.slice(0, 4000);
          const blocksToFix = blocks.filter(
            (b) =>
              knownCodesNorm.has(normalizeBiomarkerCode(b.code)) &&
              isBiomarkerMissingEducation(b.content),
          );
          if (blocksToFix.length > 0) {
            send({
              type: "status",
              message: `[${sectionLabel}] Догенерация описаний для ${blocksToFix.length} биомаркеров…`,
            });
            // process from last to first to keep indices stable on `text`
            for (let i = blocksToFix.length - 1; i >= 0; i--) {
              const blk = blocksToFix[i];
              const bm = biomarkers.find(
                (b) =>
                  normalizeBiomarkerCode(b.code) ===
                  normalizeBiomarkerCode(blk.code),
              );
              if (!bm) continue;
              // Extract value sentence from existing content (if present)
              const valueMatch =
                /Ваш(?:а|е|и)?\s+[^.\n]{0,200}\.[^.\n]{0,200}/i.exec(blk.content);
              const valueLine = valueMatch
                ? valueMatch[0].trim()
                : `Ваш показатель ${bm.name} находится в указанном диапазоне.`;

              send({
                type: "status",
                message: `→ AI догенерирует описание: ${bm.name} (${bm.code})`,
              });
              const generated = await generateBiomarkerEducation(
                bm.name,
                bm.code,
                valueLine,
                aiModel,
                reportContext,
              );
              if (generated) {
                // Find end-of-block (anchor:biomarker_end) — replace whole block
                const endRegex = /<!--\s*anchor:biomarker_end\s*-->/g;
                endRegex.lastIndex = blk.end;
                const endMatch = endRegex.exec(text);
                const replaceEnd = endMatch
                  ? endMatch.index + endMatch[0].length
                  : blk.end;
                text =
                  text.slice(0, blk.start) +
                  generated +
                  "\n" +
                  text.slice(replaceEnd);
                const msg = `[${sectionLabel}] ✓ Догенерирован описательный блок: ${bm.name} (${bm.code})`;
                fixes.push(msg);
                send({ type: "fix", message: msg });
              } else {
                const msg = `[${sectionLabel}] ✗ Не удалось догенерировать: ${bm.name} (${bm.code})`;
                fixes.push(msg);
                send({ type: "warn", message: msg });
              }
            }
          }

          // Persist if changed
          if (text !== sec.text) {
            const { error: upErr } = await admin
              .from("recommendations")
              .update({ text })
              .eq("id", sec.id);
            if (upErr) throw upErr;
            // Invalidate snapshot for "Общее резюме" so frontend re-renders fresh markdown
            if (sectionLabel === "Общее резюме") {
              await admin
                .from("recommendations")
                .update({ content_json: null as any })
                .eq("id", sec.id);
            }
          }
        }

        send({
          type: "done",
          message:
            fixes.length === 0
              ? "Проверка завершена — проблем не обнаружено."
              : `Готово. Внесено исправлений: ${fixes.length}.`,
          fixes,
        });
      } catch (err) {
        console.error("report-qa error:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
