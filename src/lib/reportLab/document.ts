/**
 * Report Document — сохранённый структурированный отчёт.
 *
 * Ключевая идея: парсер (`parser.ts`) запускается РОВНО ОДИН РАЗ — в момент
 * сборки документа. Дальше отчёт живёт как набор блоков (`DocEntry[]`),
 * который хранится в `report_documents.blocks`, рендерится теми же самыми
 * компонентами (визуально — байт в байт как раньше) и редактируется
 * поблочно, без обратной конверсии HTML → markdown.
 *
 * Черновик ИИ (`recommendations.text`) остаётся нетронутым и нужен только
 * для перегенерации.
 */

import { buildBiomarkerIndex, getCategoryRecords, parseCategory } from "./parser";
import type { LabReport, ReportBlock } from "./types";

export const REPORT_DOC_VERSION = 2 as const;

/** Раздел системы: заголовок + чередование prose/карточек биомаркеров. */
export interface DocSectionEntry {
  kind: "section";
  /** Стабильный id = id строки recommendations, из которой раздел собран. */
  id: string;
  type: string;
  title: string;
  blocks: ReportBlock[];
}

/** Одиночное тело: «Данные пациента», «Общее резюме», «Назначения». */
export interface DocBodyEntry {
  kind: "body";
  id: string;
  type: string;
  body: string;
  /** Правка врача, сохранённая как готовая разметка (приоритет над `body`). */
  bodyHtml?: string;
  contentJson?: unknown;
}

export type DocEntry = DocSectionEntry | DocBodyEntry;

export interface ReportDoc {
  version: typeof REPORT_DOC_VERSION;
  builtAt: string;
  entries: DocEntry[];
}

export type ReportDocStatus = "draft" | "published" | "edited";

// ─────────────────────────────────────────────────────────────────────────────
// Сборка
// ─────────────────────────────────────────────────────────────────────────────

const PATIENT_TYPE = "Данные пациента";
const SUMMARY_TYPE = "Общее резюме";
const PRESCRIPTIONS_TYPE = "Назначения";

/**
 * Собирает документ из «сырого» LabReport (черновик ИИ + данные БД).
 * Здесь и только здесь вызывается `parseCategory`.
 */
export function buildDocFromReport(report: LabReport): ReportDoc {
  const biomarkerByCode = buildBiomarkerIndex(report);
  const entries: DocEntry[] = [];

  const byType = (type: string) =>
    report.recommendations.find(
      (r) => (r.type || "").trim().toLowerCase() === type.toLowerCase(),
    );

  const patient = byType(PATIENT_TYPE);
  if (patient) {
    entries.push({
      kind: "body",
      id: patient.id,
      type: patient.type,
      body: patient.text || "",
      contentJson: patient.content_json ?? null,
    });
  }

  const summary = byType(SUMMARY_TYPE);
  if (summary) {
    entries.push({
      kind: "body",
      id: summary.id,
      type: summary.type,
      body: summary.text || "",
      contentJson: summary.content_json ?? null,
    });
  }

  for (const rec of getCategoryRecords(report)) {
    const parsed = parseCategory(rec.type, rec.text || "", biomarkerByCode);
    entries.push({
      kind: "section",
      id: rec.id,
      type: rec.type,
      title: parsed.title,
      blocks: parsed.blocks,
    });
  }

  const prescriptions = byType(PRESCRIPTIONS_TYPE);
  if (prescriptions) {
    entries.push({
      kind: "body",
      id: prescriptions.id,
      type: prescriptions.type,
      body: prescriptions.text || "",
      contentJson: prescriptions.content_json ?? null,
    });
  }

  return {
    version: REPORT_DOC_VERSION,
    builtAt: new Date().toISOString(),
    entries,
  };
}

/** Документ отчёта: сохранённый, либо собранный на лету (ленивая миграция). */
export function resolveDoc(report: LabReport): ReportDoc {
  if (report.doc && Array.isArray(report.doc.entries) && report.doc.entries.length > 0) {
    return report.doc;
  }
  return buildDocFromReport(report);
}

export function findBodyEntry(doc: ReportDoc, type: string): DocBodyEntry | undefined {
  return doc.entries.find(
    (e): e is DocBodyEntry =>
      e.kind === "body" && (e.type || "").trim().toLowerCase() === type.toLowerCase(),
  );
}

export function getPatientEntry(doc: ReportDoc) {
  return findBodyEntry(doc, PATIENT_TYPE);
}
export function getSummaryEntry(doc: ReportDoc) {
  return findBodyEntry(doc, SUMMARY_TYPE);
}
export function getPrescriptionsEntry(doc: ReportDoc) {
  return findBodyEntry(doc, PRESCRIPTIONS_TYPE);
}
export function getSectionEntries(doc: ReportDoc): DocSectionEntry[] {
  return doc.entries.filter((e): e is DocSectionEntry => e.kind === "section");
}

