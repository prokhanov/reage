import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MDEditor from '@uiw/react-md-editor';

interface Recommendation {
  id: string;
  type: string;
  text: string;
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
      for (const rec of recommendations) {
        const { error } = await supabase
          .from("recommendations")
          .update({ text: rec.text })
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

  const updateRecommendation = (id: string, text: string) => {
    setRecommendations(prev =>
      prev.map(rec => (rec.id === id ? { ...rec, text } : rec))
    );
  };

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) {
      acc[rec.type] = [];
    }
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-hidden flex flex-col">
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
            <Tabs defaultValue={Object.keys(groupedRecommendations)[0] || "all"} className="w-full h-full flex flex-col">
              <TabsList className="grid w-full shrink-0" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedRecommendations).length}, minmax(0, 1fr))` }}>
                {Object.keys(groupedRecommendations).map((type) => (
                  <TabsTrigger key={type} value={type} className="text-xs">
                    {type}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(groupedRecommendations).map(([type, recs]) => (
                <TabsContent key={type} value={type} className="flex-1 overflow-auto" data-color-mode="light">
                  <div className="space-y-3 h-full">
                    <h3 className="font-semibold text-base">{type}</h3>
                    {recs.map((rec) => (
                      <div key={rec.id} className="space-y-2 h-[calc(100%-2rem)]">
                        <MDEditor
                          value={rec.text}
                          onChange={(val) => updateRecommendation(rec.id, val || "")}
                          height="100%"
                          preview="live"
                          hideToolbar={false}
                          enableScroll={true}
                        />
                      </div>
                    ))}
                  </div>
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
