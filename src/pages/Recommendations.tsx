import { useEffect, useState, useContext, useRef } from "react";
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
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { EditReportDialog } from "@/components/admin/EditReportDialog";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import html2pdf from "html2pdf.js";
import { marked } from "marked";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const toSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");

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
    const container = contentRef.current;
    const target = document.getElementById(`section-${sectionId}`);
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop - 8;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else if (target) {
      // Fallback if container ref is not available
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleExportPDF = async () => {
    if (!selectedReport) return;

    try {
      const grouped = groupByType(selectedReport.recommendations);
      const patientData = grouped["Данные пациента"]?.[0];
      const summary = grouped["Общее резюме"]?.[0];
      const categories = Object.entries(grouped).filter(([type]) => 
        type !== "Общее резюме" && type !== "Данные пациента"
      );

      // Конвертируем markdown в HTML синхронно
      const sections = [
        ...(patientData ? [{ 
          id: 'patient-data', 
          label: 'Данные пациента', 
          content: await marked.parse(patientData.text) 
        }] : []),
        ...(summary ? [{ 
          id: 'summary', 
          label: 'Общее резюме', 
          content: await marked.parse(summary.text) 
        }] : []),
        ...(await Promise.all(categories.flatMap(([type, recs]) => 
          recs.map(async (rec, idx) => ({
            id: `${toSlug(type)}-${idx}`,
            label: `${type}${recs.length > 1 ? ` (${idx + 1})` : ''}`,
            content: await marked.parse(rec.text)
          }))
        )))
      ];

      // Создаем правильно отформатированный HTML для PDF с работающими якорями
      const pdfContent = `
        <style>
          * { 
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          .pdf-root {
            width: 100%;
            max-width: 170mm; /* уменьшаем ширину для полей */
            background: #ffffff;
            color: #000000;
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.6;
            font-size: 11pt;
            margin: 0 auto;
            padding: 0;
          }
          
          .pdf-root .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 1px solid #000;
          }
          .pdf-root .header h1 {
            font-size: 18pt;
            margin-bottom: 6px;
            font-weight: 700;
            color: #000;
          }
          .pdf-root .header .date { 
            font-size: 10pt; 
            color: #000;
          }

          .pdf-root .toc { 
            margin: 20px 0 25px; 
            page-break-after: always; 
          }
          .pdf-root .toc h2 {
            font-size: 13pt;
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
            margin-bottom: 12px;
            font-weight: 700;
            color: #000;
          }
          .pdf-root .toc-list { 
            list-style: none; 
            padding: 0; 
            margin: 0; 
          }
          .pdf-root .toc-item { 
            margin-bottom: 8px;
            border-bottom: 1px dotted #999; 
            padding: 6px 0;
          }
          .pdf-root .toc-link {
            color: #000;
            text-decoration: none;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .pdf-root .toc-link span:first-child {
            flex: 1;
            padding-right: 10px;
          }

          .pdf-root .section { 
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .pdf-root .section-header {
            font-size: 13pt;
            font-weight: 700;
            padding: 8px 0;
            border-bottom: 2px solid #000;
            margin: 0 0 12px 0;
            color: #000;
          }
          .pdf-root .section-content { 
            font-size: 10.5pt;
            line-height: 1.6;
          }

          /* Типографика */
          .pdf-root .section-content * {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .pdf-root .section-content p { 
            margin: 0 0 12px 0;
            text-align: left;
            line-height: 1.6;
          }
          
          .pdf-root .section-content h1,
          .pdf-root .section-content h2,
          .pdf-root .section-content h3,
          .pdf-root .section-content h4 {
            color: #000;
            font-weight: 700;
            margin: 15px 0 10px 0;
            line-height: 1.3;
            text-align: left;
            page-break-after: avoid;
          }
          .pdf-root .section-content h1 { font-size: 13pt; }
          .pdf-root .section-content h2 { font-size: 12pt; }
          .pdf-root .section-content h3 { font-size: 11pt; }
          .pdf-root .section-content h4 { font-size: 10.5pt; }
          
          .pdf-root .section-content ul, 
          .pdf-root .section-content ol { 
            margin: 0 0 12px 0;
            padding-left: 20px;
            text-align: left;
          }
          .pdf-root .section-content li { 
            margin: 0 0 6px 0;
            line-height: 1.6;
            text-align: left;
          }
          .pdf-root .section-content li p {
            margin: 0 0 4px 0;
          }
          
          .pdf-root .section-content strong { 
            font-weight: 700; 
            color: #000;
          }
          .pdf-root .section-content em { 
            font-style: italic; 
          }
          .pdf-root .section-content code {
            font-family: 'Courier New', monospace;
            font-size: 9.5pt;
            background: #f5f5f5;
            padding: 1px 3px;
          }
          .pdf-root .section-content pre {
            background: #f5f5f5;
            padding: 8px;
            overflow-x: auto;
            margin: 0 0 12px 0;
            page-break-inside: avoid;
          }
          .pdf-root .section-content blockquote { 
            border-left: 3px solid #000; 
            padding-left: 12px; 
            margin: 12px 0;
            font-style: italic;
            color: #333;
          }

          .pdf-root .section-content table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 12px 0;
            page-break-inside: avoid;
          }
          .pdf-root .section-content th, 
          .pdf-root .section-content td { 
            border: 1px solid #000; 
            padding: 5px 7px; 
            text-align: left;
            vertical-align: top;
          }
          .pdf-root .section-content th { 
            font-weight: 700;
            background: #f5f5f5;
          }
          
          .pdf-root .section-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 12px 0;
          }
        </style>
        <div class="pdf-root">
          <div class="header">
            <h1>Персональный отчет</h1>
            <div class="date">${format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })}</div>
          </div>
          <div class="toc">
            <h2>Содержание</h2>
            <ul class="toc-list">
              ${sections.map((section, idx) => `
                <li class="toc-item">
                  <a href="#section-${section.id}" class="toc-link">
                    <span>${section.label}</span>
                    <span>${idx + 1}</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
          ${sections.map((section) => `
            <div class="section" id="section-${section.id}">
              <div class="section-header">${section.label}</div>
              <div class="section-content">${section.content}</div>
            </div>
          `).join('')}
        </div>
      `;

      // Создаем временный элемент только с изолированным содержимым
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-10000px';
      tempDiv.style.top = '0';
      tempDiv.style.zIndex = '-1';
      tempDiv.innerHTML = pdfContent;
      document.body.appendChild(tempDiv);

      const fileName = `Отчет_${format(new Date(selectedReport.date), "dd-MM-yyyy")}.pdf`;
      
      const opt = {
        margin: [20, 20, 25, 20] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { 
          mode: ['css', 'legacy'],
          avoid: ['li', 'tr', 'img', '.section-header']
        },
      };

      const worker = html2pdf().set(opt).from(tempDiv.querySelector('.pdf-root') as HTMLElement);
      
      // Генерируем PDF и добавляем номера страниц
      const pdf = await worker.toPdf().get('pdf');
      const totalPages = pdf.internal.pages.length - 1; // Вычитаем пустую первую страницу
      
      // Добавляем номера страниц в футер
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        const pageText = `Страница ${i} из ${totalPages}`;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const textWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, (pageWidth - textWidth) / 2, pdf.internal.pageSize.getHeight() - 10);
      }
      
      pdf.save(fileName);
      
      // Удаляем временный элемент
      document.body.removeChild(tempDiv);
      
      toast({
        title: "Успешно",
        description: "PDF файл загружен",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать PDF",
        variant: "destructive",
      });
    }
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
          <DialogContent className="h-[90vh] w-[95vw] max-w-7xl p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Персональный отчет</DialogTitle>
              <DialogDescription>Детальный анализ здоровья</DialogDescription>
            </DialogHeader>
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
                ...categories.map(([type]) => ({ id: toSlug(type), label: type }))
              ];

              return (
                <div className="flex h-full min-h-0">
                  {/* Mini Sidebar */}
                  <div className="w-64 border-r border-border bg-muted/30 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden">
                    <div className="p-6 border-b border-border flex-shrink-0">
                      <h3 className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
                        Содержание
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })}
                      </p>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
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
                  <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-8 py-6 border-b border-border bg-gradient-to-r from-background to-muted/20 flex-shrink-0 flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          Персональный отчет
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                          Детальный анализ здоровья • {selectedReport.count} {selectedReport.count === 1 ? 'раздел' : 'разделов'}
                        </DialogDescription>
                      </div>
                      <button
                        onClick={handleExportPDF}
                        className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Скачать PDF
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6" ref={contentRef}>
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
                          <div key={type} id={`section-${toSlug(type)}`} className="scroll-mt-6">
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
