import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { notify as toast } from "@/lib/toast";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { ReportDocument, PagedReportPreview } from "@/lib/reportLab/renderer";
import { ReportEditorShell } from "@/lib/reportLab/editor/ReportEditorShell";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const INITIAL_REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

type PdfLogLevel = "info" | "success" | "error";
type PdfLogEntry = {
  id: string;
  time: string;
  level: PdfLogLevel;
  message: string;
  details?: string;
};

type ReadyPdf = {
  url: string;
  file: File;
  filename: string;
  sizeKb: number;
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
  const [paginated, setPaginated] = useState(true);
  const [pdfLogs, setPdfLogs] = useState<PdfLogEntry[]>([]);
  const [readyPdf, setReadyPdf] = useState<ReadyPdf | null>(null);
  const [report, setReport] = useState<ProkhanovReport>(INITIAL_REPORT);
  const readyPdfUrlRef = useRef<string | null>(null);

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
    appendPdfLog("info", "Открываю готовый PDF в отдельной вкладке");
    const opened = window.open(readyPdf.url, "_blank", "noopener");
    if (!opened) {
      appendPdfLog("info", "Popup заблокирован — открываю PDF в текущей вкладке");
      window.location.href = readyPdf.url;
    }
  }, [appendPdfLog, readyPdf]);

  const saveReadyPdf = useCallback(async () => {
    if (!readyPdf) return;

    const canShareFile =
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function" &&
      navigator.canShare({ files: [readyPdf.file] });

    if (canShareFile) {
      appendPdfLog("info", "Открываю share-sheet по отдельному тапу");
      try {
        await navigator.share({
          files: [readyPdf.file],
          title: "ReAge · Персональный отчёт",
          text: `Отчёт от ${report.analysis.date}`,
        });
        appendPdfLog("success", "Файл передан в системный share-sheet");
        toast.success("PDF передан", "Выберите «Сохранить в Файлы» или нужное приложение.");
        return;
      } catch (shareErr) {
        if (shareErr instanceof Error && shareErr.name === "AbortError") {
          appendPdfLog("info", "Пользователь закрыл share-sheet");
          return;
        }
        appendPdfLog("error", "Share-sheet недоступен", formatError(shareErr));
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
    appendPdfLog("success", "Скачивание готового PDF передано браузеру");
  }, [appendPdfLog, readyPdf]);

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
    replaceReadyPdf(null);
    const startedAt = performance.now();
    appendPdfLog("info", "Старт подготовки PDF", "Первый запуск рендерера может занять до 2 минут");

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
      appendPdfLog("info", "POST render-report-pdf", `requestId=${requestId}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportId: "prokhanov", clientRequestId: requestId }),
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
        if (response.status === 504 && body.includes("renderer_timeout")) {
          appendPdfLog(
            "info",
            "Рендерер не успел ответить",
            "Я увеличил серверный лимит ожидания; если Fly только просыпался, повторное нажатие обычно проходит быстрее.",
          );
          throw new Error("Рендерер не успел собрать PDF. Нажмите «Скачать PDF» ещё раз.");
        }
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

      const filename = `reage-report-prokhanov-${report.analysis.date}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      const ua = navigator.userAgent || "";
      const isIOS = /iP(hone|ad|od)/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
      const url = URL.createObjectURL(blob);
      replaceReadyPdf({
        url,
        file,
        filename,
        sizeKb: Math.round(blob.size / 1024),
      });

      if (isIOS) {
        appendPdfLog(
          "info",
          "PDF готов: на iPhone нужен второй тап по кнопке «Сохранить PDF»",
          "Web Share API требует прямой пользовательский жест; после долгого рендера Safari блокирует автозапуск share-sheet.",
        );
        toast.success(
          "PDF готов",
          "Нажмите «Сохранить PDF» в блоке диагностики — откроется системное меню iPhone.",
        );
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      appendPdfLog("success", "Скачивание передано браузеру");
    } catch (e) {
      console.error(e);
      appendPdfLog("error", "Скачивание PDF упало", formatError(e));
      toast.error(
          "PDF не скачался",
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
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <Card className="mb-6 border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          <div>
            Это изолированная песочница нового рендерера отчётов. Источник — один
            JSON-снапшот последнего отчёта Антона Проханова, лежащий в репозитории.
            Боевой кабинет пациента и legacy-PDF не затрагиваются.
          </div>
          <div className="mt-2 text-xs">
            На iPhone Safari откроет PDF во вкладке (WebKit игнорирует
            <code className="mx-1 rounded bg-muted px-1">download</code>) — нажмите ↗
            «Поделиться» → «Сохранить в Файлы». Тёмный фон вокруг листов — это
            встроенный PDF-вьюер Safari в тёмной теме iOS, не сам файл. На маке скачается
            обычным файлом.
          </div>
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
            {readyPdf && (
              <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                <div className="font-medium">PDF готов · {readyPdf.sizeKb} KB</div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" onClick={saveReadyPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Сохранить PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={openReadyPdf}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Открыть PDF
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  На iPhone сохранение должно запускаться отдельным тапом после готовности файла.
                </div>
              </div>
            )}
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
                          ? "text-primary"
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

        {paginated ? (
          <PagedReportPreview report={report} />
        ) : (
          <ReportDocument report={report} />
        )}
      </div>
    </div>
  );
}
