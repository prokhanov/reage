import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Download, Info, RefreshCw, ExternalLink, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { notify as toast } from "@/lib/toast";
import { PagedReportPreview, ReportDocument } from "@/lib/reportLab/renderer";
import { ReportEditorShell, ReportEditorToolbar } from "@/lib/reportLab/editor/ReportEditorShell";
import { useReportEditor } from "@/lib/reportLab/editor/ReportEditorContext";
import { assembleRecommendationText } from "@/lib/reportLab/editor/assemble";
import { buildLabReportFromDb } from "@/lib/reportLab/buildFromDb";
import { getCategoryRecords, getPatientDataRecord, getPrescriptionsRecord } from "@/lib/reportLab/parser";
import type { LabReport } from "@/lib/reportLab/types";
import { ReportSectionNav, type ReportNavSection } from "./ReportSectionNav";


interface Props {
  analysisId: string;
  userId: string;
  /** view = превью без редактора; edit = превью с ReportEditorShell (persist). */
  mode: "view" | "edit";
  /** Колбэк после успешного сейва — чтобы родитель мог перечитать данные. */
  onSaved?: () => void;
  /**
   * Компактный режим для ЛК пациента / view-as-patient:
   * скрывает служебную мета-строку, подсказку и переключатели пагинации,
   * добавляет кнопку «Открыть в новом окне».
   */
  compact?: boolean;
  /** Если задан — в панели показывается кнопка ✕ (для диалогового окна). */
  onClose?: () => void;
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
export function ReportV2Editor({ analysisId, userId, mode, onSaved, compact = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<LabReport | null>(null);
  const [paginated, setPaginated] = useState(true);
  const [rendering, setRendering] = useState(false);
  const readyUrlRef = useRef<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);


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

  const navSections = useMemo<ReportNavSection[]>(() => {
    if (!report) return [];
    // Обложку в содержание не выносим — на неё юзер и так попадает первой.
    const items: ReportNavSection[] = [];
    if (getPatientDataRecord(report)) items.push({ id: "patient", label: "Данные пациента" });
    items.push({ id: "overview", label: "Общее резюме" });
    const cats = getCategoryRecords(report);
    cats.forEach((rec, i) => items.push({ id: `category-${i + 1}`, label: rec.type }));
    if (getPrescriptionsRecord(report)) items.push({ id: "prescriptions", label: "Рекомендации" });
    return items;
  }, [report]);


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

  const refreshPagination = () => {
    const w = window as typeof window & { __reportLabReflow?: () => void };
    w.__reportLabReflow?.();
  };


  const openInNewWindow = () => {
    const url = `/internal/report-v2?analysisId=${encodeURIComponent(
      analysisId,
    )}&userId=${encodeURIComponent(userId)}&mode=${mode}`;
    window.open(url, "_blank", "noopener");
  };

  const toolbarExtras = (
    <>
      {!compact && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPagination}
            disabled={!paginated}
            title="Пересчитать разбиение на страницы"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить страницы
          </Button>
          <Button
            variant={paginated ? "default" : "outline"}
            size="sm"
            onClick={() => setPaginated((v) => !v)}
          >
            {paginated ? "Постранично" : "Потоком"}
          </Button>
        </>
      )}
      {compact && (
        <Button size="sm" variant="outline" onClick={openInNewWindow}>
          <ExternalLink className="mr-2 h-4 w-4" />
          В новом окне
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={downloadPdf} disabled={rendering}>
        {rendering ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Скачать PDF
      </Button>
    </>
  );

  const toolbarWrap = (extra: React.ReactNode) => (
    <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 supports-[backdrop-filter]:bg-background/70 backdrop-blur px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        {/* Dropdown с разделами — виден на планшете/мобиле вместо боковой панели. */}
        {navSections.length > 0 && (
          <div className="lg:hidden">
            <ReportSectionNav
              sections={navSections}
              containerRef={previewContainerRef}
              variant="dropdown"
            />
          </div>
        )}
        {!compact && (
          <div className="text-xs text-muted-foreground truncate hidden sm:block">
            <span className="font-medium text-foreground">Новый рендерер (Beta)</span> · {patientLabel}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {toolbarExtras}
      </div>
    </div>
  );

  const withNav = (children: React.ReactNode) => (
    <div className="flex gap-3 min-h-0">
      {navSections.length > 0 && (
        <ReportSectionNav
          sections={navSections}
          containerRef={previewContainerRef}
          variant="sidebar"
        />
      )}
      <div ref={previewContainerRef} className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );

  if (mode === "view") {
    return (
      <div className="report-v2-scope">
        {toolbarWrap(null)}
        {!compact && (
          <Alert className="mb-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Просмотр. Правка текста, назначений и статуса — через классический редактор.
            </AlertDescription>
          </Alert>
        )}
        {withNav(
          paginated ? (
            <PagedReportPreview
              report={report}
              editable={false}
              drafts={EMPTY_DRAFTS}
              onEditChange={() => {}}
            />
          ) : (
            <ReportDocument report={report} />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="report-v2-scope">
      <ReportEditorShell
        report={report}
        onReportUpdate={handleReportUpdate}
        persist
        initialMode="edit"
        hideToolbar
      >
        {({ mode: shellMode }) => (
          <>
            {toolbarWrap(
              <ReportEditorToolbar
                report={report}
                onReportUpdate={handleReportUpdate}
                persist
              />,
            )}
            {withNav(
              <EditablePreview
                report={report}
                paginated={paginated}
                editable={shellMode === "edit"}
              />,
            )}
          </>
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
  // ВАЖНО: во время набора мы НЕ обновляем React-состояние drafts,
  // иначе Paged.js перезапускает полную пагинацию на каждый keystroke
  // (курсор прыгает, ощутимые лаги). Правки уже видны в DOM
  // (contentEditable). Фактические drafts собираются из DOM в момент
  // «Сохранить» через window.__reportLabCollectDrafts().
  return (
    <PagedReportPreview
      report={report}
      editable={editable}
      drafts={ctx?.drafts ?? EMPTY_DRAFTS}
      onEditChange={() => {
        /* no-op: не триггерим re-render/re-pagination */
      }}
      coverOverrides={ctx?.coverOverrides ?? report.coverOverrides ?? null}
      onCoverOverridesChange={(next) => ctx?.setCoverOverrides(next)}
    />
  );
}
