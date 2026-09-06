import { useEffect, useState, useContext } from "react";
import { DataTableShell, EmptyState, RowActionItem, RowActions } from "@/components/ui/data-table";
import { PageContainer, PageHeader } from "@/components/layout/Page";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FlaskConical, Trash2, Plus, Edit, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";

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

  const handlePrintAnalyses = async () => {
    const uid = await getUserId();
    const url = isViewMode && uid
      ? `/analyses/print?uid=${encodeURIComponent(uid)}`
      : "/analyses/print";

    // В Lovable Preview приложение запущено внутри iframe: новая вкладка получает
    // другой storage-partition и не видит текущую auth-сессию. Поэтому в preview
    // открываем печатную страницу в текущем окне; на боевом сайте — в новой вкладке.
    let isEmbeddedPreview = false;
    try {
      isEmbeddedPreview = window.self !== window.top;
    } catch {
      isEmbeddedPreview = true;
    }

    if (isEmbeddedPreview) {
      window.location.assign(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
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
      <PageContainer>
        {loading && analyses.length === 0 && <AnalysisCardSkeleton />}
        {(!loading || analyses.length > 0) && (
          <>
            <PageHeader
              title="История анализов"
              description="Отслеживайте динамику своих показателей"
              actions={
                <>
                  {displayAnalyses.length > 0 && !demoMode && (
                    <Button onClick={handlePrintAnalyses} variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-2" />
                      Скачать PDF
                    </Button>
                  )}
                  {isViewMode && hasPatientAccess && (
                    <Button onClick={() => setCreateDialogOpen(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить анализ
                    </Button>
                  )}
                </>
              }
            />

            {displayAnalyses.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="Ваши анализы скоро появятся здесь"
                description="Администратор добавит результаты ваших анализов после их обработки. Вы получите уведомление, когда данные будут готовы к просмотру."
              />
            ) : (
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Лаборатория</TableHead>
                      <TableHead className="text-center">Маркеров</TableHead>
                      <TableHead className="text-center">Индекс здоровья</TableHead>
                      <TableHead className="text-center">Био. возраст</TableHead>
                      <TableHead className="text-center">Статус</TableHead>
                      {isViewMode && hasPatientAccess && (
                        <TableHead className="text-right">Действия</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAnalyses.map((analysis) => (
                      <TableRow
                        key={analysis.id}
                        className="cursor-pointer"
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
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.7} />
                            <span className="font-medium whitespace-nowrap">
                              {new Date(analysis.date).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {analysis.lab_name || "—"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {analysis.biomarkers_count && analysis.biomarkers_count > 0
                            ? analysis.biomarkers_count
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-medium">
                          {analysis.health_index !== null
                            ? analysis.health_index
                            : <span className="font-normal text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center tabular-nums whitespace-nowrap">
                          {analysis.biological_age !== null
                            ? `${Math.round(analysis.biological_age * 10) / 10} лет`
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <AnalysisStatusBadge status={analysis.status} />
                        </TableCell>
                        {isViewMode && hasPatientAccess && (
                          <TableCell className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <RowActions label="Действия с анализом">
                              <RowActionItem
                                icon={Edit}
                                onSelect={() => {
                                  setAnalysisToEdit(analysis.id);
                                  setEditAnalysisDialogOpen(true);
                                }}
                              >
                                Редактировать
                              </RowActionItem>
                              <RowActionItem
                                icon={Trash2}
                                destructive
                                onSelect={() => {
                                  setAnalysisToDelete(analysis.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                Удалить анализ
                              </RowActionItem>
                            </RowActions>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            )}
          </>
        )}
      </PageContainer>

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
