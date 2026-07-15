import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Biomarker {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
}

interface AIItem {
  printed_name: string;
  value_raw: string;
  unit_raw: string;
  page: number | null;
  ref_range_raw?: string | null;
  biomarker_code?: string | null;
  confidence?: number;
}

interface AIResponse {
  lab_name?: string | null;
  collection_date?: string | null;
  items: AIItem[];
  notes?: string | null;
}

// Известные пересчёты единиц (мультипликаторы):
// from -> to -> factor (value_to = value_from * factor)
const UNIT_CONVERSIONS: Record<string, Record<string, Record<string, number>>> = {
  // glucose, cholesterol family (mg/dL <-> mmol/L) — нужны разные коэффициенты,
  // поэтому делаем per-code.
  GLU: { "мг/дл": { "ммоль/л": 0.0555 }, "mg/dl": { "ммоль/л": 0.0555 } },
  CHOL: { "мг/дл": { "ммоль/л": 0.0259 }, "mg/dl": { "ммоль/л": 0.0259 } },
  LDL: { "мг/дл": { "ммоль/л": 0.0259 }, "mg/dl": { "ммоль/л": 0.0259 } },
  HDL: { "мг/дл": { "ммоль/л": 0.0259 }, "mg/dl": { "ммоль/л": 0.0259 } },
  TG: { "мг/дл": { "ммоль/л": 0.0113 }, "mg/dl": { "ммоль/л": 0.0113 } },
  CREA: { "мг/дл": { "мкмоль/л": 88.4 }, "mg/dl": { "мкмоль/л": 88.4 } },
  UA: { "мг/дл": { "мкмоль/л": 59.48 }, "mg/dl": { "мкмоль/л": 59.48 } },
  TBIL: { "мг/дл": { "мкмоль/л": 17.1 }, "mg/dl": { "мкмоль/л": 17.1 } },
  // CoQ10 в лабораториях приходит как в нг/мл (наш стандарт), так и в мкг/мл.
  CoQ10: {
    "мкг/мл": { "нг/мл": 1000 },
    "ug/ml":  { "нг/мл": 1000 },
    "μg/ml":  { "нг/мл": 1000 },
    "нг/мл":  { "мкг/мл": 0.001 },
    "ng/ml":  { "нг/мл": 1 },
  },
  // hs-CRP: mg/dL ↔ mg/L (1 mg/dL = 10 mg/L)
  "hs-CRP": {
    "мг/дл": { "мг/л": 10 },
    "mg/dl": { "мг/л": 10 },
    "мг/л":  { "мг/дл": 0.1 },
    "mg/l":  { "мг/л": 1 },
  },
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ёе]/g, "е")
    .replace(/α/g, "a")
    .replace(/β/g, "b")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Соответствие: нормализованное альтернативное имя → CODE биомаркера.
