import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify as toast } from "@/lib/toast";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import type { LabReport } from "../types";
import {
  ReportEditorProvider,
  useReportEditor,
} from "./ReportEditorContext";
import { collectDirtyRecommendations } from "./assemble";

interface Props {
  report: LabReport;
  onReportUpdate: (next: LabReport) => void;
  children: (state: { mode: "view" | "edit" }) => React.ReactNode;
  /** Persist changes to Supabase.recommendations. Если false — только локально. */
  persist?: boolean;
  /** Starting mode (default "view"). */
  initialMode?: "view" | "edit";
  /** Скрыть встроенный тулбар — родитель отрисует его сам через ReportEditorToolbar. */
  hideToolbar?: boolean;
}

/** Глубокое сравнение JSON-совместимых значений (достаточно для CoverOverrides). */
function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function ReportEditorToolbar({
  report,
  onReportUpdate,
  persist = true,
}: {
  report: LabReport;
  onReportUpdate: (next: LabReport) => void;
  persist?: boolean;
}) {
  const ctx = useReportEditor();
  const [saving, setSaving] = useState(false);
  if (!ctx) return null;

  const { mode, setMode, drafts, resetDrafts, coverOverrides } = ctx;

  if (mode === "view") {
    return (
      <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
        <Pencil className="mr-2 h-4 w-4" />
        Редактировать
      </Button>
    );
  }

  const cancel = () => {
    resetDrafts();
    setMode("view");
  };

  const save = async () => {
    // Правки собираем из DOM (contentEditable — источник истины во время набора),
    // а не из ctx.drafts — во время редактирования мы не обновляем React state,
    // чтобы не перезапускать Paged.js на каждый keystroke.
    const w = window as typeof window & {
      __reportLabCollectDrafts?: () => Record<string, string>;
    };
    const liveDrafts = w.__reportLabCollectDrafts?.() ?? drafts;
    const changed = collectDirtyRecommendations(report, liveDrafts).map((c) => {
      const rec = report.recommendations.find((r) => r.id === c.id);
      return {
        ...c,
        type: rec?.type ?? "",
        // Митигация: v1-редактор ждёт чистый markdown без HTML-мусора.
        text: cleanMarkdownArtifacts(c.text),
      };
    });
    const coverDirty = !jsonEqual(coverOverrides, report.coverOverrides ?? null);

    if (changed.length === 0 && !coverDirty) {
      toast.info("Ничего не изменилось");
      resetDrafts();
      setMode("view");
      return;
    }
    setSaving(true);
    try {
      if (persist) {
        for (const c of changed) {
          const shouldInvalidateStructuredSnapshot = c.type !== "Назначения";
          const patch = shouldInvalidateStructuredSnapshot
            ? { text: c.text, content_json: null }
            : { text: c.text };
          const { error } = await supabase
            .from("recommendations")
            // content_json — структурный snapshot. Если оставить старый snapshot
            // после ручной правки markdown, часть отчёта (например «Общее резюме»)
            // при следующем рендере снова берётся из старого JSON и выглядит так,
            // будто правка «откатилась».
            // @ts-ignore — локальные generated types могут не знать content_json.
            .update(patch)
            .eq("id", c.id);
          if (error) throw error;
        }
        if (coverDirty) {
          const { error } = await supabase
            .from("analyses")
            .update({ cover_overrides: (coverOverrides ?? null) as never })
            .eq("id", report.analysis.id);
          if (error) throw error;
        }
      }
      const updatedRecs = report.recommendations.map((r) => {
        const hit = changed.find((c) => c.id === r.id);
        if (!hit) return r;
        return {
          ...r,
          text: hit.text,
          content_json: hit.type !== "Назначения" ? null : r.content_json,
        };
      });
      onReportUpdate({
        ...report,
        recommendations: updatedRecs,
        coverOverrides: coverDirty ? coverOverrides : report.coverOverrides ?? null,
      });
      resetDrafts();
      setMode("view");
      const parts: string[] = [];
      if (changed.length > 0) parts.push(`разделов: ${changed.length}`);
      if (coverDirty) parts.push("обложка");
      toast.success(
        "Сохранено",
        persist ? `Обновлено — ${parts.join(", ")}` : `Правки применены локально: ${parts.join(", ")}`,
      );
    } catch (e) {
      console.error(e);
      toast.error(
        "Не удалось сохранить",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
        <X className="mr-2 h-4 w-4" />
        Отмена
      </Button>
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Сохранить
      </Button>
    </div>
  );
}

function ModeBanner() {
  const ctx = useReportEditor();
  if (!ctx || ctx.mode !== "edit") return null;
  return (
    <div className="mb-4 space-y-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
      <div>
        Режим редактирования: кликните по тексту, выделите фрагмент — появится
        панель форматирования (жирный/курсив, выравнивание, цвет, размер).
        Пагинация пересчитывается один раз при нажатии «Сохранить» —
        во время набора текст может визуально выйти за границу страницы.
      </div>
      <div className="text-[11px] opacity-90">
        Переменные обложки (в тексте — как <code>{"{{имя}}"}</code>):{" "}
        <code>{"{{patientName}}"}</code> — имя пациента,{" "}
        <code>{"{{age}}"}</code> — возраст,{" "}
        <code>{"{{date}}"}</code> — дата,{" "}
        <code>{"{{bioAge}}"}</code> — био-возраст,{" "}
        <code>{"{{healthIndex}}"}</code> — индекс здоровья,{" "}
        <code>{"{{issueNumber}}"}</code> — номер выпуска.
      </div>
    </div>
  );
}


/** Возвращает true, если сейчас включён edit-режим — для условного рендера превью. */
export function useIsEditMode(): boolean {
  const ctx = useReportEditor();
  return ctx?.mode === "edit";
}

function ShellInner({
  report,
  onReportUpdate,
  children,
  persist,
  hideToolbar,
}: {
  report: LabReport;
  onReportUpdate: (next: LabReport) => void;
  children: (state: { mode: "view" | "edit" }) => React.ReactNode;
  persist: boolean;
  hideToolbar: boolean;
}) {
  const ctx = useReportEditor();
  const mode = ctx?.mode ?? "view";
  return (
    <>
      {!hideToolbar && (
        <div className="mb-3 flex items-center justify-end gap-2">
          <ReportEditorToolbar
            report={report}
            onReportUpdate={onReportUpdate}
            persist={persist}
          />
        </div>
      )}
      <ModeBanner />
      {children({ mode })}
    </>
  );
}

export function ReportEditorShell({
  report,
  onReportUpdate,
  children,
  persist = true,
  initialMode = "view",
  hideToolbar = false,
}: Props) {
  return (
    <ReportEditorProvider
      initialMode={initialMode}
      initialCoverOverrides={report.coverOverrides ?? null}
    >
      <ShellInner
        report={report}
        onReportUpdate={onReportUpdate}
        persist={persist}
        hideToolbar={hideToolbar}
      >
        {children}
      </ShellInner>
    </ReportEditorProvider>
  );
}
