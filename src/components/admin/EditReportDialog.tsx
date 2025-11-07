import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import { marked } from 'marked';
import TurndownService from 'turndown';

interface Recommendation {
  id: string;
  type: string;
  text: string;
  originalMarkdown?: string;
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
  const [analysisStatus, setAnalysisStatus] = useState<"on_review" | "processed">(initialStatus);
  const [selectedStatus, setSelectedStatus] = useState<"on_review" | "processed">(initialStatus);
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
    }
  }, [open, analysisId]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("type");

      if (error) throw error;
      
      // Конвертируем markdown в HTML для редактора
      const sectionsWithHtml = (data || []).map(section => ({
        ...section,
        originalMarkdown: section.text,
        text: marked.parse(section.text) as string
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



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{`
        .quill-editor .ql-editor {
          font-size: 15px;
          line-height: 1.6;
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
            <Tabs defaultValue={sections[0]?.type || "summary"} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="shrink-0 grid w-full" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.type}>
                    {section.type}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sections.map((section) => (
                <TabsContent key={section.id} value={section.type} className="flex-1 overflow-hidden mt-4">
                  <ReactQuill
                    theme="bubble"
                    value={section.text}
                    onChange={(text) => updateSection(section.id, text)}
                    placeholder="Выделите текст для форматирования..."
                    className="bg-background rounded-md border border-border p-6 h-full quill-editor"
                  />
                </TabsContent>
              ))}
            </Tabs>
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
  );
}
