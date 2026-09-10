import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReportBiomarkerRow {
  code: string;
  name: string;
  unit: string | null;
  general_description: string | null;
  description: string | null;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
  optimal_min: number | null;
  optimal_max: number | null;
  optimal_min_male: number | null;
  optimal_max_male: number | null;
  optimal_min_female: number | null;
  optimal_max_female: number | null;
  critical_min: number | null;
  critical_max: number | null;
  critical_min_male: number | null;
  critical_max_male: number | null;
  critical_min_female: number | null;
  critical_max_female: number | null;
}

const FIELDS =
  "code, name, unit, general_description, description, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female";

let cache: Record<string, ReportBiomarkerRow> | null = null;
let inflight: Promise<Record<string, ReportBiomarkerRow>> | null = null;

async function load(): Promise<Record<string, ReportBiomarkerRow>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase.from("biomarkers").select(FIELDS);
    const map: Record<string, ReportBiomarkerRow> = {};
    (data as unknown as ReportBiomarkerRow[] | null)?.forEach((row) => {
      if (row?.code) map[row.code] = row;
    });
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

/**
 * Справочник показателей из базы: тексты пояснений и референсные диапазоны,
 * те же, что используются в отчётах ReAge. Чтение доступно без авторизации.
 */
export function useReportBiomarkers() {
  const [rows, setRows] = useState<Record<string, ReportBiomarkerRow>>(cache || {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    load()
      .then((m) => {
        if (alive) setRows(m);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { rows, loading };
}
