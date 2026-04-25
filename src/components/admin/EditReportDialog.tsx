import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { format } from "date-fns";
import { EditPrescriptionDialog } from "./EditPrescriptionDialog";
import { cleanMarkdownArtifacts } from "@/lib/markdown";

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
  lifestyle: LifestyleBlock;
  followUps: FollowUp[];
};

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
  const { toast } = useToast();

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
        const lifestyle: LifestyleBlock = (cj?.lifestyle ?? {}) as LifestyleBlock;
        const followUps: FollowUp[] = Array.isArray(cj?.follow_ups) ? cj.follow_ups : [];

        console.log("[EditReportDialog] advisoryRow found", {
          contentJsonType: typeof cj,
          contentJsonKeys: cj && typeof cj === "object" ? Object.keys(cj) : null,
          nutritionLen: lifestyle.nutrition?.length || 0,
          activityLen: lifestyle.activity?.length || 0,
          sleepLen: lifestyle.sleep?.length || 0,
          followUpsLen: followUps.length,
        });

        // Если строка «Назначения» вообще существует — показываем блок,
        // даже если массивы пустые (отрисуем placeholder).
        setAdvisory({ lifestyle, followUps });
      } else {
        console.log("[EditReportDialog] advisoryRow NOT found in recommendations");
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
                          <h2 className="text-lg font-semibold mb-3">💊 Нутрицевтики ({prescriptions.length})</h2>
                          <div className="space-y-4">
                            {prescriptions.map((prescription, idx) => (
                              <div key={prescription.id} className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <h3 className="font-semibold text-base flex-1">
                                    {idx + 1}. {prescription.prescription}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={prescription.status === "confirmed" ? "default" : "secondary"}>
                                      {prescription.status === "confirmed" ? "Подтверждено" : "На проверке"}
                                    </Badge>
                                  </div>
                                </div>
                                {prescription.reason && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mb-3">
                                    <span className="text-primary mt-0.5">📊</span>
                                    <p className="text-sm text-foreground leading-relaxed">
                                      <span className="font-medium">Причина:</span> {prescription.reason}
                                    </p>
                                  </div>
                                )}
                                {prescription.effect && (
                                  <p className="text-sm text-muted-foreground mb-3 italic">
                                    {prescription.effect}
                                  </p>
                                )}
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
                            ))}
                          </div>
                        </section>
                      )}

                      {advisory && (
                        ((advisory.lifestyle.nutrition?.length || 0) +
                          (advisory.lifestyle.activity?.length || 0) +
                          (advisory.lifestyle.sleep?.length || 0) > 0) && (
                          <section>
                            <h2 className="text-lg font-semibold mb-3">🥗 Питание и образ жизни</h2>
                            <div className="space-y-4">
                              {advisory.lifestyle.nutrition && advisory.lifestyle.nutrition.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2">Питание</h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                    {advisory.lifestyle.nutrition.map((item, i) => (
                                      <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {advisory.lifestyle.activity && advisory.lifestyle.activity.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2">Физическая активность</h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                                    {advisory.lifestyle.activity.map((item, i) => (
                                      <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {advisory.lifestyle.sleep && advisory.lifestyle.sleep.length > 0 && (
                                <div className="p-4 bg-card/50 rounded-xl border border-border">
                                  <h4 className="font-medium mb-2">Сон и восстановление</h4>
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
                          <h2 className="text-lg font-semibold mb-3">🩺 Дополнительные консультации и обследования</h2>
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

                      {advisory &&
                        ((advisory.lifestyle.nutrition?.length || 0) +
                          (advisory.lifestyle.activity?.length || 0) +
                          (advisory.lifestyle.sleep?.length || 0) === 0) &&
                        advisory.followUps.length === 0 && (
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