// Используется, если и AI, и точный матч по имени не сработали.
const NAME_ALIASES: Record<string, string> = {
  // ФНО / TNF-α
  "фно": "TNF-α",
  "фно a": "TNF-α",
  "фно альфа": "TNF-α",
  "фно фактор некроза опухоли": "TNF-α",
  "фактор некроза опухоли": "TNF-α",
  "фактор некроза опухоли a": "TNF-α",
  "фактор некроза опухоли альфа": "TNF-α",
  "tnf": "TNF-α",
  "tnf a": "TNF-α",
  "tnf alpha": "TNF-α",
  "tumor necrosis factor": "TNF-α",
  "tumor necrosis factor alpha": "TNF-α",
  // Интерлейкин-6 / IL-6
  "il 6": "IL-6",
  "il6": "IL-6",
  "interleukin 6": "IL-6",
  "interleukin-6": "IL-6",
  "ил 6": "IL-6",
  "ил6": "IL-6",
  "интерлейкин 6": "IL-6",
  "интерлейкин-6": "IL-6",
  "интерлейкин 6 il 6": "IL-6",
  // SHBG / ГСПГ
  "shbg": "SHBG",
  "гспг": "SHBG",
  "глобулин связывающий половой гормон": "SHBG",
  "глобулин связывающий половые гормоны": "SHBG",
  "глобулин связывающий половой гормон sex hormone binding globulin": "SHBG",
  "глобулин связывающий половые гормоны sex hormone binding globulin": "SHBG",
  "sex hormone binding globulin": "SHBG",
  "sex hormone-binding globulin": "SHBG",
  // FAI / Индекс свободных андрогенов
  "fai": "FAI",
  "индекс свободных андрогенов": "FAI",
  "индекс свободных андрогенов fai": "FAI",
  "free androgen index": "FAI",
  // Реакции ОАМ (Sysmex-style): «Реакция на …» / химический тест мочи
  "реакция на гемоглобин": "HB-U",
  "реакция на кровь": "HB-U",
  "гемоглобин мочи": "HB-U",
  "кровь в моче": "HB-U",
  "blood": "HB-U",
  "hemoglobin urine": "HB-U",
  "реакция на лейкоцитарную эстеразу": "LEU-EST-U",
  "лейкоцитарная эстераза": "LEU-EST-U",
  "leukocyte esterase": "LEU-EST-U",
  "реакция на эритроциты": "ERY-RXN-U",
  "эритроциты качественно": "ERY-RXN-U",
  // CRP / hs-CRP: лаборатории часто печатают расширенное название метода
  "с реактивный белок": "hs-CRP",
  "с реактивный белок crp": "hs-CRP",
  "с реактивный белок crp ультрачувствительный метод": "hs-CRP",
  "с реактивный белок ультрачувствительный метод": "hs-CRP",
  "срб": "hs-CRP",
  "вч срб": "hs-CRP",
  "ультрачувствительный с реактивный белок": "hs-CRP",
  "crp": "hs-CRP",
  "hs crp": "hs-CRP",
  "high sensitivity crp": "hs-CRP",
  "c reactive protein": "hs-CRP",
  "c reactive protein crp": "hs-CRP",
  "c reactive protein high sensitivity": "hs-CRP",
  // Immunoglobulins: лаборатории часто печатают код в скобках
  "иммуноглобулин g": "IgG",
  "иммуноглобулин g igg": "IgG",
  "igg": "IgG",
  "immunoglobulin g": "IgG",
  "immunoglobulin g igg": "IgG",
  "иммуноглобулин m": "IgM",
  "иммуноглобулин m igm": "IgM",
  "igm": "IgM",
  "immunoglobulin m": "IgM",
  "immunoglobulin m igm": "IgM",
};

// Fuzzy fallback: keyword-based mapping used if exact alias lookup fails.
const NAME_KEYWORD_ALIASES: Array<{ keywords: string[]; code: string }> = [
  { keywords: ["глобулин", "половы"], code: "SHBG" },
  { keywords: ["sex", "hormone", "binding"], code: "SHBG" },
  { keywords: ["свободн", "андроген"], code: "FAI" },
  { keywords: ["free", "androgen", "index"], code: "FAI" },
  { keywords: ["реакция", "гемоглобин"], code: "HB-U" },
  { keywords: ["реакция", "лейкоцитарн"], code: "LEU-EST-U" },
  { keywords: ["реакция", "эритроцит"], code: "ERY-RXN-U" },
  { keywords: ["реактивный", "белок"], code: "hs-CRP" },
  { keywords: ["crp"], code: "hs-CRP" },
  { keywords: ["срб"], code: "hs-CRP" },
  { keywords: ["иммуноглобулин", "igg"], code: "IgG" },
  { keywords: ["иммуноглобулин", "igm"], code: "IgM" },
  { keywords: ["immunoglobulin", "g"], code: "IgG" },
  { keywords: ["immunoglobulin", "m"], code: "IgM" },
];


const UNIT_ALIASES: Record<string, string> = {
  "сек": "с",
  "сек.": "с",
  "second": "с",
  "seconds": "с",
  "мм/час": "мм/ч",
  "ммч": "мм/ч",
  "соотношение": "",
  "отношение": "",
  "ratio": "",
  "индекс": "",
  "index": "",
  "коэффициент": "",
  "ед": "",
  "—": "",
  "-": "",
  // Interchangeable units (МЕ = Ед, международная единица = единица активности)
  "мкме/мл": "мкед/мл",
  "мme/мл": "мед/мл",
  "ме/мл": "ед/мл",
  "ме/л": "ед/л",
  "iu/ml": "мкед/мл",
  "uiu/ml": "мкед/мл",
  "μiu/ml": "мкед/мл",
  // Клетки/микролитр = Единицы/микролитр (для микроскопии осадка мочи)
  "кл/мкл": "ед/мкл",
  "cells/ul": "ед/мкл",
  "cells/μl": "ед/мкл",
  "клеток/мкл": "ед/мкл",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁻": "-", "⁺": "+",
};

