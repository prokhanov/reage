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
const AI_CALL_TIMEOUT_MS = 45_000;
// Edge Function hard-limit ≈ 150s wall-clock. Оставляем запас на финальную
// запись в БД и отправку SSE-«done», не упираемся в жёсткий cap.
const QA_TIME_BUDGET_MS = 135_000;
// Раньше было 8 → одному отчёту требовалось 8–10 повторных проверок.
// Теперь одним прогоном можно чинить целую категорию.
const MAX_AI_REPAIRS_PER_RUN = 80;
// Параллельная догенерация коротких образовательных абзацев внутри одной
// секции: несколько маркеров чинятся одновременно. 6 — комфортно для gateway.
const REPAIR_CONCURRENCY = 6;
// Для догенерации коротких образовательных абзацев не нужен pro:
// flash отвечает в 3–5 раз быстрее и стабильнее не упирается в таймаут.
const REPAIR_MODEL = "google/gemini-2.5-flash";

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

function stripSystemKeyIndicatorsHeading(text: string): string {
  if (!text) return text;
  return text.replace(/^[ \t]*#{1,6}[ \t]*Ключевые показатели системы[ \t]*\n?/gim, "");
}

function normalizeBiomarkerCode(code: string): string {
  if (!code) return "";
  return String(code)
    .toLowerCase()
    .trim()
    .replace(/\balpha\b/g, "a")
    .replace(/\bbeta\b/g, "b")
    .replace(/\bgamma\b/g, "g")
    .replace(/\bdelta\b/g, "d")
    .replace(/\bmu\b/g, "u")
    .replace(/\bальфа\b/g, "a")
    .replace(/\bбета\b/g, "b")
    .replace(/\bгамма\b/g, "g")
    .replace(/\bдельта\b/g, "d")
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
  // Расширяем варианты имён: помимо канонического имени добавляем алиас
  // без хвостового "(CODE)" — тогда AI-текст «Насыщение трансферрина» будет
  // мэтчиться маркером, чьё имя в БД «Насыщение трансферрина (TSAT)».
  const expanded: Array<{ name: string; code: string }> = [];
  const seenPairs = new Set<string>();
  for (const b of biomarkers) {
    if (!b.name || !b.code) continue;
    const push = (n: string) => {
      const key = `${n.toLowerCase()}|${b.code}`;
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      expanded.push({ name: n, code: b.code });
    };
    push(b.name);
    const stripped = b.name.replace(/\s*\([^()]{1,20}\)\s*$/u, '').trim();
    if (stripped && stripped !== b.name) push(stripped);
  }
  const sorted = expanded.sort((a, b) => b.name.length - a.name.length);
  if (sorted.length === 0) return { text: report, injectedCodes: [] };


  const anchoredCodes = new Set<string>();
  const anchorRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
  for (const m of report.matchAll(anchorRegex)) {
    if (m[1]) anchoredCodes.add(normalizeBiomarkerCode(m[1]));
  }

  const interpretationMatch =
    /^\s*(?:#{1,3}\s+)?Интерпретация\s+биомаркеров\b/im.exec(report);
  const interpretationStart =
    interpretationMatch ? interpretationMatch.index! + interpretationMatch[0].length : 0;
  const summaryMatch =
    /^\s*(?:#{1,3}\s+)?(?:Общая\s+оценка(?:\s+системы)?|Сильные\s+стороны|Дефициты\s+и\s+дисфункции|Заключение|Резюме|Итоги?|Выводы?)/im
      .exec(report);
  const summaryStart = summaryMatch ? summaryMatch.index! : report.length;

  type Hit = { start: number; end: number; code: string; nameLen: number };
  const hits: Hit[] = [];
  for (const { name, code } of sorted) {
    if (anchoredCodes.has(normalizeBiomarkerCode(code))) continue;
    const sameLineRe = new RegExp(
      `^(?!#{1,6}\\s)(?!\\s*[-*•])\\s*(?:${escapeRegex(name)})(?:\\s*\\([^\\n]{1,40}\\))?\\s+(?=[A-ZА-ЯЁ0-9])[^\n]+$`,
      "gm",
    );
    sameLineRe.lastIndex = interpretationStart;
    let m: RegExpExecArray | null;
    while ((m = sameLineRe.exec(report)) !== null) {
      if (m.index! >= summaryStart) break;
      hits.push({
        start: m.index!,
        end: m.index! + m[0].length,
        code,
        nameLen: name.length,
      });
      if (m[0].length === 0) sameLineRe.lastIndex++;
    }

    const titleLineRe = new RegExp(
      `^(?!#{1,6}\\s)(?!\\s*[-*•])\\s*(?:${escapeRegex(name)})(?:\\s*\\([^\\n]{1,40}\\))?\\s*$`,
      "gm",
    );
    titleLineRe.lastIndex = interpretationStart;
    while ((m = titleLineRe.exec(report)) !== null) {
      if (m.index! >= summaryStart) break;
      hits.push({
        start: m.index!,
        end: m.index! + m[0].length,
        code,
        nameLen: name.length,
      });
      if (m[0].length === 0) titleLineRe.lastIndex++;
    }
  }

  // ── Code-first fallback: ловим строки вида
  //   «<любое имя ≤80 символов> (CODE) описание…»
  // где `(CODE)` в шапке строки. Работает, когда AI пишет имя биомаркера
  // не так, как оно записано в БД (типичный кейс: `Липопротеин(а) (Lp(a))`).
  // Сканируем по кодам из снапшота, а не по именам.
  {
    const codeByNormalized = new Map<string, string>();
    for (const b of biomarkers) {
      if (!b.code) continue;
      const norm = normalizeBiomarkerCode(b.code);
      if (norm && !codeByNormalized.has(norm)) codeByNormalized.set(norm, b.code);
    }
    const paragraphRe =
      /^(?!\s*#{1,6}\s)(?!\s*[-*•>])(?!\s*\d+[.)]\s)[ \t]*[^\n]{4,400}$/gm;
    const parenRe =
      /\(([^()\n]{1,40})\)|\(([^()\n]{0,20}\([^()\n]{0,15}\)[^()\n]{0,20})\)/g;
    paragraphRe.lastIndex = interpretationStart;
    let lm: RegExpExecArray | null;
    while ((lm = paragraphRe.exec(report)) !== null) {
      if (lm.index! >= summaryStart) break;
      const line = lm[0];
      parenRe.lastIndex = 0;
      let pm: RegExpExecArray | null;
      while ((pm = parenRe.exec(line)) !== null) {
        if (pm.index > 80) break;
        const inner = (pm[1] ?? pm[2] ?? "").trim();
        if (!inner) continue;
        const norm = normalizeBiomarkerCode(inner);
        if (!norm) continue;
        const code = codeByNormalized.get(norm);
        if (!code) continue;
        if (anchoredCodes.has(norm)) break;
        hits.push({
          start: lm.index!,
          end: lm.index! + line.length,
          code,
          nameLen: pm.index, // приоритет более длинному «имени» перед скобкой
        });
        break;
      }
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
 *
 * Идемпотентность: если блок уже помечен `<!-- qa:generated -->`, считаем
 * его исправленным ранее и НИКОГДА не переписываем повторно.
 *
 * Кроме того, если непосредственно перед `<!-- anchor:biomarker … -->`
 * (в `precedingProse`) уже есть развёрнутое интро с именем/кодом
 * биомаркера — считаем образование достаточным (после недавних правок
 * парсера интро часто живёт над карточкой, а не внутри неё).
 */
function isBiomarkerMissingEducation(
  content: string,
  precedingProse: string = "",
  biomarker?: { name?: string; code?: string },
): boolean {
  if (!content) return true;
  if (/<!--\s*qa:generated\s*-->/i.test(content)) return false;

  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*#{1,6}\s+.*$/gm, " ")
    .trim();

  // Интро над карточкой — если есть достаточно кириллицы + имя/код маркера.
  if (precedingProse && biomarker) {
    const cleanPre = precedingProse
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/^\s*#{1,6}\s+.*$/gm, " ")
      .trim();
    const preCyr = (cleanPre.match(/[а-яё]/gi) || []).length;
    const nameHit = biomarker.name
      ? cleanPre.toLowerCase().includes(biomarker.name.toLowerCase())
      : false;
    const codeHit = biomarker.code
      ? cleanPre.toLowerCase().includes(biomarker.code.toLowerCase())
      : false;
    if (preCyr >= 120 && (nameHit || codeHit)) return false;
  }

  if (stripped.length < 60) return true;

  const valueMatch =
    /Ваш(?:а|е|и)?\s+(?:показатель|уровень|значение|индекс|результат|концентрация|анализ|маркер|значения|параметр|коэффициент)/i.exec(
      stripped,
    );

  const totalCyr = (stripped.match(/[а-яё]/gi) || []).length;
  // Есть value-строка + приличный объём кириллицы — валидная короткая карточка.
  if (valueMatch && totalCyr >= 60) return false;

  if (!valueMatch) {
    const sentenceCount = (stripped.match(/[.!?…](?:\s|$)/g) || []).length;
    return totalCyr < 120 || sentenceCount < 1;
  }
  return totalCyr < 60;
}

// ──────────────────── Trailing transition detection ────────────────────

/**
 * Абзацы-«переходы», которые часто прилипают к концу карточки биомаркера и
 * визуально закрашиваются её фоном. Ловим их отдельной проверкой и авто-режем
 * от блока — заодно предупреждаем в UI.
 */
const TRANSITION_PARAGRAPH_PATTERNS: RegExp[] = [
  /^\s*Далее\s+(?:мы\s+)?(?:рассмотрим|перейд[её]м|разбер[её]м|обсудим)/i,
  /^\s*(?:Теперь|Ниже)\s+(?:мы\s+)?(?:рассмотрим|перейд[её]м|разбер[её]м|обсудим|поговорим)/i,
  /^\s*Перейд[её]м\s+к\b/i,
  /^\s*В\s+следующ(?:ем|их)\s+(?:раздел|блок|показател|части)/i,
  /^\s*Картина\s+Ваш(?:ей|их|его)\b/i,
  /^\s*Общ(?:ая|ий)\s+(?:картина|вывод|итог)\b/i,
  /^\s*Рекомендации\s+по\s+коррекции\s+вы\s+найд[её]те\b/i,
  /^\s*(?:Подробные\s+)?Назначения\s+(?:и\s+рекомендации\s+)?(?:вы\s+)?(?:найд[её]те|описаны|представлены)\b/i,
  /^\s*(?:Итак|Таким\s+образом|В\s+целом|Подводя\s+итог)\b[^а-яё]*[,.:]/i,
  /^\s*Прежде\s+чем\s+перейти\b/i,
];

function isTransitionParagraph(p: string): boolean {
  const t = p.trim();
  if (!t) return false;
  return TRANSITION_PARAGRAPH_PATTERNS.some((re) => re.test(t));
}

/**
 * Найти биомаркер-блоки, у которых последний абзац — переходный, и вынести
 * такие абзацы наружу (в plain-текст между карточками). Возвращает
 * исправленный текст и список code, где было исправление.
 */
function stripTrailingTransitions(
  report: string,
): { text: string; touched: string[] } {
  const blocks = extractBiomarkerBlocks(report);
  const touched: string[] = [];
  // Обходим с конца, чтобы индексы оставались валидными.
  let result = report;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const paragraphs = b.content.split(/\n{2,}/);
    const trailing: string[] = [];
    while (paragraphs.length > 1) {
      const last = paragraphs[paragraphs.length - 1];
      if (!isTransitionParagraph(last)) break;
      trailing.unshift(paragraphs.pop()!);
    }
    if (trailing.length === 0) continue;
    touched.push(b.code);
    const kept = paragraphs.join("\n\n").trim();
    const tail = trailing.join("\n\n").trim();
    // Заменяем содержимое блока: оставляем `kept`, затем закрывающий тег
    // (если его не было — добавляем), затем `tail` уже вне карточки.
    const openMatch = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
    openMatch.lastIndex = b.start;
    const open = openMatch.exec(result);
    if (!open) continue;
    const contentStart = open.index + open[0].length;
    const before = result.slice(0, contentStart);
    const after = result.slice(b.end);
    // Если после блока НЕТ явного biomarker_end — добавим, иначе просто
    // вставим tail перед закрывающим тегом/следующим блоком.
    result = `${before}\n${kept}\n<!-- anchor:biomarker_end -->\n\n${tail}\n${after}`;
  }
  return { text: result, touched };
}


// ──────────────────── English artifact detection ────────────────────

/**
 * Whitelist: tokens that are LEGITIMATELY English and must NOT be flagged.
 * Includes biomarker codes/units, common medical abbreviations, brand names.
 */
const ENGLISH_WHITELIST_BASE = new Set<string>([
  // units
  "mg", "dl", "ml", "l", "g", "kg", "mmol", "mol", "umol", "nmol", "pmol",
  "iu", "miu", "u", "ng", "pg", "mcg", "mkg", "meq", "mm", "cm",
  "hg", "mmhg", "rpm", "kcal", "bpm",
  // biomarker / lab codes & abbreviations (lowercased, hyphens stripped)
  "hba1c", "ldl", "hdl", "vldl", "tsh", "t3", "t4", "ft3", "ft4", "tpo",
  "psa", "crp", "esr", "alt", "ast", "ggt", "alp", "ldh", "ck", "bnp",
  "homa", "homair", "ir", "tnf", "il", "il6", "il1", "il10",
  "vitamin", "omega", "dha", "epa", "coq10", "nad", "nadh", "nadph",
  "rbc", "wbc", "mcv", "mch", "mchc", "rdw", "mpv", "pdw", "plt", "hgb", "hb", "hct",
  "iga", "igg", "igm", "ige", "anti", "abs",
  "pcr", "elisa", "dna", "rna", "atp", "adp", "amp", "gtp",
  "ph", "spo2", "po2", "pco2", "hco3",
  "vo2", "vo2max", "max", "min", "avg",
  "id", "url", "api", "json", "pdf", "ai", "qa",
  // chemical group fragments that appear in vitamin/metabolite names
  // e.g. "25-OH D", "1,25-OH D", "OH-vitamin D" — both parts must be whitelisted
  "oh", "d", "ohd", "ohvitamind", "calcidiol", "calcitriol",
  // common Latin-in-Russian (may slip in)
  "in", "vivo", "vitro", "ex", "vs", "et", "al",
  // common supplement / brand fragments that legitimately appear in Russian text
  "magnesium", "glycinate", "citrate", "malate", "bisglycinate",
  "zinc", "picolinate", "selenium", "selenomethionine",
  "carnitine", "acetyl", "alpha", "lipoic", "acid",
  "coenzyme", "ubiquinol", "ubiquinone",
  "methylfolate", "methylcobalamin", "cyanocobalamin",
  "cholecalciferol", "ergocalciferol", "menaquinone",
  "berberine", "curcumin", "resveratrol", "quercetin",
  "ashwagandha", "rhodiola", "spirulina",
  // legitimate Latin microbiology / clinical taxonomy terms in Russian reports
  "candida", "albicans", "helicobacter", "pylori", "escherichia", "coli",
  "lactobacillus", "bifidobacterium", "streptococcus", "staphylococcus",
  "clostridium", "enterococcus", "klebsiella", "proteus", "salmonella",
  "shigella", "aspergillus", "cryptococcus",
]);

/** Normalize a token for whitelist comparison. */
function normalizeWhitelistToken(token: string): string {
  return token.toLowerCase().replace(/[\-_'.\d]/g, "");
}

/**
 * Detect runs of English text inside a Russian report.
 * `extraWhitelist` — additional tokens (e.g. biomarker codes from DB) to ignore.
 *
 * Filters out false positives:
 *  - tokens that match biomarker codes from DB
 *  - single Latin letter prefixes attached to Cyrillic (L-карнитин, D-аспарагин, N-ацетил)
 *  - Latin terms inside parentheses immediately after a Cyrillic word (бренды добавок)
 *  - URLs and email addresses
 */
function detectEnglishArtifacts(
  text: string,
  extraWhitelist: Set<string> = new Set(),
): Array<{ match: string; context: string; index: number }> {
  if (!text) return [];
  const results: Array<{ match: string; context: string; index: number }> = [];

  const isWhitelisted = (token: string): boolean => {
    const norm = normalizeWhitelistToken(token);
    if (!norm) return true;
    return ENGLISH_WHITELIST_BASE.has(norm) || extraWhitelist.has(norm);
  };

  // Mask out: anchor comments, code fences, inline code, URLs, emails, and
  // parenthesised Latin clauses that follow a Cyrillic word (brand annotations).
  let masked = text
    .replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length))
    .replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length))
    .replace(/`[^`\n]+`/g, (m) => " ".repeat(m.length))
    .replace(/https?:\/\/\S+/gi, (m) => " ".repeat(m.length))
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, (m) => " ".repeat(m.length));

  // Mask Latin-in-parentheses right after a Cyrillic word: "Магний (Magnesium glycinate)"
  // Also covers parens with digits/punctuation at start: "(25-OH D)", "(1,25-OH D)".
  masked = masked.replace(
    /([А-Яа-яЁё])(\s*\(\s*[A-Za-z0-9][A-Za-z0-9\s,.\-/]*\))/g,
    (_full, lead, paren) => lead + " ".repeat(paren.length),
  );

  // Mask vitamin-D-style chemical notation anywhere: "25-OH D", "1,25-OH D",
  // "25(OH)D", "25-OH-витамин D" — these are legitimate biomarker codes.
  masked = masked.replace(
    /\b\d{1,2}(?:[.,]\d{1,2})?[\s\-]?\(?OH\)?[\s\-]?(?:витамин\s*)?D\d?\b/gi,
    (m) => " ".repeat(m.length),
  );

  // Mask single Latin letter glued to Cyrillic via hyphen: "L-карнитин", "D-аспарагин",
  // "N-ацетил", "омега-3", also when capitalised at sentence start.
  masked = masked.replace(
    /\b([A-Za-z])(-[А-Яа-яЁё])/g,
    (_full, letter, rest) => " " + rest,
  );

  // Phrase: 2+ consecutive Latin words.
  const phraseRegex = /\b[A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){1,}\b/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRegex.exec(masked)) !== null) {
    const phrase = m[0];
    const tokens = phrase.split(/\s+/);
    if (tokens.every(isWhitelisted)) continue;
    const ctxStart = Math.max(0, m.index - 80);
    const ctxEnd = Math.min(text.length, m.index + phrase.length + 80);
    results.push({ match: phrase, context: text.slice(ctxStart, ctxEnd), index: m.index });
  }

  // Single Latin words ≥4 letters, not whitelisted, not part of phrase hit.
  const singleRegex = /(?<![A-Za-z\-])[A-Za-z]{4,}(?![A-Za-z\-])/g;
  while ((m = singleRegex.exec(masked)) !== null) {
    const word = m[0];
    if (isWhitelisted(word)) continue;
    if (results.some((r) => m!.index >= r.index && m!.index < r.index + r.match.length)) continue;
    const ctxStart = Math.max(0, m.index - 80);
    const ctxEnd = Math.min(text.length, m.index + word.length + 80);
    results.push({ match: word, context: text.slice(ctxStart, ctxEnd), index: m.index });
  }

  return results;
}


/**
 * Ask AI to translate English fragments to Russian, preserving medical terms,
 * codes, units. Returns map { originalFragment -> russianTranslation }.
 */
async function translateEnglishFragments(
  fragments: Array<{ match: string; context: string }>,
  model: string,
): Promise<Record<string, string>> {
  if (fragments.length === 0) return {};

  const system = `Ты медицинский редактор-переводчик. На вход получаешь JSON-массив объектов {match, context}, где match — английский фрагмент, попавший в русский медицинский отчёт по ошибке, context — окружающий русский текст.

Твоя задача: для каждого match вернуть точный русский перевод, сохраняющий медицинский смысл и стилистику окружающего контекста.

ПРАВИЛА (СТРОГО):
- НЕ переводи (верни match как есть, дословно):
  • коды биомаркеров (HBA1C, LDL, TSH, TNF, IL-6 и т.п.)
  • единицы измерения (mg/dL, mmol/L, ng/mL, IU)
  • торговые названия и бренды препаратов / добавок
  • латинские названия активных веществ (Magnesium glycinate, Zinc picolinate, L-carnitine, N-acetylcysteine, Coenzyme Q10, Alpha-lipoic acid, Methylfolate)
  • латинские медицинские выражения (in vivo, ex vivo, de novo, et al.)
  • аббревиатуры PCR, ELISA, DNA, RNA и т.п.
  • буквенные префиксы химических форм (L-, D-, N-, S-) — оставляй как есть
- Переводи ТОЛЬКО обычные английские слова и фразы общего языка, попавшие случайно (например "according to recent studies", "however", "based on").
- Если match — медицинский термин/бренд/код → верни match без изменений в поле russian.
- Сохраняй регистр и пунктуацию по контексту.

Верни ТОЛЬКО валидный JSON в формате: {"translations": [{"match": "...", "russian": "..."}, ...]}. Без обёрток, без комментариев.`;

  const user = JSON.stringify({ fragments }, null, 2);

  const resp = await fetchWithTimeout(
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
        response_format: { type: "json_object" },
      }),
    },
    AI_CALL_TIMEOUT_MS,
  );

  if (!resp.ok) {
    console.error("AI translate error:", resp.status, await resp.text());
    return {};
  }
  const data = await resp.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw);
    const out: Record<string, string> = {};
    for (const item of parsed.translations || []) {
      if (item?.match && typeof item.russian === "string") {
        out[item.match] = item.russian;
      }
    }
    return out;
  } catch (e) {
    console.error("AI translate JSON parse failed:", e, raw.slice(0, 300));
    return {};
  }
}

// ──────────────────── AI helper ────────────────────

async function generateBiomarkerEducation(
  biomarkerName: string,
  biomarkerCode: string,
  valueLine: string,
  model: string,
  reportContext: string,
  generalDescription: string | null,
): Promise<string | null> {
  const system = `Ты медицинский редактор. Верни ТОЛЬКО Markdown-блок одного биомаркера в формате (без обёрток, без поясняющих фраз):

<!-- anchor:biomarker ${biomarkerCode} -->
<!-- qa:generated -->
${biomarkerName}

[1–2 коротких абзаца простым языком: что это за показатель и за что он отвечает в организме. Без чисел и без оценок пациента.]

${valueLine}

[Если отклонение — добавь блок «Что это значит для вас» с практическим выводом для конкретного значения.]
<!-- anchor:biomarker_end -->`;

  const knowledge = generalDescription && generalDescription.trim().length > 40
    ? `\n\nГотовое базовое описание этого биомаркера (используй его как первоисточник, можешь слегка адаптировать стиль, но не сокращай по смыслу и не выдумывай заново):\n"""\n${generalDescription.trim()}\n"""\n`
    : "";

  const user = `Биомаркер: ${biomarkerName} (код ${biomarkerCode}).
Контекст отчёта (для тонального соответствия, не цитируй):
${reportContext.slice(0, 2000)}${knowledge}

Сгенерируй блок биомаркера по шаблону выше. Не используй списки, не используй заголовки кроме первой строки с названием биомаркера. Только проза.`;

  const buildFromKnowledge = (): string | null => {
    if (!generalDescription || generalDescription.trim().length < 40) return null;
    return `<!-- anchor:biomarker ${biomarkerCode} -->
<!-- qa:generated -->
${biomarkerName}

${generalDescription.trim()}

${valueLine}
<!-- anchor:biomarker_end -->`;
  };

  try {
    const resp = await fetchWithTimeout(
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
      AI_CALL_TIMEOUT_MS,
    );

    if (!resp.ok) {
      console.error("AI gateway error:", resp.status, await resp.text());
      return buildFromKnowledge();
    }
    const data = await resp.json();
    const text: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    // Если AI вернул слишком короткий ответ — используем готовое описание из БД.
    const cyrCount = (text.match(/[а-яё]/gi) || []).length;
    if (!text || cyrCount < 120) {
      return buildFromKnowledge() || text || null;
    }
    return text;
  } catch (err) {
    // Timeout / network error — не валим весь QA-прогон, откатываемся
    // на готовое описание из БД (если оно есть) либо возвращаем null,
    // тогда карточка просто останется как была.
    console.error("generateBiomarkerEducation failed:", err);
    return buildFromKnowledge();
  }
}



async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`AI gateway timeout after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
      let closed = false;
      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const fixes: string[] = [];
      const startedAt = Date.now();
      let aiRepairsDone = 0;
      const isTimeBudgetLow = () => Date.now() - startedAt > QA_TIME_BUDGET_MS;
      const heartbeat = setInterval(() => {
        send({ type: "status", message: "Проверка продолжается…" });
      }, 15_000);

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
          .select("biomarker_id, biomarkers!inner(code, name, general_description)")
          .eq("analysis_id", analysisId);
        if (avErr) throw avErr;

        const biomarkers = (avRows || []).map((r: any) => ({
          code: r.biomarkers?.code,
          name: r.biomarkers?.name,
          general_description: r.biomarkers?.general_description ?? null,
        }));
        const knownCodesNorm = new Set(
          biomarkers.map((b) => normalizeBiomarkerCode(b.code)),
        );

        // Load ALL biomarker codes from the dictionary (not just this analysis)
        // so the English-artifact detector never flags valid biomarker codes,
        // synonyms, or short names as errors.
        const { data: allBiomarkersData } = await admin
          .from("biomarkers")
          .select("code, name, general_description");
        const englishWhitelistExtra = new Set<string>();
        const generalDescByCode = new Map<string, string>();
        for (const b of (allBiomarkersData || []) as any[]) {
          if (b?.code) englishWhitelistExtra.add(normalizeWhitelistToken(String(b.code)));
          if (b?.code && b?.general_description) {
            generalDescByCode.set(
              normalizeBiomarkerCode(String(b.code)),
              String(b.general_description),
            );
          }
          if (b?.name) {
            // also add Latin tokens that may appear inside biomarker names
            for (const tok of String(b.name).split(/[\s,()/]+/)) {
              if (/^[A-Za-z][A-Za-z0-9-]*$/.test(tok)) {
                englishWhitelistExtra.add(normalizeWhitelistToken(tok));
              }
            }
          }
        }


        const aiModel: string =
          (analysis as any)?.biomarkers_metadata?.ai_model ||
          "google/gemini-2.5-pro";

        send({ type: "status", message: "Загружаю секции рекомендаций…" });
        const { data: recs, error: rErr } = await admin
          .from("recommendations")
          .select("id, type, text")
          .eq("analysis_id", analysisId);
        if (rErr) throw rErr;

        // Process each markdown section:
        //  - «Назначения» — JSON, не трогаем;
        //  - «Общее резюме» / «Данные пациента» — обложечные секции без биомаркеров;
        //    QA работает только с категориями биомаркеров, чтобы не переписывать
        //    уже готовый нарратив резюме.
        const SKIP_SECTIONS = new Set(["Назначения", "Общее резюме", "Данные пациента"]);
        const sections = (recs || []).filter(
          (r: any) => !SKIP_SECTIONS.has(r.type) && typeof r.text === "string",
        );
        send({
          type: "status",
          message: `Найдено секций: ${sections.length}. Запускаю проверки…`,
        });

        for (const sec of sections as any[]) {
          if (isTimeBudgetLow()) {
            const msg = "Проверка остановлена по лимиту времени. Уже найденные исправления сохранены; оставшиеся секции можно проверить повторным запуском.";
            fixes.push(msg);
            send({ type: "warn", message: msg });
            break;
          }

          let text: string = sec.text;
          const sectionLabel = sec.type;

          // 1. Normalize typography
          const before1 = text;
          text = normalizeAnchorTypography(text);
          text = stripSystemKeyIndicatorsHeading(text);
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

          // 3b. Отрезаем «переходные» абзацы, прилипшие к концу карточек
          // биомаркеров (иначе они «закрашиваются» цветом карточки).
          const trans = stripTrailingTransitions(text);
          if (trans.touched.length > 0) {
            text = trans.text;
            const msg = `[${sectionLabel}] Вынесены переходные абзацы из карточек: ${trans.touched.join(", ")}`;
            fixes.push(msg);
            send({ type: "fix", message: msg });
          }

          // 3c. Канонизация кодов в anchor-тегах: если нормализованный код
          // anchor совпадает с нормализованным кодом биомаркера из БД —
          // переписываем anchor на каноничный код. Это лечит частые случаи
          // «TNF-alpha» ↔ «TNF-α», где карточка не привязывалась к значению.
          {
            const canonByNorm = new Map<string, string>();
            for (const b of biomarkers) {
              if (b.code) canonByNorm.set(normalizeBiomarkerCode(b.code), b.code);
            }
            const canonicalized: string[] = [];
            text = text.replace(
              /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g,
              (full, raw) => {
                const rawTrim = String(raw).trim();
                const canonical = canonByNorm.get(normalizeBiomarkerCode(rawTrim));
                if (canonical && canonical !== rawTrim) {
                  canonicalized.push(`${rawTrim} → ${canonical}`);
                  return `<!-- anchor:biomarker ${canonical} -->`;
                }
                return full;
              },
            );
            if (canonicalized.length > 0) {
              const msg = `[${sectionLabel}] Канонизированы коды в anchor-тегах: ${canonicalized.join(", ")}`;
              fixes.push(msg);
              send({ type: "fix", message: msg });
            }
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

            // Сколько маркеров реально успеем починить в этом прогоне
            const remainingBudget = Math.max(
              0,
              MAX_AI_REPAIRS_PER_RUN - aiRepairsDone,
            );
            const toProcess = blocksToFix.slice(0, remainingBudget);
            const skippedByLimit = blocksToFix.length - toProcess.length;

            // Задача на догенерацию — фиксируем позиции ДО параллельного
            // выполнения, т.к. text мы будем мутировать после.
            type RepairTask = {
              blk: { code: string; content: string; start: number; end: number };
              bm: { code: string; name: string; general_description?: string | null };
              valueLine: string;
              replaceEnd: number;
              result?: string | null;
            };
            const tasks: RepairTask[] = [];
            for (const blk of toProcess) {
              const bm = biomarkers.find(
                (b) =>
                  normalizeBiomarkerCode(b.code) ===
                  normalizeBiomarkerCode(blk.code),
              );
              if (!bm) continue;
              const valueMatch =
                /Ваш(?:а|е|и)?\s+[^.\n]{0,200}\.[^.\n]{0,200}/i.exec(blk.content);
              const valueLine = valueMatch
                ? valueMatch[0].trim()
                : `Ваш показатель ${bm.name} находится в указанном диапазоне.`;
              // Поиск конца блока в текущем text
              const endRegex = /<!--\s*anchor:biomarker_end\s*-->/g;
              endRegex.lastIndex = blk.end;
              const endMatch = endRegex.exec(text);
              const replaceEnd = endMatch
                ? endMatch.index + endMatch[0].length
                : blk.end;
              tasks.push({ blk, bm, valueLine, replaceEnd });
            }

            // Параллельно, но с ограничением concurrency и глобальным таймаутом
            let cursor = 0;
            const runWorker = async () => {
              while (cursor < tasks.length) {
                if (isTimeBudgetLow()) return;
                const idx = cursor++;
                const t = tasks[idx];
                send({
                  type: "status",
                  message: `→ AI догенерирует описание: ${t.bm.name} (${t.bm.code})`,
                });
                const generalDesc =
                  (t.bm as any).general_description ??
                  generalDescByCode.get(normalizeBiomarkerCode(t.bm.code)) ??
                  null;
                try {
                  t.result = await generateBiomarkerEducation(
                    t.bm.name,
                    t.bm.code,
                    t.valueLine,
                    REPAIR_MODEL,
                    reportContext,
                    generalDesc,
                  );
                } catch (_e) {
                  t.result = null;
                }
                aiRepairsDone++;
              }
            };
            const workers: Promise<void>[] = [];
            const workerCount = Math.min(REPAIR_CONCURRENCY, tasks.length);
            for (let w = 0; w < workerCount; w++) workers.push(runWorker());
            await Promise.all(workers);

            // Применяем результаты СПРАВА НАЛЕВО, чтобы индексы оставались валидны.
            const applied = tasks
              .filter((t) => t.result)
              .sort((a, b) => b.blk.start - a.blk.start);
            for (const t of applied) {
              text =
                text.slice(0, t.blk.start) +
                (t.result as string) +
                "\n" +
                text.slice(t.replaceEnd);
              const msg = `[${sectionLabel}] ✓ Догенерирован описательный блок: ${t.bm.name} (${t.bm.code})`;
              fixes.push(msg);
              send({ type: "fix", message: msg });
            }
            const failed = tasks.filter((t) => t.result === null);
            for (const t of failed) {
              const msg = `[${sectionLabel}] ✗ Не удалось догенерировать: ${t.bm.name} (${t.bm.code})`;
              fixes.push(msg);
              send({ type: "warn", message: msg });
            }
            if (skippedByLimit > 0 || (tasks.length > 0 && applied.length + failed.length < tasks.length)) {
              const skippedTotal =
                skippedByLimit + (tasks.length - applied.length - failed.length);
              const msg = `[${sectionLabel}] Часть AI-догенерации пропущена (${skippedTotal}) — исчерпан бюджет времени/лимит на прогон. Запустите проверку ещё раз после сохранения текущих правок.`;
              fixes.push(msg);
              send({ type: "warn", message: msg });
            }
          }

          // 6. Detect & translate stray English fragments (artifacts)
          const englishHits = detectEnglishArtifacts(text, englishWhitelistExtra);
          if (englishHits.length > 0) {
            // Dedupe by match string (translate each unique fragment once)
            const uniqueMap = new Map<string, { match: string; context: string }>();
            for (const h of englishHits) {
              if (!uniqueMap.has(h.match)) {
                uniqueMap.set(h.match, { match: h.match, context: h.context });
              }
            }
            const unique = [...uniqueMap.values()];
            const canTranslate = !isTimeBudgetLow() && aiRepairsDone < MAX_AI_REPAIRS_PER_RUN;
            let translations: Record<string, string> = {};
            if (canTranslate) {
              send({
                type: "status",
                message: `[${sectionLabel}] Найдены английские артефакты (${unique.length} уник.). Перевожу…`,
              });
              translations = await translateEnglishFragments(unique, aiModel);
              aiRepairsDone++;
            } else {
              const msg = `[${sectionLabel}] Английские фрагменты найдены, но перевод пропущен по лимиту времени.`;
              fixes.push(msg);
              send({ type: "warn", message: msg });
            }
            let replaced = 0;
            // Replace longest first to avoid overlapping substring issues
            const sortedKeys = Object.keys(translations).sort(
              (a, b) => b.length - a.length,
            );
            for (const orig of sortedKeys) {
              const ru = translations[orig];
              if (!ru || ru === orig) continue;
              const re = new RegExp(escapeRegex(orig), "g");
              const before = text;
              text = text.replace(re, ru);
              if (before !== text) {
                replaced++;
                const msg = `[${sectionLabel}] ✓ Английский → русский: «${orig}» → «${ru}»`;
                fixes.push(msg);
                send({ type: "fix", message: msg });
              }
            }
            const skipped = unique.length - replaced;
            if (skipped > 0) {
              const samples = unique
                .filter((u) => !translations[u.match] || translations[u.match] === u.match)
                .slice(0, 5)
                .map((u) => u.match)
                .join(", ");
              const msg = `[${sectionLabel}] ⚠ Не переведены ${skipped} фрагментов (возможно, термины/коды): ${samples}`;
              fixes.push(msg);
              send({ type: "warn", message: msg });
            }
          }


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

        // 7. Cross-section audit: убеждаемся, что КАЖДЫЙ биомаркер из
        // analysis_values реально отрендерен хотя бы одной карточкой в отчёте.
        // Иначе — предупреждение с списком пропущенных биомаркеров.
        try {
          const { data: recsAfter } = await admin
            .from("recommendations")
            .select("text")
            .eq("analysis_id", analysisId);
          const combined = ((recsAfter || []) as any[])
            .map((r) => (typeof r.text === "string" ? r.text : ""))
            .join("\n\n");
          const renderedCodes = new Set<string>();
          const anchorRe = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
          for (const m of combined.matchAll(anchorRe)) {
            if (m[1]) renderedCodes.add(normalizeBiomarkerCode(m[1]));
          }
          const missing = biomarkers.filter(
            (b) => b.code && !renderedCodes.has(normalizeBiomarkerCode(b.code)),
          );
          if (missing.length > 0) {
            const list = missing
              .map((b) => `${b.name} (${b.code})`)
              .join(", ");
            const msg = `⚠ Биомаркеры без карточки в отчёте (${missing.length}): ${list}. Рекомендуется перегенерировать отчёт.`;
            fixes.push(msg);
            send({ type: "warn", message: msg });
          }
        } catch (auditErr) {
          console.warn("cross-section audit failed:", auditErr);
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
        clearInterval(heartbeat);
        closed = true;
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
