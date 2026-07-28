/**
 * Доступ к `report_documents` — сохранённому документу отчёта.
 *
 * Пациенту RLS отдаёт только опубликованные документы; врач/админ видят и
 * правят любые. Черновик ИИ (`recommendations.text`) этот модуль не трогает.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ReportDoc, ReportDocStatus, DocEntry } from "./document";
import { REPORT_DOC_VERSION } from "./document";

interface ReportDocumentRow {
  id: string;
  analysis_id: string;
  user_id: string;
  blocks: unknown;
  status: string;
  published_at: string | null;
  edited_at: string | null;
}

export interface LoadedReportDocument {
  doc: ReportDoc;
  status: ReportDocStatus;
  publishedAt: string | null;
  editedAt: string | null;
}

// Локальные generated types могут не знать о новой таблице.
const table = () => (supabase as unknown as { from: (t: string) => any }).from("report_documents");

function rowToDoc(row: ReportDocumentRow): LoadedReportDocument | null {
  const blocks = row.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return {
    doc: {
      version: REPORT_DOC_VERSION,
      builtAt: row.edited_at ?? row.published_at ?? new Date().toISOString(),
      entries: blocks as DocEntry[],
    },
    status: (row.status as ReportDocStatus) ?? "draft",
    publishedAt: row.published_at,
    editedAt: row.edited_at,
  };
}

export async function fetchReportDocument(
  analysisId: string,
): Promise<LoadedReportDocument | null> {
  if (!analysisId) return null;
  const { data, error } = await table()
    .select("id, analysis_id, user_id, blocks, status, published_at, edited_at")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (error) {
    // Отсутствие прав (пациент до публикации) — не ошибка приложения.
    console.warn("[reportLab] fetchReportDocument:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToDoc(data as ReportDocumentRow);
}

/** Создаёт документ, если его ещё нет (ленивая миграция старых отчётов). */
export async function ensureReportDocument(
  analysisId: string,
  userId: string,
  doc: ReportDoc,
): Promise<ReportDocStatus | null> {
  const { data, error } = await table()
    .upsert(
      {
        analysis_id: analysisId,
        user_id: userId,
        blocks: doc.entries,
        status: "draft",
      },
      { onConflict: "analysis_id", ignoreDuplicates: true },
    )
    .select("status")
    .maybeSingle();
  if (error) {
    console.warn("[reportLab] ensureReportDocument:", error.message);
    return null;
  }
  return ((data?.status as ReportDocStatus) ?? "draft") as ReportDocStatus;
}

/** Сохраняет правки врача. Опубликованный документ переходит в состояние `edited`. */
export async function saveReportDocument(
  analysisId: string,
  userId: string,
  doc: ReportDoc,
  currentStatus: ReportDocStatus | null | undefined,
): Promise<ReportDocStatus> {
  const nextStatus: ReportDocStatus =
    currentStatus === "published" || currentStatus === "edited" ? "edited" : "draft";
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await table().upsert(
    {
      analysis_id: analysisId,
      user_id: userId,
      blocks: doc.entries,
      status: nextStatus,
      edited_at: new Date().toISOString(),
      edited_by: authData.user?.id ?? null,
    },
    { onConflict: "analysis_id" },
  );
  if (error) throw error;
  return nextStatus;
}

/** Полная перезапись документа после перегенерации (ручные правки теряются). */
export async function replaceReportDocument(
  analysisId: string,
  userId: string,
  doc: ReportDoc,
  currentStatus: ReportDocStatus | null | undefined,
): Promise<ReportDocStatus> {
  return saveReportDocument(analysisId, userId, doc, currentStatus);
}

export async function publishReportDocument(analysisId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await table()
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_by: authData.user?.id ?? null,
    })
    .eq("analysis_id", analysisId);
  if (error) throw error;
}
