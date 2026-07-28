// Автоматическое пополнение справочника препаратов.
// На вход — произвольные названия препаратов (как их вписал пациент).
// Известные — берутся из medication_dictionary, неизвестные — распознаются AI
// и кэшируются в справочник (source = 'ai_runtime').

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { matchMedication, normalizeMedName, type MedicationEntry } from "../_shared/medications.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

interface AiDrug {
  input: string;
  recognized: boolean;
  inn?: string;
  inn_en?: string;
  drug_class?: string;
  brand_names?: string[];
  lab_effects?: Array<{ biomarker_code?: string; direction?: string; strength?: string; note?: string }>;
  clinical_note?: string;
}

async function askAi(names: string[], biomarkerCodes: string[], apiKey: string): Promise<AiDrug[]> {
  const system = `Ты клинический фармаколог. Тебе дают названия препаратов и БАДов так, как их написал пациент (возможны опечатки, торговые названия, транслит).
Для каждого названия определи действующее вещество (МНН на русском), международное название латиницей, фармгруппу, известные торговые названия и влияние на лабораторные показатели.
Используй ТОЛЬКО коды биомаркеров из списка: ${biomarkerCodes.join(", ")}.
direction: "up" (повышает), "down" (понижает), "variable" (может менять в обе стороны).
strength: "strong", "moderate", "weak".
Если название неоднозначно или ты не уверен — поставь recognized=false и НЕ придумывай вещество.
Отвечай строго JSON-объектом вида {"drugs":[...]} без пояснений.`;

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ names }) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed?.drugs) ? parsed.drugs : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const names: string[] = Array.isArray(body?.medications)
      ? body.medications.map((m: unknown) => String(m).trim()).filter(Boolean)
      : [];
    if (names.length === 0) {
      return Response.json({ resolved: [] }, { headers: corsHeaders });
    }

    const { data: dictData } = await supabase
      .from("medication_dictionary")
      .select("inn, inn_en, drug_class, brand_names, search_terms, lab_effects, clinical_note, verified");
    const dict = (dictData ?? []) as MedicationEntry[];

    const unknown: string[] = [];
    const resolved: Array<{ raw: string; inn: string | null; drug_class: string | null }> = [];

    for (const raw of names) {
      const hit = matchMedication(raw, dict);
      if (hit) resolved.push({ raw, inn: hit.inn, drug_class: hit.drug_class ?? null });
      else unknown.push(raw);
    }

    // Чистим журнал нераспознанных: 1) названия, которые теперь распознаются,
    // 2) «висяки», которых уже нет ни у одного пациента (исправленные опечатки).
    try {
      const { data: openRows } = await supabase
        .from("medication_unresolved")
        .select("id, raw_text, normalized")
        .eq("resolved", false);

      if (openRows && openRows.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("medications")
          .not("medications", "is", null);
        const inUse = new Set<string>();
        for (const p of profs ?? []) {
          const list = Array.isArray((p as { medications?: unknown }).medications)
            ? ((p as { medications: unknown[] }).medications)
            : [];
          for (const m of list) {
            const n = normalizeMedName(String(m ?? ""));
            if (n) inUse.add(n);
          }
        }

        const staleIds = openRows
          .filter((r) => {
            const n = r.normalized ?? normalizeMedName(r.raw_text ?? "");
            if (!n) return true;
            if (!inUse.has(n)) return true; // никто больше так не пишет
            return !!matchMedication(r.raw_text ?? n, dict); // теперь есть в справочнике
          })
          .map((r) => r.id);

        if (staleIds.length > 0) {
          await supabase.from("medication_unresolved").update({ resolved: true }).in("id", staleIds);
        }
      }
    } catch (e) {
      console.error("unresolved cleanup failed", e);
    }


    if (unknown.length > 0) {
      const { data: bm } = await supabase.from("biomarkers").select("code").order("code");
      const codes = (bm ?? []).map((b: { code: string }) => b.code);

      let drugs: AiDrug[] = [];
      try {
        drugs = await askAi(unknown, codes, apiKey);
      } catch (e) {
        console.error("AI resolve failed", e);
      }

      for (const raw of unknown) {
        const d = drugs.find((x) => normalizeMedName(x.input ?? "") === normalizeMedName(raw));
        if (d?.recognized && d.inn) {
          const searchTerms = Array.from(new Set([
            normalizeMedName(raw),
            normalizeMedName(d.inn),
            ...(d.inn_en ? [normalizeMedName(d.inn_en)] : []),
            ...(d.brand_names ?? []).map(normalizeMedName),
          ].filter(Boolean)));

          await supabase.from("medication_dictionary").upsert({
            inn: d.inn,
            inn_en: d.inn_en ?? null,
            drug_class: d.drug_class ?? "",
            brand_names: d.brand_names ?? [],
            search_terms: searchTerms,
            lab_effects: d.lab_effects ?? [],
            clinical_note: d.clinical_note ?? null,
            source: "ai_runtime",
            verified: false,
          }, { onConflict: "inn", ignoreDuplicates: false });

          resolved.push({ raw, inn: d.inn, drug_class: d.drug_class ?? null });
        } else {
          resolved.push({ raw, inn: null, drug_class: null });
          const normalized = normalizeMedName(raw);
          const { data: existing } = await supabase
            .from("medication_unresolved")
            .select("id, hits")
            .eq("normalized", normalized)
            .maybeSingle();
          if (existing) {
            await supabase
              .from("medication_unresolved")
              .update({ hits: (existing.hits ?? 1) + 1, last_seen_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("medication_unresolved").insert({ raw_text: raw, normalized });
          }
        }
      }
    }

    return Response.json({ resolved }, { headers: corsHeaders });
  } catch (e) {
    console.error("resolve-medications error", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