function normalizeUnit(u: string): string {
  let s = (u || "")
    .toLowerCase()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (c) => SUPERSCRIPT_MAP[c] || c)
    .replace(/\s+/g, "")
    .replace(/[×x*∗·]/g, "")
    .replace(/[µμ]/g, "мк")
    .replace(/[\u00a0\u200b]/g, "")
    .trim();
  // normalize 10^9, 10*9, 109 (after stripping ×) → 10^9
  s = s.replace(/^10\^?(\d+)/, "10^$1");
  if (UNIT_ALIASES[s] !== undefined) return UNIT_ALIASES[s];
  return s;
}

const QUALITATIVE_URINE_CODES = new Set([
  "HB-U", "KET-U", "NIT-U", "BIL-U", "GLU-U", "PRO-U", "UBG",
  // Микроскопия осадка: значения могут приходить как "не обнаружено" / "+" / "++" / "+++" / число
  "LEU-EST-U", "ERY-RXN-U", "EPI-SQ-U", "EPI-TR-U", "EPI-REN-U",
  "CYL-HYA-U", "CYL-PATH-U", "MUC-U", "BACT-U", "YEAST-U", "SALT-U",
]);

function parseQualitative(raw: string): number | null {
  const s = (raw || "").toLowerCase().replace(/\s+/g, "").replace(".", "");
  if (!s) return null;
  if (/^(neg|отриц|необнаруж|нет|нея|0|—|-|none|negative)/.test(s)) return 0;
  if (/^(след|trace|±)/.test(s)) return 0.5;
  const plus = s.match(/^\++$/);
  if (plus) return plus[0].length;
  if (/^(pos|положит)/.test(s)) return 1;
  return null;
}

function parseValue(raw: string): { value: number | null; cleaned: string } {
  if (!raw) return { value: null, cleaned: "" };
  const cleaned = String(raw).replace(",", ".").replace(/[<>]/g, "").trim();
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return { value: null, cleaned };
  const num = parseFloat(m[0]);
  return { value: Number.isFinite(num) ? num : null, cleaned };
}

async function readPdfBytes(req: Request, log: (...args: unknown[]) => void): Promise<{ bytes: Uint8Array; patientId?: string | null; source: string }> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Error("PDF file is missing");
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Only PDF files are supported");
    }
    const arrayBuffer = await file.arrayBuffer();
    log("direct upload", { name: file.name, type: file.type, size: file.size });
    return {
      bytes: new Uint8Array(arrayBuffer),
      patientId: String(form.get("patientId") || "") || null,
      source: "multipart",
    };
  }

  const body = await req.json().catch(() => null) as { storagePath?: string; patientId?: string } | null;
  log("body", body);
  if (!body?.storagePath) {
    throw new Error("Missing storagePath");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const tDl = Date.now();
  const { data: fileBlob, error: dlErr } = await admin.storage
    .from("analysis-uploads")
    .download(body.storagePath);
  log("download", { ms: Date.now() - tDl, ok: !!fileBlob, err: dlErr?.message });
  if (dlErr || !fileBlob) {
    throw new Error(`PDF not found in storage${dlErr?.message ? `: ${dlErr.message}` : ""}`);
  }

  return {
    bytes: new Uint8Array(await fileBlob.arrayBuffer()),
    patientId: body.patientId || null,
    source: "storage",
  };
}

