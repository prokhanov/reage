import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify as toast } from "@/lib/toast";
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
}

function Toolbar({
  report,
  onReportUpdate,
  persist,
}: {
  report: LabReport;
  onReportUpdate: (next: LabReport) => void;
  persist: boolean;
}) {
  const ctx = useReportEditor();
  const [saving, setSaving] = useState(false);
  if (!ctx) return null;

  const { mode, setMode, drafts, resetDrafts } = ctx;

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
    const changed = collectDirtyRecommendations(report, drafts);
    if (changed.length === 0) {
      toast.info("Ничего не изменилось");
      resetDrafts();
      setMode("view");
      return;
    }
    setSaving(true);
    try {
      if (persist) {
        for (const c of changed) {
          const { error } = await supabase
            .from("recommendations")
            .update({ text: c.text })
            .eq("id", c.id);
          if (error) throw error;
        }
      }
      const updatedRecs = report.recommendations.map((r) => {
        const hit = changed.find((c) => c.id === r.id);
        return hit ? { ...r, text: hit.text } : r;
      });
      onReportUpdate({ ...report, recommendations: updatedRecs });
      resetDrafts();
      setMode("view");
      toast.success(
        "Сохранено",
        persist
          ? `Обновлено разделов: ${changed.length}`
          : `Правки применены локально: ${changed.length}`,
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
        После потери фокуса разметка пересчитается и текст сдвинется по
        страницам.
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
}: {
  report: LabReport;
  onReportUpdate: (next: LabReport) => void;
  children: (state: { mode: "view" | "edit" }) => React.ReactNode;
  persist: boolean;
}) {
  const ctx = useReportEditor();
  const mode = ctx?.mode ?? "view";
  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-2">
        <Toolbar
          report={report}
          onReportUpdate={onReportUpdate}
          persist={persist}
        />
      </div>
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
}: Props) {
  return (
    <ReportEditorProvider>
      <ShellInner
        report={report}
        onReportUpdate={onReportUpdate}
        persist={persist}
      >
        {children}
      </ShellInner>
    </ReportEditorProvider>
  );
}
