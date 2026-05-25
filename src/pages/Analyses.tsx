import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FlaskConical, Sparkles, Trash2, Plus, Edit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";
import { DemoBanner } from "@/components/DemoBanner";

import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { CreateAnalysisWizard } from "@/components/admin/CreateAnalysisWizard";
import { EditAnalysisWizard } from "@/components/admin/EditAnalysisWizard";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { AnalysisCardSkeleton } from "@/components/skeletons/AnalysisCardSkeleton";
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
  const { hasPatientAccess } = usePatientModuleAccess();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
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
    if (demoMode && demoLoading) {
      return;
    }
    loadAnalyses();
  }, [demoMode, demoLoading]);

  const loadAnalyses = async () => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    
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

      // Показываем список сразу — счётчики догрузим вторым запросом,
      // чтобы пустой экран не висел из-за медленного COUNT через прокси.
      setAnalyses(sorted.map((a: any) => ({ ...a, biomarkers_count: 0 })) as Analysis[]);
      setLoading(false);

      const ids = sorted.map((a: any) => a.id);
      if (ids.length === 0) return;

      // Один групповой запрос вместо N+1 HEAD-запросов с count=exact.
      const { data: values, error: valuesError } = await supabase
        .from("analysis_values")
        .select("analysis_id")
        .in("analysis_id", ids);

      if (valuesError) {
        console.warn("Failed to load biomarker counts:", valuesError);
        return;
      }

      const counts = new Map<string, number>();
      (values || []).forEach((v: any) => {
        counts.set(v.analysis_id, (counts.get(v.analysis_id) || 0) + 1);
      });

      setAnalyses(
        sorted.map((a: any) => ({
          ...a,
          biomarkers_count: counts.get(a.id) || 0,
        })) as Analysis[]
      );
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


  const displayAnalyses = demoMode && demoData
    ? demoData.analyses.map((analysis: any, index: number) => ({
        id: `demo-analysis-${index}`,
        date: analysis.date,
        lab_name: analysis.lab_name,
        health_index: analysis.health_index,
        biological_age: analysis.biological_age,
        biomarkers_count: demoData.biomarkers
          .filter((b: any) => (b.analysis_index || 0) === index)
          .filter((b: any) => DEMO_TO_DB_CODE[b.code] !== undefined)
          .length,
        status: "processed" as const
      }))
    : analyses;

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
        {loading && analyses.length === 0 && <AnalysisCardSkeleton />}
        {(!loading || analyses.length > 0) && (
          <>
            <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              История анализов
            </h2>
            <p className="text-muted-foreground">Отслеживайте динамику своих показателей</p>
          </div>
          {isViewMode && hasPatientAccess && (
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

        {displayAnalyses.length === 0 ? (
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
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="rounded-md border-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="font-semibold">Дата</TableHead>
                    <TableHead className="font-semibold">Лаборатория</TableHead>
                    <TableHead className="font-semibold text-center">Маркеров</TableHead>
                    <TableHead className="font-semibold text-center">Индекс здоровья</TableHead>
                    <TableHead className="font-semibold text-center">Био. возраст</TableHead>
                    <TableHead className="font-semibold text-center">Статус</TableHead>
                    {isViewMode && hasPatientAccess && (
                      <TableHead className="font-semibold text-right">Действия</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayAnalyses.map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/30"
                      onClick={() => {
                        if (isViewMode) {
                          setSimPath(`/analyses/${analysis.id}`);
                        } else {
                          navigate(`/analyses/${analysis.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium">
                            {new Date(analysis.date).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {analysis.lab_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {analysis.biomarkers_count && analysis.biomarkers_count > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {analysis.biomarkers_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {analysis.health_index !== null ? (
                          <span className="text-lg font-bold text-primary">
                            {analysis.health_index}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {analysis.biological_age !== null ? (
                          <span className="font-semibold text-foreground">
                            {Math.round(analysis.biological_age * 10) / 10} лет
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <AnalysisStatusBadge status={analysis.status} />
                      </TableCell>
                      {isViewMode && hasPatientAccess && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
        </>
      )}
      </div>

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
  </>
  );
}
