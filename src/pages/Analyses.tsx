import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FlaskConical, Sparkles, Trash2, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { CreateAnalysisWizard } from "@/components/admin/CreateAnalysisWizard";
import { EditAnalysisWizard } from "@/components/admin/EditAnalysisWizard";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Analysis {
  id: string;
  date: string;
  lab_name: string | null;
  health_index: number | null;
  biological_age: number | null;
  biomarkers_count?: number;
  status: "on_review" | "processed";
}

export default function Analyses() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const { isSuperAdmin } = useSuperAdminCheck();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAnalysisDialogOpen, setEditAnalysisDialogOpen] = useState(false);
  const [analysisToEdit, setAnalysisToEdit] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("analyses")
        .select("id, date, lab_name, health_index, biological_age, status")
        .eq("user_id", userId);

      if (error) throw error;

      // Сортируем по дате на клиенте (во избежание ошибок order("date"))
      const sorted = (data || []).sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Получаем количество биомаркеров для каждого анализа (не падать при ошибке)
      const analysesWithCounts = await Promise.all(
        sorted.map(async (analysis) => {
          const { count, error: countError } = await supabase
            .from("analysis_values")
            .select("*", { count: "exact", head: true })
            .eq("analysis_id", analysis.id);
          if (countError) {
            console.warn("Count error for analysis", analysis.id, countError);
          }
          return {
            ...analysis,
            biomarkers_count: count || 0,
          } as Analysis;
        })
      );
      
      setAnalyses(analysesWithCounts);
    } catch (error: any) {
      console.error("Error loading analyses:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить анализы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async () => {
    if (!analysisToDelete) return;

    try {
      const { error } = await supabase
        .from("analyses")
        .delete()
        .eq("id", analysisToDelete);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Анализ удалён",
      });

      setAnalyses(analyses.filter(a => a.id !== analysisToDelete));
    } catch (error: any) {
      console.error("Error deleting analysis:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить анализ",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAnalysisToDelete(null);
    }
  };


  if (loading && analyses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              История анализов
            </h2>
            <p className="text-muted-foreground">Отслеживайте динамику своих показателей</p>
          </div>
          {isViewMode && isSuperAdmin && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить анализ
            </Button>
          )}
        </div>

        {analyses.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative mb-6">
                <FlaskConical className="h-20 w-20 text-primary/40" />
                <Sparkles className="h-8 w-8 text-accent absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 bg-gradient-primary bg-clip-text text-transparent">
                Ваши анализы скоро появятся здесь
              </h3>
              <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                Администратор добавит результаты ваших анализов после их обработки. 
                Вы получите уведомление, когда данные будут готовы к просмотру.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="hover:shadow-neon-primary hover:border-primary/50 transition-all border-primary/20 bg-gradient-to-br from-card to-primary/5 group relative"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (isViewMode) {
                      setSimPath(`/analyses/${analysis.id}`);
                    } else {
                      navigate(`/analyses/${analysis.id}`);
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        {new Date(analysis.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </CardTitle>
                      <AnalysisStatusBadge status={analysis.status} className="ml-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      {analysis.lab_name && (
                        <p className="text-sm text-muted-foreground">{analysis.lab_name}</p>
                      )}
                      {analysis.biomarkers_count && analysis.biomarkers_count > 0 && (
                        <Badge 
                          variant="secondary"
                          className="text-xs"
                        >
                          {analysis.biomarkers_count} маркеров
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {analysis.health_index !== null ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Индекс здоровья:</span>
                          <span className="text-2xl font-bold text-primary">
                            {analysis.health_index}
                          </span>
                        </div>
                        {analysis.biological_age !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Био. возраст:</span>
                            <span className="text-lg font-semibold text-foreground">
                              {analysis.biological_age} лет
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Нажмите, чтобы добавить показатели
                      </p>
                    )}
                  </CardContent>
                </div>
                {isViewMode && isSuperAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisToEdit(analysis.id);
                        setEditAnalysisDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisToDelete(analysis.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить анализ?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Анализ и все связанные данные будут удалены навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAnalysis} className="bg-destructive hover:bg-destructive/90">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateAnalysisWizard 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onSuccess={loadAnalyses}
        />

        {analysisToEdit && (
          <EditAnalysisWizard
            analysisId={analysisToEdit}
            open={editAnalysisDialogOpen}
            onOpenChange={setEditAnalysisDialogOpen}
            onSuccess={loadAnalyses}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
