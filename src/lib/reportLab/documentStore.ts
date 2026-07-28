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
  published_blocks?: unknown;
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

function rowToDoc(row: ReportDocumentRow, published: boolean): LoadedReportDocument | null {
  const blocks = published ? row.published_blocks : row.blocks;
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

/**
 * @param published — читать опубликованный снимок (`published_blocks`).
 *   Пациенту доступен только он; врач/админ работают с рабочей версией.
 */
export async function fetchReportDocument(
  analysisId: string,
  published = false,
): Promise<LoadedReportDocument | null> {
  if (!analysisId) return null;
  const { data, error } = await table()
    .select(
      "id, analysis_id, user_id, blocks, published_blocks, status, published_at, edited_at",
    )
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    const message = error.message ?? "";
    const isPermission =
      code === "42501" || /permission denied|row-level security/i.test(message);
    if (isPermission) {
      // Явно пробрасываем: у пользователя нет прав на документ отчёта.
      console.error("[reportLab] fetchReportDocument: доступ запрещён", message);
      throw new Error("Нет прав на просмотр документа отчёта");
    }
    console.warn("[reportLab] fetchReportDocument:", message);
    return null;
  }
  if (!data) return null;
  return rowToDoc(data as ReportDocumentRow, published);
}


/**
 * Статус документа без доступа к содержимому — пациент так узнаёт, что отчёт
 * существует, но ещё не опубликован врачом. `null` — документа нет вовсе
 * (старый отчёт, рендерится по прежней схеме).
 */
export async function fetchReportDocumentStatus(
  analysisId: string,
): Promise<ReportDocStatus | null> {
  if (!analysisId) return null;
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc("report_document_status", { p_analysis_id: analysisId });
  if (error || !data) return null;
  return data as ReportDocStatus;
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

/**
 * Публикация: рабочая версия копируется в снимок `published_blocks` —
 * именно его видит пациент. Дальнейшие правки врача снова становятся
 * черновиком и на пациента не влияют до следующей публикации.
 */
export async function publishReportDocument(analysisId: string, doc?: ReportDoc): Promise<void> {
  const blocks = doc?.entries;
  const { data: updated, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message?: string; details?: string; code?: string } | null }>;
  }).rpc("publish_report_document", {
    p_analysis_id: analysisId,
    p_blocks: blocks ?? null,
  });
  if (error) {
    const code = error.code ? ` [${error.code}]` : "";
    throw new Error(`${error.message ?? "Ошибка публикации"}${code}`);
  }
  if (!updated) {
    throw new Error(
      "Публикация не выполнена: документ отчёта не найден или нет прав на его изменение",
    );
  }
  // Контроль результата: пациент читает published_blocks — убеждаемся, что
  // снимок действительно записан и не пустой.
  const { data: row, error: checkError } = await table()
    .select("status, published_at, published_blocks")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (checkError) return;
  const published = (row as { published_blocks?: unknown } | null)?.published_blocks;
  if (!Array.isArray(published) || published.length === 0) {
    throw new Error("Публикация не сохранилась: опубликованная версия пуста");
  }
}

