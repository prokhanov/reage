import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { notify as toast } from "@/lib/toast";
import { ReportDocument } from "@/lib/reportLab/renderer";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

/**
 * /admin/report-visuals — песочница нового поколения PDF-отчёта.
 *
 * Живёт в полной изоляции от боевого пайплайна:
 *   - Источник данных: замороженный JSON-снапшот отчёта Проханова
 *     (src/data/prokhanovReport.json). Никаких запросов к БД.
 *   - Рендерер: src/lib/reportLab/*. Не зависит ни от anchorParser,
 *     ни от snapshotRenderer, ни от pdfmake.
 *   - PDF: Playwright на Fly.io (deploy/report-renderer). До первого деплоя
 *     кнопка «Скачать PDF» вернёт понятную ошибку.
 */
export default function ReportVisualsTest() {
  const [minting, setMinting] = useState(false);
  const [rendering, setRendering] = useState(false);

  const patientLabel = useMemo(
    () =>
      [REPORT.patient.first_name, REPORT.patient.last_name]
        .filter(Boolean)
        .join(" ") + " · " + REPORT.analysis.date,
    [],
  );

  async function openCleanPreview() {
    setMinting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "mint-preview-token",
        { body: { reportId: "prokhanov" } },
      );
      if (error) throw error;
      const payload = data as { url?: string; token?: string } | null;
      if (!payload?.url) throw new Error("Пустой ответ от mint-preview-token");
      window.open(payload.url, "_blank", "noopener");
    } catch (e) {
      console.error(e);
      toast.error(
        "Не удалось открыть preview",
        e instanceof Error ? e.message : "Проверьте, что edge-функция задеплоена",
      );
    } finally {
      setMinting(false);
    }
  }

  async function downloadPdf() {
    setRendering(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "render-report-pdf",
        { body: { reportId: "prokhanov" } },
      );
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prokhanov-report-${REPORT.analysis.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast({
        title: "PDF ещё недоступен",
        description:
          "Fly-рендерер не задеплоен или недоступен. См. deploy/report-renderer/README.md",
      });
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Report Lab · Sandbox
            </div>
            <div className="text-sm font-medium">{patientLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openCleanPreview}
              disabled={minting}
            >
              {minting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Открыть в чистом виде
            </Button>
            <Button size="sm" onClick={downloadPdf} disabled={rendering}>
              {rendering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Скачать PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <Card className="mb-6 border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          Это изолированная песочница нового рендерера отчётов. Источник — один
          JSON-снапшот последнего отчёта Антона Проханова, лежащий в репозитории.
          Боевой кабинет пациента и legacy-PDF не затрагиваются. Итерации по
          вёрстке — прямо здесь.
        </Card>

        <ReportDocument report={REPORT} />
      </div>
    </div>
  );
}
