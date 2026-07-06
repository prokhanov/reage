/**
 * Report Lab — типы для нового поколения PDF-рендерера.
 *
 * Работает в изоляции от:
 *   - src/lib/anchorParser.ts (legacy)
 *   - src/lib/anchorRenderer.tsx (legacy)
 *   - src/lib/snapshotRenderer.tsx (текущая версия)
 *   - pdfmake
 *
 * Единственный вход в рендерер — сериализованный отчёт в формате
 * `LabReport` (см. src/data/prokhanovReport.json). Дальнейшая
 * миграция на живые данные из БД произойдёт позже — сейчас всё живёт
 * из замороженного JSON-снапшота.
 */

export interface ReportPatient {
  first_name: string;
  last_name: string | null;
  gender: "male" | "female" | "other" | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
}

export interface ReportAnalysis {
  id: string;
  date: string;
  lab_name: string | null;
  note: string | null;
  health_index: number | null;
  biological_age: number | null;
}

export interface ReportBiomarker {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string | null;
  unit_override?: string | null;
  value: number;
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
  range_mode: string | null;
  description: string | null;
  general_description: string | null;
  display_order: number | null;
  age_ranges: unknown;
}

export interface ReportRecommendationRow {
  id: string;
  type: string; // "Данные пациента" | "Общее резюме" | "Назначения" | category name
  text: string | null;
  content_json: unknown;
  created_at: string;
}

/** Persisted per-analysis правки обложки V2. NULL/отсутствие = дефолтный шаблон. */
export interface CoverOverrides {
  background?: {
    mode: "solid" | "gradient";
    c1?: string;
    c2?: string;
    c3?: string;
    angle?: number;
    solid?: string;
  } | null;
  /** Ключ — значение атрибута `data-cover-el` в ReportCover.tsx */
  elements?: Record<
    string,
    {
      transform?: string;
      fontSize?: string;
      color?: string;
      textAlign?: string;
      fontWeight?: string;
      fontStyle?: string;
      /** Пользовательская правка innerHTML блока (если менялся текст). */
      html?: string;
    }
  >;
}

export interface LabReport {
  version: 1;
  generatedAt: string;
  patient: ReportPatient;
  analysis: ReportAnalysis;
  recommendations: ReportRecommendationRow[];
  biomarkers: ReportBiomarker[];
  prescriptions?: ReportPrescription[];
  coverOverrides?: CoverOverrides | null;
}

export interface ReportPrescription {
  id: string;
  name: string;
  form: string | null;
  dosage: string | null;
  how_to_take: string | null;
  duration: string | null;
  reason: string | null;
  category: string | null;
  effect: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Внутренние блоки, в которые парсер разбирает legacy-текст категорий
// ─────────────────────────────────────────────────────────────────────────────

export type ReportBlock =
  | { kind: "prose"; markdown: string }
  | { kind: "biomarker"; code: string; commentary: string };

export interface ParsedCategory {
  title: string;
  blocks: ReportBlock[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Статус биомаркера (7-сегментная модель проекта)
// ─────────────────────────────────────────────────────────────────────────────

export type BiomarkerStatus =
  | "critical-low"
  | "warning-low"
  | "sub-optimal-low"
  | "optimal"
  | "sub-optimal-high"
  | "warning-high"
  | "critical-high";

export interface ResolvedRange {
  criticalMin: number | null;
  warningMin: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  warningMax: number | null;
  criticalMax: number | null;
}
