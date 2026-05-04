import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, Check, CheckCircle2, ClipboardList, FileText, Info, Loader2, Moon, Pill, Plus, ShieldCheck, Stethoscope, Trash2, Utensils, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { format } from "date-fns";
import { EditPrescriptionDialog } from "./EditPrescriptionDialog";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import { sanitizeLifestyle, extractFollowUpsFromLifestyle, mergeFollowUps } from "@/components/prescriptions/AdvisorySections";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  originalMarkdown?: string;
}

type LifestyleBlock = {
  nutrition?: string[];
  activity?: string[];
  sleep?: string[];
};

type FollowUp = {
  specialist?: string;
  goal?: string;
  trigger?: string;
};

type AdvisoryBlock = {
  id: string;
  lifestyle: LifestyleBlock;
  followUps: FollowUp[];
  rawMarkdown?: string;
};

const cleanReasonText = (value?: string | null) =>
  (value || "").replace(/^[\s📊📈📉]+/u, "").trim();

interface Prescription {
  id: string;
  prescription: string;
  name: string | null;
  form: string | null;
  dosage: string | null;
  how_to_take: string | null;
  duration: string | null;
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
  onStatusChange 
}: EditReportDialogProps) {
  const [sections, setSections] = useState<Recommendation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [advisory, setAdvisory] = useState<AdvisoryBlock | null>(null);
  const [editPrescriptionDialogOpen, setEditPrescriptionDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"on_review" | "processed">(initialStatus);
  const [selectedStatus, setSelectedStatus] = useState<"on_review" | "processed">(initialStatus);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qaRunning, setQaRunning] = useState(false);
  const [qaEvents, setQaEvents] = useState<Array<{ type: string; message: string }>>([]);
  const [qaCompleted, setQaCompleted] = useState(false);
  const { toast } = useToast();

  const runQaCheck = async () => {
    setQaRunning(true);
    setQaCompleted(false);
    setQaEvents([{ type: "status", message: "Запускаю проверку отчёта…" }]);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-qa`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysisId }),
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text();
        throw new Error(`QA failed: ${resp.status} ${t}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            setQaEvents((prev) => [...prev, evt]);
            if (evt.type === "done" || evt.type === "error") {
              streamDone = true;
              if (evt.type === "error") {
                toast({ title: "Ошибка проверки", description: evt.message, variant: "destructive" });
              }
              break;
            }
          } catch {
            // partial line, will be re-buffered on next iteration
          }
        }
      }
      setQaCompleted(true);
      // Reload sections to reflect any AI-generated repairs
      await loadRecommendations();
      toast({ title: "Проверка завершена", description: "Контент перезагружен в редактор." });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setQaRunning(false);
    }
  };

  useEffect(() => {
    setAnalysisStatus(initialStatus);
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (open) {
      loadRecommendations();
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
      setPrescriptions(data || []);
    } catch (error: any) {
      console.error("Error loading prescriptions:", error);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("type");

      if (error) throw error;

      const rows = data || [];

      // Диагностика: видно ли строку «Назначения» с content_json после загрузки.
      console.log("[EditReportDialog] loadRecommendations", {
        analysisId,
        rowsCount: rows.length,
        types: rows.map((r: any) => r.type),
      });

      // Выделяем advisory-блок «Назначения» (lifestyle + follow_ups) — он не markdown,
      // его нужно рендерить отдельным read-only компонентом, а не через Quill.
      const advisoryRow = rows.find((r: any) => r.type === "Назначения");
      if (advisoryRow) {
        const cj = (advisoryRow as any).content_json;
        const rawLifestyle: LifestyleBlock = (cj?.lifestyle ?? {}) as LifestyleBlock;
        const rawFollowUps: FollowUp[] = Array.isArray(cj?.follow_ups) ? cj.follow_ups : [];
        const rawMarkdown = typeof cj?.raw_markdown === "string" ? cj.raw_markdown : undefined;

        // Применяем те же sanitizers, что и в публичном рендере, чтобы:
        //  - убрать заголовки-ярлыки и follow-up'ы из lifestyle.sleep/activity;
        //  - перенести «Эндокринолог → ...» в followUps.
        const extracted = extractFollowUpsFromLifestyle(rawLifestyle);
        const lifestyle = sanitizeLifestyle(rawLifestyle) as LifestyleBlock;
        const followUps = mergeFollowUps(rawFollowUps, extracted);

        setAdvisory({ id: advisoryRow.id, lifestyle, followUps, rawMarkdown });
      } else {
        setAdvisory(null);
      }

      // В список markdown-секций включаем всё, КРОМЕ «Назначения» (она рендерится отдельно).
      const markdownRows = rows.filter((r: any) => r.type !== "Назначения");

      const sectionsWithHtml = markdownRows.map((section: any) => ({
        ...section,
        originalMarkdown: section.text,
        text: marked.parse(
          cleanMarkdownArtifacts(section.text).replace(/^(?:\t| {4,})(?=\*\*)/gm, '')
        ) as string
      }));

      // Сортируем разделы в правильном порядке
      const sortOrder: Record<string, number> = {
        "Данные пациента": 0,
        "Общее резюме": 1,
      };

      const sorted = sectionsWithHtml.sort((a, b) => {
        const aOrder = sortOrder[a.type] ?? 100;
        const bOrder = sortOrder[b.type] ?? 100;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.type.localeCompare(b.type);
      });

      setSections(sorted);
      if (sorted.length > 0) {
        setSelectedSection(sorted[0].type);
      } else if (advisoryRow || (data || []).length > 0) {
        setSelectedSection("prescriptions");
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (id: string, newText: string) => {
    setSections(prev => prev.map(section => 
      section.id === id ? { ...section, text: newText } : section
    ));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Конвертируем HTML обратно в markdown перед сохранением
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });

      // Определяем, поменялся ли хоть один markdown-текст по сравнению с
      // тем, что лежит в БД (originalMarkdown). Если да — снимаем JSON snapshot
      // у "Общее резюме", чтобы рендер ушёл на legacy markdown pipeline и
      // показывал свежие правки админа. Это сознательный trade-off: мы теряем
      // UUID-binding визуал в этом отчёте, но гарантируем, что правки видны.
      let anyContentChanged = false;

      // Save each section individually
      for (const section of sections) {
        const markdownText = turndownService.turndown(section.text);

        if (section.originalMarkdown !== undefined && section.originalMarkdown !== markdownText) {
          anyContentChanged = true;
        }

        const { error } = await supabase
          .from("recommendations")
          .update({ text: markdownText })
          .eq("id", section.id);

        if (error) throw error;
      }

      // Если контент менялся — инвалидируем JSON snapshot у summary этого анализа.
      if (anyContentChanged) {
        const { error: invalidateError } = await supabase
          .from("recommendations")
          // @ts-ignore — content_json может ещё отсутствовать в локальных типах
          .update({ content_json: null })
          .eq("analysis_id", analysisId)
          .eq("type", "Общее резюме");

        if (invalidateError) {
          console.warn("Failed to invalidate snapshot after edit:", invalidateError.message);
        }
      }

      // Сохраняем статус анализа, если он изменился
      if (selectedStatus !== analysisStatus) {
        const { error: statusError } = await supabase
          .from("analyses")
          .update({ status: selectedStatus })
          .eq("id", analysisId);

        if (statusError) throw statusError;

        setAnalysisStatus(selectedStatus);
        onStatusChange?.();
      }

      toast({
        title: "Успешно!",
        description: selectedStatus !== analysisStatus 
          ? "Изменения и статус сохранены" 
          : "Изменения сохранены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
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

      setPrescriptions(prev => prev.map(p => 
        p.id === prescriptionId ? { ...p, status: "confirmed" as const } : p
      ));

      toast({
        title: "Успешно",
        description: "Назначение подтверждено",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setEditPrescriptionDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <style>{`
          .quill-editor .ql-editor {
            font-size: 15px;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-wrap: anywhere;
            word-break: break-word;
            white-space: normal;
            max-width: 100%;
          }
           .quill-editor .ql-container {
             width: 100%;
           }
          .quill-editor .ql-editor p {
            margin-bottom: 1em;
          }
          .quill-editor .ql-editor h1,
          .quill-editor .ql-editor h2,
          .quill-editor .ql-editor h3 {
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            font-weight: 600;
          }
          .quill-editor .ql-editor ul,
          .quill-editor .ql-editor ol {
            margin-bottom: 1em;
            padding-left: 1.5em;
          }
          .quill-editor .ql-editor li {
            margin-bottom: 0.5em;
          }
          .ql-bubble .ql-tooltip {
            z-index: 9999;
          }
        `}</style>
        <DialogContent className="max-w-6xl max-h-[95vh] w-full h-full overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Редактирование отчета</DialogTitle>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runQaCheck}
                  disabled={qaRunning || loading}
                >
                  {qaRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Проверить на валидность
                </Button>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as "on_review" | "processed")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_review">На проверке</SelectItem>
                    <SelectItem value="processed">Подтвержден</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogDescription>
              Проверьте и отредактируйте AI-сгенерированный отчет. Измените статус на "Подтвержден", чтобы клиент увидел отчет.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="shrink-0 mb-4">
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите раздел" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.type}>
                          {section.type}
                        </SelectItem>
                      ))}
                      {(prescriptions.length > 0 || advisory) && (() => {
                        const lifestyleCount = advisory
                          ? (advisory.lifestyle.nutrition?.length || 0) +
                            (advisory.lifestyle.activity?.length || 0) +
                            (advisory.lifestyle.sleep?.length || 0)
                          : 0;
                        const followUpsCount = advisory?.followUps.length || 0;
                        const parts: string[] = [];
                        if (prescriptions.length > 0) parts.push(`нутрицевтики: ${prescriptions.length}`);
                        if (lifestyleCount > 0) parts.push(`образ жизни: ${lifestyleCount}`);
                        if (followUpsCount > 0) parts.push(`консультации: ${followUpsCount}`);
                        const label = parts.length > 0 ? `Назначения (${parts.join(" · ")})` : "Назначения";
                        return (
                          <SelectItem value="prescriptions">
                            {label}
                          </SelectItem>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSection === "prescriptions" ? (
                  <div className="flex-1 overflow-auto">
                    <div className="space-y-6">
                      {prescriptions.length > 0 && (
                        <section>
                          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Pill className="h-5 w-5 text-primary" />
                            Нутрицевтики ({prescriptions.length})
                          </h2>
                          <div className="space-y-4">
                            {prescriptions.map((prescription, idx) => {
                              const title = prescription.name || prescription.prescription;
                              const reason = cleanReasonText(prescription.reason);
                              const statusLabel = prescription.status === "confirmed" ? "Подтверждено" : "На проверке";

                              return (
                              <div key={prescription.id} className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border">
                                <div className="space-y-3 mb-4">
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Название:</span> {idx + 1}. {title || "—"}
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Форма:</span> {prescription.form || "—"}
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Дозировка:</span> {prescription.dosage || "—"}
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Как принимать:</span> {prescription.how_to_take || "—"}
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">Длительность:</span> {prescription.duration || "—"}
                                  </p>
                                  <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                                    <p className="text-sm text-foreground leading-relaxed">
                                      <span className="font-medium">Причина:</span> {reason || "—"}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">На что влияет:</span> {prescription.effect || "—"}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">Статус:</span>
                                    <Badge variant={prescription.status === "confirmed" ? "default" : "secondary"}>
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    {prescription.control_date ? `Контрольная дата: ${format(new Date(prescription.control_date), "dd.MM.yyyy")}` : ""}
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditPrescription(prescription)}
                                    >
                                      Редактировать
                                    </Button>
                                    {prescription.status !== "confirmed" && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleConfirmPrescription(prescription.id)}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Подтвердить
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        </section>
                      )}

                      {advisory && (
                        ((advisory.lifestyle.nutrition?.length || 0) +
                          (advisory.lifestyle.activity?.length || 0) +
                          (advisory.lifestyle.sleep?.length || 0) > 0) && (
                          <section>
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <ClipboardList className="h-5 w-5 text-primary" />
                              Питание и образ жизни
                            </h2>
                            <div className="space-y-4">
                              {advisory.lifestyle.nutrition && advisory.lifestyle.nutrition.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Utensils className="h-4 w-4 text-primary" />
                                    Питание
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                    {advisory.lifestyle.nutrition.map((item, i) => (
                                      <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {advisory.lifestyle.activity && advisory.lifestyle.activity.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Физическая активность
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                    {advisory.lifestyle.activity.map((item, i) => (
                                      <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {advisory.lifestyle.sleep && advisory.lifestyle.sleep.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Moon className="h-4 w-4 text-primary" />
                                    Сон и восстановление
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                    {advisory.lifestyle.sleep.map((item, i) => (
                                      <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </section>
                        )
                      )}

                      {advisory && advisory.followUps.length > 0 && (
                        <section>
                          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            Дополнительные консультации и обследования
                          </h2>
                          <div className="space-y-3">
                            {advisory.followUps.map((f, i) => (
                              <div key={i} className="p-4 bg-card/50 rounded-xl border border-border">
                                <div className="font-medium mb-1">{f.specialist || "Специалист"}</div>
                                {f.goal && (
                                  <p className="text-sm text-foreground mb-1">
                                    <span className="text-muted-foreground">Цель:</span> {f.goal}
                                  </p>
                                )}
                                {f.trigger && (
                                  <p className="text-sm text-muted-foreground">
                                    Основание: {f.trigger}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {advisory?.rawMarkdown && prescriptions.length === 0 && (
                        <section>
                          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Текст назначений
                          </h2>
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none p-4 bg-card/50 rounded-xl border border-border"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(cleanMarkdownArtifacts(advisory.rawMarkdown)) as string,
                            }}
                          />
                        </section>
                      )}

                      {advisory &&
                        ((advisory.lifestyle.nutrition?.length || 0) +
                          (advisory.lifestyle.activity?.length || 0) +
                          (advisory.lifestyle.sleep?.length || 0) === 0) &&
                        advisory.followUps.length === 0 &&
                        !advisory.rawMarkdown && (
                          <section>
                            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30">
                              <p className="text-sm text-muted-foreground">
                                AI не сгенерировал блоки «Питание и образ жизни» и «Дополнительные консультации» для этого анализа. Запись «Назначения» в базе есть, но массивы пустые. Возможные причины: лимит токенов модели или невалидный JSON. Можно перегенерировать отчёт.
                              </p>
                            </div>
                          </section>
                        )}

                      {prescriptions.length === 0 && !advisory && (
                        <p className="text-sm text-muted-foreground">Назначений пока нет.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto min-h-0">
                    {sections.filter(s => s.type === selectedSection).map((section) => (
                      <ReactQuill
                        key={section.id}
                        theme="bubble"
                        value={section.text}
                        onChange={(text) => updateSection(section.id, text)}
                        placeholder="Выделите текст для форматирования..."
                        className="bg-background rounded-md border border-border p-6 h-full quill-editor"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
            <Button
              onClick={handleSaveChanges}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </div>

          {(qaRunning || qaEvents.length > 0) && (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <div className="flex items-center gap-2">
                    {qaRunning ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                    <h3 className="font-semibold">
                      {qaRunning ? "Выполняется проверка отчёта" : "Проверка завершена"}
                    </h3>
                  </div>
                  {!qaRunning && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setQaEvents([]);
                        setQaCompleted(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-auto px-5 py-3 space-y-1.5 text-sm font-mono">
                  {qaEvents.map((evt, idx) => {
                    const Icon =
                      evt.type === "fix" ? Check
                      : evt.type === "warn" ? AlertTriangle
                      : evt.type === "error" ? AlertTriangle
                      : evt.type === "done" ? CheckCircle2
                      : Info;
                    const color =
                      evt.type === "fix" ? "text-emerald-600 dark:text-emerald-400"
                      : evt.type === "warn" ? "text-amber-600 dark:text-amber-400"
                      : evt.type === "error" ? "text-destructive"
                      : evt.type === "done" ? "text-primary"
                      : "text-muted-foreground";
                    return (
                      <div key={idx} className={`flex items-start gap-2 ${color}`}>
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="break-words">{evt.message}</span>
                      </div>
                    );
                  })}
                </div>
                {!qaRunning && qaCompleted && (
                  <div className="px-5 py-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setQaEvents([]);
                        setQaCompleted(false);
                      }}
                    >
                      Закрыть и продолжить редактирование
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {selectedPrescription && (
        <EditPrescriptionDialog
          open={editPrescriptionDialogOpen}
          onOpenChange={(open) => {
            setEditPrescriptionDialogOpen(open);
            if (!open) {
              loadPrescriptions();
            }
          }}
          prescription={selectedPrescription}
        />
      )}
    </>
  );
}