function tryConvert(code: string, fromUnit: string, toUnit: string, value: number): number | null {
  const f = UNIT_CONVERSIONS[code]?.[normalizeUnit(fromUnit)]?.[normalizeUnit(toUnit)];
  if (typeof f === "number") return Math.round(value * f * 10000) / 10000;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (...args: unknown[]) => console.log(`[parse-pdf ${reqId}]`, ...args);
  log("incoming", req.method, req.url);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    log("env", {
      hasUrl: !!supabaseUrl,
      hasService: !!serviceKey,
      hasAnon: !!anonKey,
      hasLovable: !!lovableKey,
    });

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      log("no token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user via anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      log("auth failed", userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", details: userErr?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("user", userData.user.id);

    const admin = createClient(supabaseUrl, serviceKey);

    // Check superadmin / patients permission
    const [{ data: isSuper }, { data: hasPatients }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "superadmin" }),
      admin.rpc("has_admin_permission", { _user_id: userData.user.id, _module: "patients" }),
    ]);
    log("perms", { isSuper, hasPatients });
    if (!isSuper && !hasPatients) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bytes, source } = await readPdfBytes(req, log);
    log("pdf source", source);
    log("pdf bytes", bytes.byteLength);
    if (bytes.byteLength > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "PDF too large (>50MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // base64 encode (chunked to avoid stack overflow on large arrays)
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64}`;
    log("base64 ready", { base64Len: base64.length });

    // Load biomarker catalog
    const { data: biomarkers, error: bmErr } = await admin
      .from("biomarkers")
      .select("id, code, name, unit, category")
      .order("display_order");
    if (bmErr || !biomarkers) throw new Error("Failed to load biomarkers: " + bmErr?.message);
    const catalog: Biomarker[] = biomarkers as any;
    log("catalog loaded", catalog.length);

    const catalogText = catalog
      .map(b => `${b.code} | ${b.name} | ${b.unit} | ${b.category}`)
      .join("\n");

    const systemPrompt = `Ты — парсер лабораторных PDF-отчётов. На вход подаётся PDF с результатами анализов одного пациента (может быть несколько страниц).

Твоя задача — извлечь СТРОГИЙ JSON по схеме:
{
  "lab_name": "название лаборатории как напечатано или null",
  "collection_date": "дата сдачи образца в формате YYYY-MM-DD или null",
  "items": [
    {
      "printed_name": "название показателя как напечатано в PDF",
      "value_raw": "значение строкой, как напечатано (например '5,4' или '<0.1')",
      "unit_raw": "единица измерения как напечатано",
      "page": номер страницы PDF (целое число, начиная с 1),
      "ref_range_raw": "референсный диапазон строкой или null",
      "biomarker_code": "код из справочника ниже, если уверен, иначе null",
      "confidence": число от 0 до 1
    }
  ],
  "notes": "произвольная заметка о качестве распознавания или null"
}

Справочник биомаркеров (CODE | NAME | UNIT | CATEGORY):
${catalogText}

