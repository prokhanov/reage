import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisStatusBadge } from "./AnalysisStatusBadge";
import { Loader2, Send } from "lucide-react";

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
  analysisStatus,
  open, 
  onOpenChange,
  onStatusChange 
}: EditReportDialogProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

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

  const handlePublishToClient = async () => {
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("analyses")
        .update({ status: "processed" })
        .eq("id", analysisId);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Отчет загружен в кабинет клиента",
      });

      onStatusChange?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Редактирование отчета</DialogTitle>
            <AnalysisStatusBadge status={analysisStatus} />
          </div>
          <DialogDescription>
            Проверьте и отредактируйте AI-сгенерированный отчет перед загрузкой клиенту
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="summary">Резюме</TabsTrigger>
              <TabsTrigger value="categories">По категориям</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="space-y-2">
                  <Label className="text-sm font-semibold">{rec.type}</Label>
                  <Textarea
                    value={rec.text}
                    onChange={(e) => updateRecommendation(rec.id, e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              {groupedRecommendations["Общее резюме"]?.map((rec) => (
                <div key={rec.id} className="space-y-2">
                  <Label className="text-sm font-semibold">{rec.type}</Label>
                  <Textarea
                    value={rec.text}
                    onChange={(e) => updateRecommendation(rec.id, e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              {Object.entries(groupedRecommendations).map(([type, recs]) => {
                if (type === "Общее резюме" || type === "Полный отчет") return null;
                return (
                  <div key={type} className="space-y-3">
                    <h3 className="font-semibold text-base">{type}</h3>
                    {recs.map((rec) => (
                      <div key={rec.id} className="space-y-2">
                        <Textarea
                          value={rec.text}
                          onChange={(e) => updateRecommendation(rec.id, e.target.value)}
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleSaveChanges}
            disabled={saving || loading}
            variant="outline"
            className="flex-1"
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
          
          {analysisStatus === "on_review" && (
            <Button
              onClick={handlePublishToClient}
              disabled={publishing || loading}
              className="flex-1"
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Загрузить в кабинет клиента
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
