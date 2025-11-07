import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2, Brain, Download, Sparkles, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { EditReportDialog } from "@/components/admin/EditReportDialog";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  created_at: string;
  analysis_date: string | null;
  analysis_status: "on_review" | "processed" | null;
  analysis_id: string | null;
}

interface RecommendationReport {
  date: string;
  recommendations: Recommendation[];
  count: number;
  analysisId: string | null;
}

type SectionType = 'patient-data' | 'summary' | string;


export default function Recommendations() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const { isSuperAdmin } = useSuperAdminCheck();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reports, setReports] = useState<RecommendationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RecommendationReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          *,
          analyses!recommendations_analysis_id_fkey(date, status)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Преобразуем данные, добавляя analysis_date и status
      const transformedData = (data || []).map(rec => ({
        ...rec,
        analysis_date: rec.analyses?.date || null,
        analysis_status: rec.analyses?.status || null,
        analysis_id: rec.analysis_id || null
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
        analysisId: recs[0]?.analysis_id || null,
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReports(reportsList);
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отчёты",
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

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEdit = (report: RecommendationReport) => {
    setSelectedReport(report);
    setEditDialogOpen(true);
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

  const handleExportPDF = () => {
    if (!selectedReport) return;

    // Создаем окно для печати
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Ошибка",
        description: "Не удалось открыть окно печати. Проверьте настройки браузера.",
        variant: "destructive",
      });
      return;
    }

    const element = document.getElementById('report-content');
    if (!element) {
      toast({
        title: "Ошибка",
        description: "Не удалось найти контент для экспорта",
        variant: "destructive",
      });
      printWindow.close();
      return;
    }

    // Копируем стили
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Отчет от ${format(new Date(selectedReport.date), "dd-MM-yyyy")}</title>
          <style>
            ${styles}
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Даем время на загрузку стилей, затем печатаем
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
            Персональные отчёты
          </h2>
          <p className="text-muted-foreground">
            AI-генерированные отчёты на основе ваших анализов
          </p>
        </div>

        {reports.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative mb-6">
                <Brain className="h-20 w-20 text-primary/40" />
                <Sparkles className="h-8 w-8 text-accent absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 bg-gradient-primary bg-clip-text text-transparent">
                Ваши отчёты скоро появятся здесь
              </h3>
              <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                После добавления и анализа ваших медицинских показателей, 
                AI сгенерирует персональные отчёты для улучшения здоровья.
              </p>
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
                      <div className="flex items-center gap-2">
                        {format(new Date(report.date), "d MMMM yyyy", { locale: ru })}
                        {report.recommendations[0]?.analysis_status && (
                          <AnalysisStatusBadge status={report.recommendations[0].analysis_status} />
                        )}
                      </div>
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
                        {isSuperAdmin && isViewMode && report.analysisId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(report)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
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
          <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden">
            {selectedReport && (() => {
              const grouped = groupByType(selectedReport.recommendations);
              const patientData = grouped["Данные пациента"]?.[0];
              const summary = grouped["Общее резюме"]?.[0];
              const categories = Object.entries(grouped).filter(([type]) => 
                type !== "Общее резюме" && type !== "Данные пациента"
              );

              const sections = [
                ...(patientData ? [{ id: 'patient-data', label: 'Данные пациента' }] : []),
                ...(summary ? [{ id: 'summary', label: 'Общее резюме' }] : []),
                ...categories.map(([type]) => ({ id: type, label: type }))
              ];

              return (
                <div className="flex h-full">
                  {/* Mini Sidebar */}
                  <div className="w-64 border-r border-border bg-muted/30 backdrop-blur-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-border flex-shrink-0">
                      <h3 className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
                        Содержание
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })}
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-3 py-4">
                      <nav className="space-y-1">
                        {sections.map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={(e) => scrollToSection(section.id, e)}
                            className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            <span className="text-sm font-medium flex-1 line-clamp-2">
                              {section.label}
                            </span>
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-8 py-6 border-b border-border bg-gradient-to-r from-background to-muted/20 flex-shrink-0 flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          Персональный отчет
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                          Детальный анализ здоровья • {selectedReport.count} {selectedReport.count === 1 ? 'раздел' : 'разделов'}
                        </DialogDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Экспорт в PDF
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-6">
                      <div id="report-content" className="space-y-12 max-w-4xl">
                        {patientData && (
                          <div id="section-patient-data" className="scroll-mt-6">
                            <div className="prose prose-sm max-w-none">
                              <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10 shadow-sm">
                                <MarkdownContent content={patientData.text} />
                              </div>
                            </div>
                          </div>
                        )}

                        {summary && (
                          <div id="section-summary" className="scroll-mt-6">
                            <div className="prose prose-sm max-w-none">
                              <div className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border border-accent/10 shadow-sm">
                                <MarkdownContent content={summary.text} />
                              </div>
                            </div>
                          </div>
                        )}

                        {categories.map(([type, recs]) => (
                          <div key={type} id={`section-${type}`} className="scroll-mt-6">
                            <div className="prose prose-sm max-w-none space-y-4">
                              <div className="mb-6">
                                <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                                  {type}
                                </h2>
                                <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                              </div>
                              {recs.map((rec) => (
                                <div key={rec.id} className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                  <MarkdownContent content={rec.text} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Edit Report Dialog */}
        {selectedReport?.analysisId && (
          <EditReportDialog
            analysisId={selectedReport.analysisId}
            analysisStatus={selectedReport.recommendations[0]?.analysis_status || "on_review"}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onStatusChange={loadRecommendations}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Все данные отчёта за эту дату будут удалены навсегда.
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
