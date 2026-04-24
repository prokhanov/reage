import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { EditPrescriptionDialog } from "./EditPrescriptionDialog";
import {
  parseReportSnapshot,
  type ReportSnapshot,
} from "@/lib/reportSnapshot";
import {
  snapshotToMarkdown,
  markdownToSnapshot,
} from "@/lib/snapshotMarkdown";
import { renderSnapshotWeb } from "@/lib/snapshotRenderer";
import type { PdfBiomarkerData } from "@/lib/pdfExportHelpers";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";

interface SnapshotRow {
  id: string;
  content_json: ReportSnapshot;
}

interface Prescription {
  id: string;
  prescription: string;
  reason: string | null;
  effect: string | null;
  control_date: string | null;
  status: "on_review" | "confirmed";
}

interface EditReportDialogProps {
  analysisId: string;
  analysisStatus: "on_review" | "processed";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: () => void;
}

export function EditReportDialog({
  analysisId,
  analysisStatus: initialStatus,
  open,
  onOpenChange,
  onStatusChange,
}: EditReportDialogProps) {
  const [snapshotRow, setSnapshotRow] = useState<SnapshotRow | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [editPrescriptionDialogOpen, setEditPrescriptionDialogOpen] =
    useState(false);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [analysisStatus, setAnalysisStatus] =
    useState<"on_review" | "processed">(initialStatus);
  const [selectedStatus, setSelectedStatus] =
    useState<"on_review" | "processed">(initialStatus);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Live preview snapshot — пересобираем из текущего markdown
  const previewSnapshot = useMemo(() => {
    if (!snapshotRow) return null;
    const parsed = markdownToSnapshot(markdown, snapshotRow.content_json);
    if (!parsed.ok) return null;
    return parsed.snapshot;
  }, [markdown, snapshotRow]);

  useEffect(() => {
    setAnalysisStatus(initialStatus);
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (open) {
      loadSnapshot();
      loadPrescriptions();
    }
  }, [open, analysisId]);

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setPrescriptions((data ?? []) as Prescription[]);
    } catch (error: any) {
      console.error("Error loading prescriptions:", error);
    }
  };

  const loadSnapshot = async () => {
    setLoading(true);
    setParseError(null);
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select("id, content_json, type")
        .eq("analysis_id", analysisId)
        .eq("type", "snapshot")
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.content_json) {
        setSnapshotRow(null);
        setMarkdown("");
        setParseError(
          "У этого анализа ещё нет snapshot-отчёта (старый формат или отчёт не сгенерирован).",
        );
        return;
      }

      const parsed = parseReportSnapshot(data.content_json);
      if (!parsed.ok) {
        setSnapshotRow(null);
        setMarkdown("");
        setParseError(`Ошибка валидации snapshot: ${parsed.error}`);
        return;
      }

      setSnapshotRow({ id: data.id, content_json: parsed.snapshot });
      setMarkdown(snapshotToMarkdown(parsed.snapshot));
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!snapshotRow) return;
    setSaving(true);
    try {
      const parsed = markdownToSnapshot(markdown, snapshotRow.content_json);
      if (!parsed.ok) {
        toast({
          title: "Не удалось распарсить markdown",
          description: parsed.error,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("recommendations")
        .update({ content_json: parsed.snapshot as any })
        .eq("id", snapshotRow.id);
      if (error) throw error;

      // Статус
      if (selectedStatus !== analysisStatus) {
        const { error: statusError } = await supabase
          .from("analyses")
          .update({ status: selectedStatus })
          .eq("id", analysisId);
        if (statusError) throw statusError;
        setAnalysisStatus(selectedStatus);
        onStatusChange?.();
      }

      setSnapshotRow({ ...snapshotRow, content_json: parsed.snapshot });

      toast({
        title: "Сохранено",
        description:
          selectedStatus !== analysisStatus
            ? "Snapshot и статус обновлены"
            : "Snapshot обновлён",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPrescription = async (prescriptionId: string) => {
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: "confirmed" })
        .eq("id", prescriptionId);
      if (error) throw error;
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId ? { ...p, status: "confirmed" as const } : p,
        ),
      );
      toast({ title: "Назначение подтверждено" });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] w-full h-full overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Редактирование отчёта (Snapshot)</DialogTitle>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as "on_review" | "processed")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_review">На проверке</SelectItem>
                  <SelectItem value="processed">Подтверждён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogDescription>
              Редактируйте контент в markdown-полях между маркерами
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">
                &lt;!-- block:... --&gt;
              </code>
              . Не удаляйте сами маркеры — они задают структуру.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : parseError ? (
              <div className="flex items-start gap-3 p-4 rounded-md border border-destructive/40 bg-destructive/5 text-sm">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    Snapshot недоступен
                  </p>
                  <p className="text-muted-foreground mt-1">{parseError}</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
                <TabsList className="self-start">
                  <TabsTrigger value="editor">Markdown</TabsTrigger>
                  <TabsTrigger value="preview">Превью</TabsTrigger>
                  <TabsTrigger value="prescriptions">
                    Назначения ({prescriptions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="editor"
                  className="flex-1 overflow-hidden mt-3"
                >
                  <Textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="font-mono text-sm h-full resize-none"
                    spellCheck={false}
                  />
                </TabsContent>

                <TabsContent
                  value="preview"
                  className="flex-1 overflow-auto mt-3 px-4"
                >
                  {previewSnapshot ? (
                    renderSnapshotForWeb(previewSnapshot, {
                      analysisId,
                      prescriptions: prescriptions as any,
                    })
                  ) : (
                    <p className="text-sm text-destructive p-4">
                      Markdown не парсится — проверьте маркеры блоков.
                    </p>
                  )}
                </TabsContent>

                <TabsContent
                  value="prescriptions"
                  className="flex-1 overflow-auto mt-3"
                >
                  <div className="space-y-4">
                    {prescriptions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Нет назначений.
                      </p>
                    )}
                    {prescriptions.map((prescription, idx) => (
                      <div
                        key={prescription.id}
                        className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="font-semibold text-base flex-1">
                            {idx + 1}. {prescription.prescription}
                          </h3>
                          <Badge
                            variant={
                              prescription.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {prescription.status === "confirmed"
                              ? "Подтверждено"
                              : "На проверке"}
                          </Badge>
                        </div>
                        {prescription.reason && (
                          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mb-3">
                            <span className="text-primary mt-0.5">📊</span>
                            <p className="text-sm leading-relaxed">
                              <span className="font-medium">Причина:</span>{" "}
                              {prescription.reason}
                            </p>
                          </div>
                        )}
                        {prescription.effect && (
                          <p className="text-sm text-muted-foreground mb-3 italic">
                            {prescription.effect}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          {prescription.control_date && (
                            <span className="text-sm text-muted-foreground">
                              Контроль:{" "}
                              {format(
                                new Date(prescription.control_date),
                                "dd.MM.yyyy",
                              )}
                            </span>
                          )}
                          <div className="flex gap-2 ml-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPrescription(prescription);
                                setEditPrescriptionDialogOpen(true);
                              }}
                            >
                              Редактировать
                            </Button>
                            {prescription.status !== "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleConfirmPrescription(prescription.id)
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Подтвердить
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
            <Button
              onClick={handleSaveChanges}
              disabled={saving || loading || !snapshotRow || !previewSnapshot}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить snapshot"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPrescription && (
        <EditPrescriptionDialog
          open={editPrescriptionDialogOpen}
          onOpenChange={(o) => {
            setEditPrescriptionDialogOpen(o);
            if (!o) loadPrescriptions();
          }}
          prescription={selectedPrescription}
        />
      )}
    </>
  );
}
