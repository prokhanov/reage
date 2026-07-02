import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { notify as toast } from "@/lib/toast";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { ReportDocument } from "@/lib/reportLab/renderer";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

type PdfLogLevel = "info" | "success" | "error";
type PdfLogEntry = {
  id: string;
  time: string;
  level: PdfLogLevel;
  message: string;
  details?: string;
};

function nowLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

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
  const [pdfLogs, setPdfLogs] = useState<PdfLogEntry[]>([]);

  const appendPdfLog = useCallback(
    (level: PdfLogLevel, message: string, details?: string) => {
      setPdfLogs((prev) => [
        ...prev.slice(-39),
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          time: nowLabel(),
          level,
          message,
          details,
        },
      ]);
    },
    [],
  );

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
    setPdfLogs([]);
    const startedAt = performance.now();
    appendPdfLog("info", "Старт скачивания PDF", `reportId=prokhanov`);

    const progressTimer = window.setInterval(() => {
      const seconds = Math.round((performance.now() - startedAt) / 1000);
      appendPdfLog("info", `Ожидание ответа от backend/Fly: ${seconds} сек`);
    }, 15000);

    try {
      appendPdfLog("info", "Проверяю текущую авторизацию");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      appendPdfLog(
        token ? "success" : "error",
        token ? "JWT найден, отправляю запрос в edge-функцию" : "JWT не найден — запрос уйдёт без авторизации",
      );

      const endpoint = edgeFunctionUrl("render-report-pdf");
      const requestId = crypto.randomUUID();
      appendPdfLog("info", "POST render-report-pdf", `requestId=${requestId}\nurl=${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Debug-Request-Id": requestId,
        },
        body: JSON.stringify({ reportId: "prokhanov" }),
      });

      const elapsedMs = Math.round(performance.now() - startedAt);
      appendPdfLog(
        response.ok ? "success" : "error",
        `Ответ edge-функции: HTTP ${response.status} за ${elapsedMs} мс`,
        `content-type=${response.headers.get("content-type") || "—"}`,
      );

      if (!response.ok) {
        const body = await readResponseBody(response);
        appendPdfLog("error", "Тело ошибки от edge-функции", body || "Пустое тело ответа");
        throw new Error(`render-report-pdf вернула HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        const body = await readResponseBody(response);
        appendPdfLog("error", "Ожидался PDF, но пришёл другой content-type", body || contentType);
        throw new Error(`Ожидался application/pdf, пришёл ${contentType || "unknown"}`);
      }

      const blob = await response.blob();
      appendPdfLog("success", "PDF получен", `${Math.round(blob.size / 1024)} KB`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prokhanov-report-${REPORT.analysis.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      appendPdfLog("success", "Скачивание передано браузеру");
    } catch (e) {
      console.error(e);
      appendPdfLog("error", "Скачивание PDF упало", formatError(e));
      toast.error(
        "PDF ещё недоступен",
        formatError(e),
      );
    } finally {
      window.clearInterval(progressTimer);
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

        {pdfLogs.length > 0 && (
          <Card className="mb-6 border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Диагностика PDF</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPdfLogs([])}
                disabled={rendering}
              >
                Очистить
              </Button>
            </div>
            <div className="space-y-2 font-mono text-xs">
              {pdfLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{log.time}</span>
                    <span
                      className={
                        log.level === "success"
                          ? "text-emerald-500"
                          : log.level === "error"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                  {log.details && (
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-muted-foreground">
                      {log.details}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <ReportDocument report={REPORT} />
      </div>
    </div>
  );
}
