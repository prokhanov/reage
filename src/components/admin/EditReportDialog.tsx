import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import { marked } from 'marked';

interface Recommendation {
  id: string;
  type: string;
  text: string;
}

interface CombinedReport {
  fullText: string;
  recommendations: Recommendation[];
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
  const [fullReportText, setFullReportText] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<"on_review" | "processed">(initialStatus);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setAnalysisStatus(initialStatus);
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
      
      setRecommendations(data || []);
      
      // Combine all recommendations into one full report WITHOUT section headers
      let combinedText = "";
      (data || []).forEach(rec => {
        combinedText += marked.parse(rec.text) as string;
        combinedText += "\n\n";
      });
      
      setFullReportText(combinedText);
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

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Save the full report text to all recommendations
      for (const rec of recommendations) {
        const { error } = await supabase
          .from("recommendations")
          .update({ text: fullReportText })
          .eq("id", rec.id);

        if (error) throw error;
      }

      toast({
        title: "Успешно!",
        description: "Изменения сохранены",
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

  const handleStatusChange = async (newStatus: "on_review" | "processed") => {
    try {
      const { error } = await supabase
        .from("analyses")
        .update({ status: newStatus })
        .eq("id", analysisId);

      if (error) throw error;

      setAnalysisStatus(newStatus);
      
      toast({
        title: "Успешно!",
        description: newStatus === "processed" 
          ? "Отчет загружен в кабинет клиента" 
          : "Статус изменен на 'На проверке'",
      });

      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
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
              <Select value={analysisStatus} onValueChange={handleStatusChange}>
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
            <div className="flex-1 overflow-hidden">
              <ReactQuill
                theme="bubble"
                value={fullReportText}
                onChange={setFullReportText}
                placeholder="Выделите текст для форматирования..."
                className="bg-background rounded-md border border-border p-6 h-full quill-editor"
              />
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
  );
}
