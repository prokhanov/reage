import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MedicationSuggestion {
  inn: string;
  drug_class: string | null;
  brand_names: string[] | null;
  search_terms: string[] | null;
}

let cache: Promise<MedicationSuggestion[]> | null = null;

function loadDictionary(): Promise<MedicationSuggestion[]> {
  if (!cache) {
    cache = (async () => {
      try {
        const { data } = await supabase
          .from("medication_dictionary")
          .select("inn, drug_class, brand_names, search_terms")
          .order("inn");
        return (data ?? []) as MedicationSuggestion[];
      } catch {
        return [];
      }
    })();
  }
  return cache;
}

export function normalizeMedName(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'()\[\]]/g, " ")
    .replace(/[^a-zа-я0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Подсказки препаратов из справочника (загружается один раз и фильтруется локально). */
export function useMedicationSuggestions(query: string, enabled = true, limit = 8) {
  const [dict, setDict] = useState<MedicationSuggestion[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadDictionary().then((d) => {
      if (alive) setDict(d);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return useMemo(() => {
    const q = normalizeMedName(query);
    if (q.length < 2) return [] as Array<MedicationSuggestion & { matchedBrand?: string }>;

    const scored: Array<{ item: MedicationSuggestion; brand?: string; score: number }> = [];
    for (const item of dict) {
      const terms = [
        { text: item.inn, brand: undefined as string | undefined },
        ...(item.brand_names ?? []).map((b) => ({ text: b, brand: b })),
        ...(item.search_terms ?? []).map((t) => ({ text: t, brand: undefined })),
      ];
      let best: { score: number; brand?: string } | null = null;
      for (const t of terms) {
        const n = normalizeMedName(t.text);
        if (!n) continue;
        const score = n.startsWith(q) ? 0 : n.includes(q) ? 1 : -1;
        if (score >= 0 && (!best || score < best.score)) best = { score, brand: t.brand };
      }
      if (best) scored.push({ item, brand: best.brand, score: best.score });
    }

    scored.sort((a, b) => a.score - b.score || a.item.inn.localeCompare(b.item.inn));
    return scored.slice(0, limit).map((s) => ({ ...s.item, matchedBrand: s.brand }));
  }, [dict, query, limit]);
}
