import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { notify as toast } from "@/lib/toast";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { ReportDocument, PagedReportPreview } from "@/lib/reportLab/renderer";
import { ReportEditorShell } from "@/lib/reportLab/editor/ReportEditorShell";
import { useReportEditor } from "@/lib/reportLab/editor/ReportEditorContext";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const INITIAL_REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

type ReadyPdf = {
  url: string;
  file: File;
  filename: string;
  sizeKb: number;
};

function formatError(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await response.json().catch(() => null);
    return JSON.stringify(json, null, 2);
  }
  return (await response.text().catch(() => "")).slice(0, 2000);
}

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
  const [paginated, setPaginated] = useState(true);
  const [readyPdf, setReadyPdf] = useState<ReadyPdf | null>(null);
  const [report, setReport] = useState<ProkhanovReport>(INITIAL_REPORT);
  const readyPdfUrlRef = useRef<string | null>(null);

  const patientLabel = useMemo(
    () =>
      [report.patient.first_name, report.patient.last_name]
        .filter(Boolean)
        .join(" ") + " · " + report.analysis.date,
    [report],
  );

  const replaceReadyPdf = useCallback((next: ReadyPdf | null) => {
    if (readyPdfUrlRef.current && readyPdfUrlRef.current !== next?.url) {
      URL.revokeObjectURL(readyPdfUrlRef.current);
    }
    readyPdfUrlRef.current = next?.url ?? null;
    setReadyPdf(next);
  }, []);

  useEffect(() => {
    return () => {
      if (readyPdfUrlRef.current) URL.revokeObjectURL(readyPdfUrlRef.current);
    };
  }, []);

  const openReadyPdf = useCallback(() => {
    if (!readyPdf) return;
    const opened = window.open(readyPdf.url, "_blank", "noopener");
    if (!opened) window.location.href = readyPdf.url;
  }, [readyPdf]);

  const saveReadyPdf = useCallback(async () => {
    if (!readyPdf) return;

    const canShareFile =
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function" &&
      navigator.canShare({ files: [readyPdf.file] });

    if (canShareFile) {
      try {
        await navigator.share({
          files: [readyPdf.file],
          title: "ReAge · Персональный отчёт",
          text: `Отчёт от ${report.analysis.date}`,
        });
        toast.success("PDF передан", "Выберите «Сохранить в Файлы» или нужное приложение.");
        return;
      } catch (shareErr) {
        if (shareErr instanceof Error && shareErr.name === "AbortError") return;
        toast.info(
          "Откройте PDF",
          "Если системное сохранение заблокировано, нажмите «Открыть PDF» и сохраните через ↗.",
        );
      }
    }

    const a = document.createElement("a");
    a.href = readyPdf.url;
    a.download = readyPdf.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [readyPdf, report.analysis.date]);

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
    replaceReadyPdf(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const endpoint = edgeFunctionUrl("render-report-pdf");
      const requestId = crypto.randomUUID();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportId: "prokhanov", clientRequestId: requestId }),
      });

      if (!response.ok) {
        const body = await readResponseBody(response);
        if (response.status === 504 && body.includes("renderer_timeout")) {
          throw new Error("Рендерер не успел собрать PDF. Нажмите «Скачать PDF» ещё раз.");
        }
        throw new Error(`render-report-pdf вернула HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error(`Ожидался application/pdf, пришёл ${contentType || "unknown"}`);
      }

      const blob = await response.blob();
      const filename = `reage-report-prokhanov-${report.analysis.date}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      replaceReadyPdf({ url, file, filename, sizeKb: Math.round(blob.size / 1024) });

      const ua = navigator.userAgent || "";
      const isIOS = /iP(hone|ad|od)/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
      if (isIOS) {
        toast.success(
          "PDF готов",
          "Нажмите «Сохранить готовый» в шапке — откроется системное меню iPhone.",
        );
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      toast.error("PDF не скачался", formatError(e));
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Report Lab · Sandbox
            </div>
            <div className="text-sm font-medium">{patientLabel}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              variant={paginated ? "default" : "outline"}
              size="sm"
              onClick={() => setPaginated((v) => !v)}
              title="Переключить между постраничным (как в PDF) и потоковым превью"
            >
              {paginated ? "Постранично" : "Потоком"}
            </Button>
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
            {readyPdf && !rendering && (
              <Button size="sm" variant="secondary" onClick={saveReadyPdf}>
                <Download className="mr-2 h-4 w-4" />
                Сохранить готовый
              </Button>
            )}
            {readyPdf && !rendering && (
              <Button size="sm" variant="outline" onClick={openReadyPdf}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Открыть PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <ReportEditorShell report={report} onReportUpdate={setReport}>
          {({ mode }) => (
            <EditablePagedPreview
              report={report}
              paginated={paginated}
              editable={mode === "edit"}
            />
          )}
        </ReportEditorShell>
      </div>
    </div>
  );
}

const EMPTY_DRAFTS: Record<string, string> = Object.freeze({}) as Record<string, string>;

function EditablePagedPreview({
  report,
  paginated,
  editable,
}: {
  report: ProkhanovReport;
  paginated: boolean;
  editable: boolean;
}) {
  const ctx = useReportEditor();
  if (!paginated) return <ReportDocument report={report} />;
  return (
    <PagedReportPreview
      report={report}
      editable={editable}
      drafts={ctx?.drafts ?? EMPTY_DRAFTS}
      onEditChange={(id, md) => ctx?.setDraft(id, md)}
    />
  );
}
