import { Suspense, lazy, useMemo } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildLabReportFromExample } from "@/lib/reportLab/buildFromExample";

const ReportV2Editor = lazy(() =>
  import("@/components/reportV2/ReportV2Editor").then((m) => ({ default: m.ReportV2Editor })),
);

/**
 * Модалка с демо-отчётом Елены Ивановой — тот же отчёт, что на /demo-report.
 */
export function DemoReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const report = useMemo(() => (open ? buildLabReportFromExample() : null), [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[80rem] flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Пример отчёта ReAge</DialogTitle>
        <DialogDescription className="sr-only">
          Демонстрационный персональный отчёт пациентки Елены Ивановой.
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col">
          {report && (
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
                </div>
              }
            >
              <ReportV2Editor
                analysisId={report.analysis.id}
                userId="demo"
                mode="view"
                compact
                hideDownload
                hideToolbar
                fullHeight
                initialReport={report}
              />
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
