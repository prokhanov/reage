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
      
      // Convert markdown to HTML for editor (sanitize first so the editor
      // never receives leading-tab/4-space indents — markdown would otherwise
      // turn them into <pre><code> blocks visible as monospace boxes with
      // horizontal scroll inside the admin UI).
      const sectionsWithHtml = (data || []).map(section => ({
        ...section,
        originalMarkdown: section.text,
        text: marked.parse(cleanMarkdownArtifacts(section.text)) as string
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
      
      // Save each section individually
      for (const section of sections) {
        const markdownText = turndownService.turndown(section.text);
        
        const { error } = await supabase
          .from("recommendations")
          .update({ text: markdownText })
          .eq("id", section.id);

        if (error) throw error;
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
                      {prescriptions.length > 0 && (
                        <SelectItem value="prescriptions">
                          Назначения ({prescriptions.length})
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSection === "prescriptions" ? (
                  <div className="flex-1 overflow-auto">
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
                              Контрольная дата: {format(new Date(prescription.control_date), "dd.MM.yyyy")}
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
