/**
 * Собирает `LabReport` из статического демо-снапшота `exampleReport.json`.
 * Формат JSON уже совпадает по полям с БД, поэтому маппинг тривиален —
 * функция нужна, чтобы демо-страница могла переиспользовать `ReportV2Editor`
 * без обращения к Supabase / без auth-сессии.
 */

import exampleReportData from "@/data/exampleReport.json";
import type {
  CoverOverrides,
  LabReport,
  ReportAnalysis,
  ReportBiomarker,
  ReportPatient,
  ReportPrescription,
  ReportRecommendationRow,
} from "./types";

const toNumber = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
};

const normalizeGender = (g: unknown): ReportPatient["gender"] => {
  if (g === "male" || g === "female" || g === "other") return g;
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

export function buildLabReportFromExample(): LabReport {
  const data = exampleReportData as AnyRec;

  const profile: AnyRec = data.profile ?? {};
  const analysisRow: AnyRec = data.analysis ?? {};

  const patient: ReportPatient = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? null,
    gender: normalizeGender(profile.gender),
    birth_date: profile.birth_date ?? null,
    height: toNumber(profile.height),
    weight: toNumber(profile.weight),
  };

  const analysis: ReportAnalysis = {
    id: analysisRow.id ?? "demo-analysis",
    date: analysisRow.date ?? new Date().toISOString().slice(0, 10),
    lab_name: analysisRow.lab_name ?? null,
    note: analysisRow.note ?? null,
    health_index: toNumber(analysisRow.health_index),
    biological_age: toNumber(analysisRow.biological_age),
  };

  const biomarkers: ReportBiomarker[] = ((data.analysis_values as AnyRec[]) ?? [])
    .map((row) => {
      const bm = row.biomarker as AnyRec | null;
      if (!bm || !bm.id) return null;
      return {
        id: String(bm.id),
        code: String(bm.code ?? ""),
        name: String(bm.name ?? ""),
        category: String(bm.category ?? ""),
        unit: bm.unit ?? null,
        unit_override: row.unit_override ?? null,
        value: Number(row.value),
        normal_min: toNumber(bm.normal_min),
        normal_max: toNumber(bm.normal_max),
        normal_min_male: toNumber(bm.normal_min_male),
        normal_max_male: toNumber(bm.normal_max_male),
        normal_min_female: toNumber(bm.normal_min_female),
        normal_max_female: toNumber(bm.normal_max_female),
        optimal_min: toNumber(bm.optimal_min),
        optimal_max: toNumber(bm.optimal_max),
        optimal_min_male: toNumber(bm.optimal_min_male),
        optimal_max_male: toNumber(bm.optimal_max_male),
        optimal_min_female: toNumber(bm.optimal_min_female),
        optimal_max_female: toNumber(bm.optimal_max_female),
        critical_min: toNumber(bm.critical_min),
        critical_max: toNumber(bm.critical_max),
        critical_min_male: toNumber(bm.critical_min_male),
        critical_max_male: toNumber(bm.critical_max_male),
        critical_min_female: toNumber(bm.critical_min_female),
        critical_max_female: toNumber(bm.critical_max_female),
        range_mode: bm.range_mode ?? null,
        description: bm.description ?? null,
        general_description: bm.general_description ?? null,
        display_order: toNumber(bm.display_order),
        age_ranges: bm.age_ranges ?? null,
      } as ReportBiomarker;
    })
    .filter((b): b is ReportBiomarker => b !== null)
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category, "ru");
      const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "ru");
    });

  const recommendations: ReportRecommendationRow[] = ((data.recommendations as AnyRec[]) ?? []).map(
    (row) => ({
      id: row.id,
      type: row.type ?? "",
      text: row.text ?? null,
      content_json: row.content_json ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
    }),
  );

  const prescriptions: ReportPrescription[] = ((data.prescriptions as AnyRec[]) ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? row.prescription ?? "",
    form: row.form ?? null,
    dosage: row.dosage ?? null,
    how_to_take: row.how_to_take ?? null,
    duration: row.duration ?? null,
    reason: row.reason ?? null,
    category: row.category ?? null,
    effect: row.effect ?? null,
  }));

  const coverOverrides: CoverOverrides | null =
    analysisRow.cover_overrides && typeof analysisRow.cover_overrides === "object"
      ? (analysisRow.cover_overrides as CoverOverrides)
      : null;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    patient,
    analysis,
    recommendations,
    biomarkers,
    prescriptions,
    coverOverrides,
  };
}
