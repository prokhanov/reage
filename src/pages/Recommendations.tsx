import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  created_at: string;
  analysis_date: string | null;
}

interface RecommendationReport {
  date: string;
  recommendations: Recommendation[];
  count: number;
}


export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reports, setReports] = useState<RecommendationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RecommendationReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          *,
          analyses!recommendations_analysis_id_fkey(date)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Преобразуем данные, добавляя analysis_date
      const transformedData = (data || []).map(rec => ({
        ...rec,
        analysis_date: rec.analyses?.date || null
      }));
      
      setRecommendations(transformedData);
      
      // Группировка по дате анализа (или created_at если анализа нет)
      const grouped = transformedData.reduce((acc, rec) => {
        const date = rec.analysis_date 
          ? format(new Date(rec.analysis_date), "yyyy-MM-dd")
          : format(new Date(rec.created_at), "yyyy-MM-dd");
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(rec);
        return acc;
      }, {} as Record<string, Recommendation[]>);

      const reportsList = Object.entries(grouped).map(([date, recs]) => ({
        date,
        recommendations: recs,
        count: recs.length,
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReports(reportsList);
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить рекомендации",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (report: RecommendationReport) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (report: RecommendationReport) => {
    setSelectedReport(report);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedReport) return;

    setDeleting(true);
    try {
      const ids = selectedReport.recommendations.map(r => r.id);
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отчет удален",
      });

      await loadRecommendations();
      setDeleteDialogOpen(false);
      setSelectedReport(null);
    } catch (error: any) {
      console.error("Error deleting report:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отчет",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const groupByType = (recommendations: Recommendation[]) => {
    return recommendations.reduce((acc, rec) => {
      if (!acc[rec.type]) {
        acc[rec.type] = [];
      }
      acc[rec.type].push(rec);
      return acc;
    }, {} as Record<string, Recommendation[]>);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Персональные рекомендации
          </h2>
          <p className="text-muted-foreground">
            AI-генерированные советы на основе ваших анализов
          </p>
        </div>

        {reports.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Рекомендации появятся скоро</h3>
              <p className="text-muted-foreground text-center mb-6">
                Добавьте анализы, и AI сгенерирует персональные рекомендации для вас
              </p>
              <Button onClick={() => navigate("/analyses")} className="shadow-neon-primary">
                Добавить анализ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата отчета</TableHead>
                  <TableHead>Разделов</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.date}>
                    <TableCell className="font-medium">
                      {format(new Date(report.date), "d MMMM yyyy", { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(report)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Отчет от {selectedReport && format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })}
              </DialogTitle>
              <DialogDescription>
                {selectedReport?.count} {selectedReport?.count === 1 ? 'раздел' : 'разделов'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              {selectedReport && Object.entries(groupByType(selectedReport.recommendations)).map(([type, recs]) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge variant="outline" className="text-base py-1">{type}</Badge>
                  </div>
                  {recs.map((rec) => (
                    <div key={rec.id} className="pl-4 py-2 border-l-2 border-primary/20">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {rec.text}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Все рекомендации за эту дату будут удалены навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
