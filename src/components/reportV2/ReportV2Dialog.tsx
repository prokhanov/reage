import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
 * (Beta-иконки в списке).
 */
export function ReportV2Dialog({ open, onOpenChange, analysisId, userId, mode }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none p-0 overflow-hidden sm:h-[90vh] sm:w-[95vw] sm:max-w-6xl sm:rounded-lg flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">
            {mode === "edit" ? "Редактор отчёта · Новый (Beta)" : "Просмотр отчёта · Новый (Beta)"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Экспериментальный рендерер поверх реальных данных пациента.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {analysisId && userId ? (
            <ReportV2Editor analysisId={analysisId} userId={userId} mode={mode} />
          ) : (
            <div className="text-sm text-muted-foreground">Не удалось определить пациента/анализ.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
