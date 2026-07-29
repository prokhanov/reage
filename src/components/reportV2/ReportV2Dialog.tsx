import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ReportV2Editor } from "./ReportV2Editor";
import type { LabReport } from "@/lib/reportLab/types";
import { useReportPdf } from "@/hooks/useReportPdf";
import { ReportPdfView } from "./ReportPdfView";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  userId: string | null;
  mode: "view" | "edit";
  /**
   * Если задан — рендерер использует этот отчёт вместо загрузки из БД
   * (для демо-режима, где данных в БД нет).
   */
  initialReport?: LabReport;
  /** Скрыть кнопку «Скачать PDF» (используется в демо, где нет auth-сессии). */
  hideDownload?: boolean;
  /** ЛК пациента: показывать только опубликованный врачом отчёт. */
  requirePublished?: boolean;
  /**
   * Режим «Просмотр как пациент» у персонала: в view-режиме показываем тот же
   * финальный PDF, что видит пациент (через issue-report-pdf-url).
   */
  staffPdfPreview?: boolean;
}

/**
 * Обёртка над ReportV2Editor для точек входа из «Персональных отчётов»
 * (Beta-иконки в списке). В ЛК пациента и режиме «Просмотр как пациент»
 * используется компактная панель без служебных подписей.
 */
export function ReportV2Dialog({ open, onOpenChange, analysisId, userId, mode, initialReport, hideDownload, requirePublished, staffPdfPreview }: Props) {
  const hasSource = initialReport || (analysisId && userId);
  // В ЛК пациента показываем серверный PDF, если он уже собран; пока рендер
  // не готов — остаётся привычный HTML-просмотр (без «пустого экрана»).
  const patientPdf = useReportPdf(
    requirePublished && !initialReport ? analysisId : null,
    "patient",
  );
  const patientPdfReady = Boolean(requirePublished && !initialReport && patientPdf.url);

  // Персонал в режиме «Просмотр как пациент» — тот же финальный PDF.
  const staffMode = Boolean(staffPdfPreview && !requirePublished && !initialReport && mode === "view");
  const [forceDraftHtml, setForceDraftHtml] = useState(false);
  const staffPdf = useReportPdf(staffMode ? analysisId : null, "staff");
  const staffPdfReady = Boolean(staffMode && staffPdf.url && !forceDraftHtml);
  const staffPdfPending = Boolean(
    staffMode && !staffPdf.url && !forceDraftHtml && (staffPdf.loading || staffPdf.notReady || staffPdf.error),
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);


  const requestClose = () => {
    if (mode === "edit") {
      const w = window as typeof window & { __reportV2HasEdits?: () => boolean };
      const hasEdits = w.__reportV2HasEdits?.() ?? false;
      if (hasEdits) {
        setConfirmOpen(true);
        return;
      }
    }
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      requestClose();
      return;
    }
    onOpenChange(next);
  };

  const discardAndClose = () => {
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const saveAndClose = async () => {
    const w = window as typeof window & { __reportV2Save?: () => Promise<void> };
    if (!w.__reportV2Save) {
      discardAndClose();
      return;
    }
    setSaving(true);
    try {
      await w.__reportV2Save();
      setConfirmOpen(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          hideCloseButton
          className="h-[100dvh] w-screen max-w-none rounded-none p-0 overflow-hidden top-0 left-0 translate-x-0 translate-y-0 sm:h-[95vh] sm:top-2 sm:left-1/2 sm:-translate-x-1/2 sm:translate-y-0 sm:w-[95vw] sm:max-w-6xl sm:rounded-lg flex flex-col"
          onInteractOutside={(e) => {
            if (mode === "edit") {
              e.preventDefault();
              requestClose();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (mode === "edit") {
              e.preventDefault();
              requestClose();
            }
          }}
        >
          <DialogTitle className="sr-only">
            {mode === "edit" ? "Редактор отчёта" : "Просмотр отчёта"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Персонализированный отчёт пациента.
          </DialogDescription>
          <div className="flex-1 overflow-auto p-0 sm:p-4 min-h-0">
            {hasSource ? (
              patientPdfReady ? (
                // Пациент видит серверный PDF — единый источник пагинации.
                <ReportPdfView analysisId={analysisId!} persona="patient" />
              ) : staffPdfReady ? (
                // Персонал в «Просмотре как пациент» — тот же финальный PDF.
                <ReportPdfView analysisId={analysisId!} persona="staff" />
              ) : staffPdfPending ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                  {staffPdf.loading ? (
                    <p className="text-sm text-muted-foreground">Загружаем опубликованный PDF…</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Отчёт ещё не опубликован — финального PDF для показа нет.
                      </p>
                      {staffPdf.error && (
                        <p className="text-xs text-destructive">{staffPdf.error}</p>
                      )}
                      <Button variant="outline" onClick={() => setForceDraftHtml(true)}>
                        Открыть черновик (с предпросмотром PDF)
                      </Button>
                    </>
                  )}
                </div>
              ) : (

              <ReportV2Editor
                analysisId={initialReport?.analysis.id ?? analysisId ?? "demo"}
                userId={userId ?? "demo"}
                mode={mode}
                compact
                onClose={requestClose}
                initialReport={initialReport}
                hideDownload={hideDownload}
                requirePublished={requirePublished}
              />
              )
            ) : (
              <div className="text-sm text-muted-foreground">Не удалось определить пациента/анализ.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Закрыть редактор отчёта?</AlertDialogTitle>
            <AlertDialogDescription>
              У вас есть несохранённые изменения. Сохранить их перед закрытием?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={saving}>Отмена</AlertDialogCancel>
            <Button variant="outline" onClick={discardAndClose} disabled={saving}>
              Не сохранять
            </Button>
            <AlertDialogAction onClick={saveAndClose} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить и закрыть"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