Правила:
- НЕ выдумывай значения. Если показателя в PDF нет — не включай его.
- Включай ВСЕ числовые показатели, найденные в PDF, даже если их кода нет в справочнике (тогда biomarker_code = null).
- Для biomarker_code ориентируйся на NAME из справочника (русские названия). Если уверенности нет — null.
- Синонимы: "ФНО", "ФНО-α", "Фактор некроза опухоли (альфа)" = TNF-α (Фактор некроза опухоли альфа).
- Синонимы: "ИЛ-6", "Интерлейкин 6", "Интерлейкин-6", "IL6", "Interleukin-6" = IL-6 (Интерлейкин-6).
- Десятичный разделитель в value_raw сохраняй как в PDF.
- Верни ТОЛЬКО JSON, без markdown-обёртки.`;

    const callAi = async (model: string) => {
      const tAi = Date.now();
      log("calling AI gateway", { model });
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Распознай показатели из этого PDF и верни JSON по схеме." },
                { type: "file", file: { filename: "analysis.pdf", file_data: dataUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 16000,
        }),
      });
      log("AI gateway responded", { model, ms: Date.now() - tAi, status: r.status });
      return r;
    };

    let aiResp = await callAi("google/gemini-2.5-flash");

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      log("AI gateway error body", txt.slice(0, 1000));
      return new Response(JSON.stringify({
        error: aiResp.status === 429
          ? "Превышен лимит запросов AI. Попробуйте позже."
          : aiResp.status === 402
          ? "Закончились кредиты Lovable AI."
          : `AI gateway error: ${aiResp.status}`,
        details: txt.slice(0, 500),
      }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiJson = await aiResp.json();
    let finish: string | undefined = aiJson?.choices?.[0]?.finish_reason;
    let rawContent: string = aiJson?.choices?.[0]?.message?.content ?? "";
    log("AI json keys", { keys: Object.keys(aiJson || {}), finish, len: rawContent.length });

    // Empty content — retry on pro as fallback.
    if (!rawContent.trim()) {
      log("empty content, retrying with pro");
      const retry = await callAi("google/gemini-2.5-pro");
      if (retry.ok) {
        aiJson = await retry.json();
        finish = aiJson?.choices?.[0]?.finish_reason;
        rawContent = aiJson?.choices?.[0]?.message?.content ?? "";
        log("retry result", { finish, len: rawContent.length });
      }
    }

    let parsed: AIResponse;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      if (!cleaned) throw new Error("empty AI content");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON:", rawContent.slice(0, 800), "finish:", finish);
      return new Response(JSON.stringify({
        error: "AI вернул невалидный JSON",
        details: rawContent.slice(0, 500) || `finish_reason=${finish ?? "unknown"} (пустой ответ модели)`,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Reconcile with catalog
    const byCode = new Map(catalog.map(b => [b.code.toUpperCase(), b]));
    const byName = new Map<string, Biomarker>();
    for (const b of catalog) {
      byName.set(normalizeName(b.name), b);
    }

    const recognized: any[] = [];
    const unknown: any[] = [];

    for (const it of parsed.items || []) {
      const printedNorm = normalizeName(it.printed_name || "");
      let bm: Biomarker | undefined;
      if (it.biomarker_code) bm = byCode.get(String(it.biomarker_code).toUpperCase());
      if (!bm && printedNorm) bm = byName.get(printedNorm);
      if (!bm && printedNorm && NAME_ALIASES[printedNorm]) {
        bm = byCode.get(NAME_ALIASES[printedNorm].toUpperCase());
      }
      if (!bm && printedNorm) {
        for (const rule of NAME_KEYWORD_ALIASES) {
          if (rule.keywords.every(k => printedNorm.includes(k))) {
            bm = byCode.get(rule.code.toUpperCase());
            if (bm) break;
          }
        }
      }

      const { value: parsedNum } = parseValue(it.value_raw);
      let numericValue = parsedNum;
      if (numericValue === null && bm && QUALITATIVE_URINE_CODES.has(bm.code)) {
        numericValue = parseQualitative(it.value_raw);
      }
      const conf = typeof it.confidence === "number" ? it.confidence : 0.7;

      if (!bm) {
        unknown.push({
          printed_name: it.printed_name,
          value_raw: it.value_raw,
          unit_raw: it.unit_raw,
          page: it.page,
          ref_range_raw: it.ref_range_raw ?? null,
          confidence: conf,
        });
        continue;
      }

      const expectedUnit = bm.unit;
      const isQualitative = QUALITATIVE_URINE_CODES.has(bm.code);
      const unitMatches = isQualitative
        ? true
        : normalizeUnit(it.unit_raw || "") === normalizeUnit(expectedUnit);
      let convertedValue: number | null = null;
      if (!unitMatches && numericValue !== null) {
        convertedValue = tryConvert(bm.code, it.unit_raw || "", expectedUnit, numericValue);
      }

      let status: "ok" | "unit_mismatch" | "low_confidence" | "value_parse_error";
      if (numericValue === null) status = "value_parse_error";
      else if (!unitMatches) status = "unit_mismatch";
      else if (conf < 0.6) status = "low_confidence";
      else status = "ok";


      recognized.push({
        biomarker_id: bm.id,
        biomarker_code: bm.code,
        biomarker_name: bm.name,
        expected_unit: expectedUnit,
        printed_name: it.printed_name,
        value_raw: it.value_raw,
        value_numeric: numericValue,
        value_converted: convertedValue,
        unit_raw: it.unit_raw,
        unit_matches: unitMatches,
        page: it.page,
        ref_range_raw: it.ref_range_raw ?? null,
        confidence: conf,
        status,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      lab_name: parsed.lab_name ?? null,
      collection_date: parsed.collection_date ?? null,
      notes: parsed.notes ?? null,
      recognized,
      unknown,
      stats: {
        total_items: (parsed.items || []).length,
        recognized: recognized.length,
        unknown: unknown.length,
        ok: recognized.filter(r => r.status === "ok").length,
        unit_mismatch: recognized.filter(r => r.status === "unit_mismatch").length,
        low_confidence: recognized.filter(r => r.status === "low_confidence").length,
        value_parse_error: recognized.filter(r => r.status === "value_parse_error").length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(`[parse-pdf ${reqId}] FATAL`, e?.stack || e?.message || e);
    return new Response(JSON.stringify({
      error: e?.message || "Internal error",
      stack: (e?.stack || "").split("\n").slice(0, 5).join("\n"),
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
