/**
 * Cover template — глобальный шаблон обложки отчёта.
 *
 * Пока живёт только в памяти страницы `/admin/report-visuals` (без БД).
 * Позже перенесём в отчёт клиента.
 */

import type { ProkhanovReport } from "./types";
import { calcAge, formatRuDate } from "./parser";

export type CoverAlign = "left" | "center" | "right";
export type CoverWeight = 300 | 400 | 500 | 600 | 700;

export interface CoverBlock {
  /** Текст с переменными вида {{patientName}}. Пустая строка = блок скрыт. */
  text: string;
  fontSizePt: number;
  fontWeight: CoverWeight;
  align: CoverAlign;
  /** Отступ сверху, mm. */
  marginTopMm: number;
  /** Курсив (для акцентных строк). */
  italic?: boolean;
  /** Цвет текста; если пусто — берётся глобальный textColor. */
  color?: string;
  /** Uppercase + letter-spacing (eyebrow-стиль). */
  eyebrow?: boolean;
  fontFamily?: "serif" | "sans";
}

export interface CoverTemplate {
  bgColor: string;
  /** CSS gradient, если задан — рендерится поверх bgColor. */
  bgGradient: string;
  textColor: string;
  accentColor: string;
  logoEnabled: boolean;
  logoWidthMm: number;
  logoMarginTopMm: number;

  eyebrow: CoverBlock;
  title: CoverBlock;
  subtitle: CoverBlock;
  patient: CoverBlock;
  date: CoverBlock;
  metaLine: CoverBlock;
  footer: CoverBlock;
}

export const DEFAULT_COVER_TEMPLATE: CoverTemplate = {
  bgColor: "#0f1b2d",
  bgGradient:
    "radial-gradient(120% 65% at 50% 0%, #1c2f47 0%, #0f1b2d 55%, #0a1220 100%)",
  textColor: "#f6f0e0",
  accentColor: "#d9c396",
  logoEnabled: true,
  logoWidthMm: 42,
  logoMarginTopMm: 26,

  eyebrow: {
    text: "Персональный отчёт",
    fontSizePt: 10,
    fontWeight: 500,
    align: "center",
    marginTopMm: 14,
    eyebrow: true,
    fontFamily: "sans",
  },
  title: {
    text: "{{patientName}}",
    fontSizePt: 40,
    fontWeight: 400,
    align: "center",
    marginTopMm: 6,
    fontFamily: "serif",
  },
  subtitle: {
    text: "биологический профиль",
    fontSizePt: 20,
    fontWeight: 400,
    align: "center",
    marginTopMm: 2,
    italic: true,
    fontFamily: "serif",
  },
  patient: {
    text: "Выпуск №{{issueNumber}}",
    fontSizePt: 10,
    fontWeight: 500,
    align: "center",
    marginTopMm: 22,
    eyebrow: true,
    fontFamily: "sans",
  },
  date: {
    text: "{{date}}",
    fontSizePt: 12,
    fontWeight: 500,
    align: "center",
    marginTopMm: 4,
    fontFamily: "sans",
  },
  metaLine: {
    text: "Возраст {{age}} · Био-возраст {{bioAge}} · Индекс {{healthIndex}}",
    fontSizePt: 11,
    fontWeight: 400,
    align: "center",
    marginTopMm: 18,
    fontFamily: "sans",
  },
  footer: {
    text: "ReAge · Longevity clinic",
    fontSizePt: 9,
    fontWeight: 500,
    align: "center",
    marginTopMm: 0,
    eyebrow: true,
    fontFamily: "sans",
  },
};

export const COVER_VARIABLES: { key: string; label: string }[] = [
  { key: "patientName", label: "Имя пациента" },
  { key: "date", label: "Дата анализа" },
  { key: "age", label: "Возраст" },
  { key: "bioAge", label: "Био-возраст" },
  { key: "healthIndex", label: "Индекс здоровья" },
  { key: "markerCount", label: "Кол-во биомаркеров" },
  { key: "issueNumber", label: "Номер выпуска" },
];

export function buildCoverVars(report: ProkhanovReport): Record<string, string> {
  const { patient, analysis, biomarkers } = report;
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");
  const age = calcAge(patient.birth_date, analysis.date);
  const bioAge =
    analysis.biological_age !== null
      ? analysis.biological_age.toFixed(1)
      : "—";
  return {
    patientName: fullName || "—",
    date: formatRuDate(analysis.date),
    age: age !== null ? `${age}` : "—",
    bioAge,
    healthIndex:
      analysis.health_index !== null ? `${analysis.health_index}` : "—",
    markerCount: `${biomarkers.length}`,
    issueNumber: analysis.id.replace(/-/g, "").slice(0, 6).toUpperCase(),
  };
}

export function renderTemplateVars(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{{${k}}}`,
  );
}
