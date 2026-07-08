import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReportV2Editor } from "./ReportV2Editor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  userId: string | null;
  mode: "view" | "edit";
}

/**
 * Обёртка над ReportV2Editor для точек входа из «Персональных отчётов»
 * (Beta-иконки в списке). В ЛК пациента и режиме «Просмотр как пациент»
 * используется компактная панель без служебных подписей.
 */
export function ReportV2Dialog({ open, onOpenChange, analysisId, userId, mode }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none p-0 overflow-hidden top-0 left-0 translate-x-0 translate-y-0 sm:h-[95vh] sm:top-2 sm:left-1/2 sm:-translate-x-1/2 sm:translate-y-0 sm:w-[95vw] sm:max-w-6xl sm:rounded-lg flex flex-col">
        <DialogTitle className="sr-only">
          {mode === "edit" ? "Редактор отчёта" : "Просмотр отчёта"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Персонализированный отчёт пациента.
        </DialogDescription>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {analysisId && userId ? (
            <ReportV2Editor analysisId={analysisId} userId={userId} mode={mode} compact />
          ) : (
            <div className="text-sm text-muted-foreground">Не удалось определить пациента/анализ.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
