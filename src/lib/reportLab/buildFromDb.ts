/**
 * Адаптер БД → LabReport.
 *
 * Собирает `LabReport` для конкретного анализа реального пациента.
 * Работает строго read-only через клиентский Supabase (RLS даёт нужный доступ:
 * пациент видит своё, админ/врач — через политики has_admin_permission).
 *
 * Никаких моков и сэмпла Проханова здесь нет — только живые данные.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  CoverOverrides,
  LabReport,
  ReportAnalysis,
  ReportBiomarker,
  ReportPatient,
  ReportPrescription,
  ReportRecommendationRow,
} from "./types";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  birth_date: string | null;
  height: number | string | null;
  weight: number | string | null;
};

type AnalysisRow = {
  id: string;
  date: string;
  lab_name: string | null;
  note: string | null;
  health_index: number | null;
  biological_age: number | null;
  cover_overrides: unknown;
};

type ValueRow = {
  id: string;
  value: number;
  unit_override: string | null;
  biomarker_id: string;
  biomarkers: unknown;
};

type BiomarkerRow = Record<string, unknown> & { id: string };

type RecommendationRow = {
  id: string;
  type: string | null;
  text: string | null;
  content_json: unknown;
  created_at: string;
};

type PrescriptionRow = {
  id: string;
  name: string | null;
  form: string | null;
  dosage: string | null;
  how_to_take: string | null;
  duration: string | null;
  reason: string | null;
  effect: string | null;
  category: string | null;
};

const toNumber = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
};

const normalizeGender = (g: string | null): ReportPatient["gender"] => {
  if (g === "male" || g === "female" || g === "other") return g;
  return null;
};

function mapBiomarker(row: BiomarkerRow, value: number, unit_override: string | null): ReportBiomarker {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    unit: (row.unit as string | null) ?? null,
    unit_override,
    value,
    normal_min: toNumber(row.normal_min),
    normal_max: toNumber(row.normal_max),
    normal_min_male: toNumber(row.normal_min_male),
    normal_max_male: toNumber(row.normal_max_male),
    normal_min_female: toNumber(row.normal_min_female),
    normal_max_female: toNumber(row.normal_max_female),
    optimal_min: toNumber(row.optimal_min),
    optimal_max: toNumber(row.optimal_max),
    optimal_min_male: toNumber(row.optimal_min_male),
    optimal_max_male: toNumber(row.optimal_max_male),
    optimal_min_female: toNumber(row.optimal_min_female),
    optimal_max_female: toNumber(row.optimal_max_female),
    critical_min: toNumber(row.critical_min),
    critical_max: toNumber(row.critical_max),
    critical_min_male: toNumber(row.critical_min_male),
    critical_max_male: toNumber(row.critical_max_male),
    critical_min_female: toNumber(row.critical_min_female),
    critical_max_female: toNumber(row.critical_max_female),
    range_mode: (row.range_mode as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    general_description: (row.general_description as string | null) ?? null,
    display_order: toNumber(row.display_order),
    age_ranges: row.age_ranges ?? null,
  };
}

export async function buildLabReportFromDb(
  analysisId: string,
  userId: string,
): Promise<LabReport> {
  if (!analysisId) throw new Error("buildLabReportFromDb: analysisId is required");
  if (!userId) throw new Error("buildLabReportFromDb: userId is required");

  const [analysisRes, profileRes, valuesRes, recommendationsRes, prescriptionsRes] =
    await Promise.all([
      supabase
        .from("analyses")
        .select("id, date, lab_name, note, health_index, biological_age")
        .eq("id", analysisId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("first_name, last_name, gender, birth_date, height, weight")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("analysis_values")
        .select("id, value, unit_override, biomarker_id, biomarkers(*)")
        .eq("analysis_id", analysisId),
      supabase
        .from("recommendations")
        .select("id, type, text, content_json, created_at")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: true }),
      supabase
        .from("prescriptions")
        .select("id, name, form, dosage, how_to_take, duration, reason, effect, category")
        .eq("analysis_id", analysisId)
        .eq("is_archived", false),
    ]);

  if (analysisRes.error) throw analysisRes.error;
  if (profileRes.error) throw profileRes.error;
  if (valuesRes.error) throw valuesRes.error;
  if (recommendationsRes.error) throw recommendationsRes.error;
  if (prescriptionsRes.error) throw prescriptionsRes.error;

  const analysisRow = analysisRes.data as AnalysisRow | null;
  if (!analysisRow) throw new Error(`Анализ не найден: ${analysisId}`);

  const profileRow = (profileRes.data ?? {}) as ProfileRow;

  const patient: ReportPatient = {
    first_name: profileRow.first_name ?? "",
    last_name: profileRow.last_name ?? null,
    gender: normalizeGender(profileRow.gender),
    birth_date: profileRow.birth_date ?? null,
    height: toNumber(profileRow.height),
    weight: toNumber(profileRow.weight),
  };

  const analysis: ReportAnalysis = {
    id: analysisRow.id,
    date: analysisRow.date,
    lab_name: analysisRow.lab_name ?? null,
    note: analysisRow.note ?? null,
    health_index: toNumber(analysisRow.health_index),
    biological_age: toNumber(analysisRow.biological_age),
  };

  const biomarkers: ReportBiomarker[] = ((valuesRes.data ?? []) as ValueRow[])
    .map((row) => {
      const bm = row.biomarkers as BiomarkerRow | null;
      if (!bm || !bm.id) return null;
      return mapBiomarker(bm, row.value, row.unit_override);
    })
    .filter((b): b is ReportBiomarker => b !== null)
    // Стабильный порядок: категория → display_order → имя.
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category, "ru");
      const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "ru");
    });

  const recommendations: ReportRecommendationRow[] = (
    (recommendationsRes.data ?? []) as RecommendationRow[]
  ).map((row) => ({
    id: row.id,
    type: row.type ?? "",
    text: row.text ?? null,
    content_json: row.content_json ?? null,
    created_at: row.created_at,
  }));

  const prescriptions: ReportPrescription[] = (
    (prescriptionsRes.data ?? []) as PrescriptionRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name ?? "",
    form: row.form ?? null,
    dosage: row.dosage ?? null,
    how_to_take: row.how_to_take ?? null,
    duration: row.duration ?? null,
    reason: row.reason ?? null,
    category: row.category ?? null,
    effect: row.effect ?? null,
  }));

  const report: LabReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    patient,
    analysis,
    recommendations,
    biomarkers,
    prescriptions,
  };

  return report;
}

// Dev-only отладочный хук для ручной проверки на реальных анализах.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __buildLabReportFromDb?: typeof buildLabReportFromDb }).__buildLabReportFromDb =
    buildLabReportFromDb;
}
