import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { notify as toast } from "@/lib/toast";
import { PagedReportPreview, ReportDocument } from "@/lib/reportLab/renderer";
import { ReportEditorShell } from "@/lib/reportLab/editor/ReportEditorShell";
import { useReportEditor } from "@/lib/reportLab/editor/ReportEditorContext";
import { assembleRecommendationText } from "@/lib/reportLab/editor/assemble";
import { buildLabReportFromDb } from "@/lib/reportLab/buildFromDb";
import type { LabReport } from "@/lib/reportLab/types";

interface Props {
  analysisId: string;
  userId: string;
  /** view = превью без редактора; edit = превью с ReportEditorShell (persist). */
  mode: "view" | "edit";
  /** Колбэк после успешного сейва — чтобы родитель мог перечитать данные. */
  onSaved?: () => void;
}

const EMPTY_DRAFTS: Record<string, string> = Object.freeze({}) as Record<string, string>;

function collectLiveDrafts(): Record<string, string> {
  const w = window as typeof window & {
    __reportLabCollectDrafts?: () => Record<string, string>;
  };
  return w.__reportLabCollectDrafts?.() ?? {};
}

function applyDraftsToReport(source: LabReport, drafts: Record<string, string>): LabReport {
  if (Object.keys(drafts).length === 0) return source;
  return {
    ...source,
    generatedAt: new Date().toISOString(),
    recommendations: source.recommendations.map((rec) => ({
      ...rec,
      text: assembleRecommendationText(rec, drafts),
    })),
  };
}

/**
 * Общее ядро v2-редактора отчёта.
 *
 * Реальные данные пациента подгружаются `buildLabReportFromDb` при каждом монтировании.
 * В mode="edit" оборачиваем превью в `ReportEditorShell` (persist=true → пишет в те же
 * `recommendations.text`, что и классический редактор).
 */
export function ReportV2Editor({ analysisId, userId, mode, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<LabReport | null>(null);
  const [paginated, setPaginated] = useState(true);
  const [rendering, setRendering] = useState(false);
  const readyUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    buildLabReportFromDb(analysisId, userId)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[ReportV2Editor] buildLabReportFromDb failed", e);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId, userId]);

  useEffect(() => {
    return () => {
      if (readyUrlRef.current) URL.revokeObjectURL(readyUrlRef.current);
    };
  }, []);

  const patientLabel = useMemo(() => {
    if (!report) return "";
    return (
      [report.patient.first_name, report.patient.last_name].filter(Boolean).join(" ") +
      " · " +
      report.analysis.date
    );
  }, [report]);

  const handleReportUpdate = useCallback(
    (next: LabReport) => {
      setReport(next);
      onSaved?.();
    },
    [onSaved],
  );

  const downloadPdf = useCallback(async () => {
    if (!report) return;
    setRendering(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const liveDrafts = collectLiveDrafts();
      const reportForPdf = applyDraftsToReport(report, liveDrafts);

      const endpoint = edgeFunctionUrl("render-report-pdf");
      const requestId = crypto.randomUUID();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId: `analysis-${analysisId}`,
          clientRequestId: requestId,
          report: reportForPdf,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(
          `render-report-pdf вернула HTTP ${response.status}. ${bodyText.slice(0, 300)}`,
        );
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(`Ожидался PDF, пришёл ${contentType || "unknown"}. ${bodyText.slice(0, 200)}`);
      }
      const blob = await response.blob();
      const filename = `reage-report-${analysisId}-${reportForPdf.analysis.date}.pdf`;
      if (readyUrlRef.current) URL.revokeObjectURL(readyUrlRef.current);
      const url = URL.createObjectURL(blob);
      readyUrlRef.current = url;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("PDF готов", `${Math.round(blob.size / 1024)} KB`);
    } catch (e) {
      console.error("[ReportV2Editor] downloadPdf failed", e);
      toast.error("PDF не скачался", e instanceof Error ? e.message : String(e));
    } finally {
      setRendering(false);
    }
  }, [analysisId, report]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <div className="text-sm">Собираю отчёт из данных пациента…</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertDescription>
          Не удалось собрать отчёт: {error ?? "нет данных"}
        </AlertDescription>
      </Alert>
    );
  }

  const toolbar = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Новый рендерер (Beta)</span> · {patientLabel}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={paginated ? "default" : "outline"}
          size="sm"
          onClick={() => setPaginated((v) => !v)}
        >
          {paginated ? "Постранично" : "Потоком"}
        </Button>
        <Button size="sm" variant="outline" onClick={downloadPdf} disabled={rendering}>
          {rendering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Скачать PDF (v2)
        </Button>
      </div>
    </div>
  );

  if (mode === "view") {
    return (
      <div className="report-v2-scope">
        {toolbar}
        <Alert className="mb-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Просмотр. Правка текста, назначений и статуса — через классический редактор.
          </AlertDescription>
        </Alert>
        {paginated ? (
          <PagedReportPreview
            report={report}
            editable={false}
            drafts={EMPTY_DRAFTS}
            onEditChange={() => {}}
          />
        ) : (
          <ReportDocument report={report} />
        )}
      </div>
    );
  }

  return (
    <div className="report-v2-scope">
      {toolbar}
      <ReportEditorShell report={report} onReportUpdate={handleReportUpdate} persist>
        {({ mode: shellMode }) => (
          <EditablePreview
            report={report}
            paginated={paginated}
            editable={shellMode === "edit"}
          />
        )}
      </ReportEditorShell>
    </div>
  );
}

function EditablePreview({
  report,
  paginated,
  editable,
}: {
  report: LabReport;
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