// ─────────────────────────────────────────────────────────────────────────────
// Применение правок редактора
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ключи драфтов (формат не менялся — редактор адресует блоки, а не текст):
 *   rec:<id>#body        — одиночное тело
 *   rec:<id>#prose:<n>   — n-й prose-блок раздела
 *   rec:<id>#bio:<code>  — комментарий к биомаркеру
 *   rec:<id>#insert:<n>  — новый текстовый блок перед n-й карточкой биомаркера
 */
export function applyDraftsToDoc(
  doc: ReportDoc,
  drafts: Record<string, string>,
): { doc: ReportDoc; changed: boolean } {
  const keys = Object.keys(drafts);
  if (keys.length === 0) return { doc, changed: false };

  let changed = false;

  const entries = doc.entries.map((entry): DocEntry => {
    const prefix = `rec:${entry.id}#`;
    const own = keys.filter((k) => k.startsWith(prefix));
    if (own.length === 0) return entry;

    if (entry.kind === "body") {
      const draft = drafts[`${prefix}body`];
      if (draft === undefined) return entry;
      const next = draft.trim();
      if (next === (entry.body || "").trim()) return entry;
      changed = true;
      // Ручная правка «побеждает» структурный снапшот content_json,
      // иначе часть блоков при рендере снова берётся из старого JSON.
      return { ...entry, body: next, contentJson: null };
    }

    // section
    let proseIndex = 0;
    let bioIndex = 0;
    const nextBlocks: ReportBlock[] = [];
    let sectionChanged = false;

    const pushInsert = (index: number) => {
      const raw = drafts[`${prefix}insert:${index}`];
      if (raw === undefined) return;
      const md = raw.trim();
      if (!md) return;
      nextBlocks.push({ kind: "prose", markdown: md });
      sectionChanged = true;
    };

    for (const block of entry.blocks) {
      if (block.kind === "prose") {
        const key = `${prefix}prose:${proseIndex}`;
        proseIndex += 1;
        const draft = drafts[key];
        if (draft !== undefined && draft.trim() !== block.markdown.trim()) {
          sectionChanged = true;
          const md = draft.trim();
          // Пустой prose-блок = пользователь стёр текст → блок исчезает.
          if (md) nextBlocks.push({ kind: "prose", markdown: md });
          continue;
        }
        nextBlocks.push(block);
        continue;
      }

      pushInsert(bioIndex);
      bioIndex += 1;

      const key = `${prefix}bio:${block.code}`;
      const draft = drafts[key];
      if (draft !== undefined && draft.trim() !== (block.commentary || "").trim()) {
        sectionChanged = true;
        nextBlocks.push({ ...block, commentary: draft.trim() });
      } else {
        nextBlocks.push(block);
      }
    }

    // Слот после последней карточки.
    pushInsert(bioIndex);

    if (!sectionChanged) return entry;
    changed = true;
    return { ...entry, blocks: nextBlocks };
  });

  if (!changed) return { doc, changed: false };
  return { doc: { ...doc, entries }, changed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Синхронизация блока «Назначения» с записями ЛК
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Обновляет блок «Назначения» в документе из свежих данных `recommendations`.
 * Нужен после правок рекомендаций в разделе ЛК (или из отчёта): нутрицевтики
 * и advisory-блоки — общие записи, отчёт обязан показывать их актуальную версию.
 */
export function syncPrescriptionsEntry(doc: ReportDoc, report: LabReport): ReportDoc {
  const rec = report.recommendations.find(
    (r) => (r.type || "").trim().toLowerCase() === PRESCRIPTIONS_TYPE.toLowerCase(),
  );
  if (!rec) return doc;

  let found = false;
  const entries = doc.entries.map((e): DocEntry => {
    if (e.kind !== "body") return e;
    if ((e.type || "").trim().toLowerCase() !== PRESCRIPTIONS_TYPE.toLowerCase()) return e;
    found = true;
    // contentJson === null означает «врач переписал блок вручную» —
    // такие правки не затираем данными из recommendations.
    if (e.contentJson === null) return e;
    return { ...e, id: rec.id, body: rec.text || "", contentJson: rec.content_json ?? null };

  });

  if (!found) {
    entries.push({
      kind: "body",
      id: rec.id,
      type: rec.type,
      body: rec.text || "",
      contentJson: rec.content_json ?? null,
    });
  }

  return { ...doc, entries };
}
