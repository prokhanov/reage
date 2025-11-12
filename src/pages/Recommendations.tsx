import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2, Brain, Download, Sparkles, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";

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
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { RecommendationsSkeleton } from "@/components/skeletons/RecommendationsSkeleton";
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts;

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

interface Prescription {
  id: string;
  prescription: string;
  effect: string;
  control_date: string;
  status: "on_review" | "confirmed";
}

type SectionType = 'patient-data' | 'summary' | string;


export default function Recommendations() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const { hasPatientAccess, isSuperAdmin } = usePatientModuleAccess();
  const { demoMode, demoData, loading: demoLoading } = useDemoMode();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reports, setReports] = useState<RecommendationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RecommendationReport | null>(null);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Prescription[]>([]);
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
    if (demoMode && demoLoading) {
      return;
    }
    loadRecommendations();
  }, [demoMode, demoLoading]);

  const loadRecommendations = async () => {
    if (demoMode) {
      if (!demoData) {
        console.error("Demo mode active but demo data not loaded");
        setLoading(false);
        return;
      }
      
      // Group recommendations by analysis_index
      const groupedByAnalysis = demoData.recommendations.reduce((acc: any, r: any) => {
        const analysisIndex = r.analysis_index ?? 0;
        if (!acc[analysisIndex]) {
          acc[analysisIndex] = [];
        }
        acc[analysisIndex].push(r);
        return acc;
      }, {});
      
      // Create separate reports for each analysis
      const demoReports = Object.entries(groupedByAnalysis)
        .map(([analysisIndexStr, recs]: [string, any]) => {
          const analysisIndex = parseInt(analysisIndexStr);
          const analysis = demoData.analyses[analysisIndex];
          
          if (!analysis) {
            console.warn(`Analysis not found for index ${analysisIndex}`);
            return null;
          }
          
          const recommendations = recs.map((r: any, idx: number) => ({
            id: `demo-rec-${analysisIndex}-${idx}`,
            type: r.type,
            text: r.text,
            created_at: analysis.date,
            analysis_date: analysis.date,
            analysis_status: "processed" as const,
            analysis_id: `demo-analysis-${analysisIndex}`
          }));
          
          return {
            date: analysis.date,
            recommendations,
            count: recommendations.length,
            analysisId: `demo-analysis-${analysisIndex}`
          };
        })
        .filter(Boolean) as RecommendationReport[];
      
      // Sort by date descending (newest first)
      demoReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Flatten all recommendations for the recommendations state
      const allDemoRecommendations = demoReports.flatMap(report => report.recommendations);
      
      setRecommendations(allDemoRecommendations);
      setReports(demoReports);
      setLoading(false);
      return;
    }

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

  const handleView = async (report: RecommendationReport) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
    
    // Загружаем назначения для этого анализа
    if (demoMode && demoData?.prescriptions) {
      // Extract analysis index from analysisId (format: "demo-analysis-{index}")
      const analysisIndex = report.analysisId ? parseInt(report.analysisId.split('-')[2]) : 0;
      
      // Filter prescriptions for this specific analysis
      const filteredPrescriptions = demoData.prescriptions
        .filter((p: any) => (p.analysis_index ?? 0) === analysisIndex)
        .map((p: any, idx: number) => ({
          id: `demo-presc-${analysisIndex}-${idx}`,
          prescription: p.prescription,
          effect: p.effect,
          control_date: p.control_date,
          status: "confirmed" as const
        }));
      
      setSelectedPrescriptions(filteredPrescriptions);
    } else if (report.analysisId) {
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("analysis_id", report.analysisId)
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        
        // Фильтруем по статусу: для обычных пользователей только confirmed
        const filtered = hasPatientAccess 
          ? (data || [])
          : (data || []).filter(p => p.status === "confirmed");
        
        setSelectedPrescriptions(filtered);
      } catch (error) {
        console.error("Error loading prescriptions:", error);
        setSelectedPrescriptions([]);
      }
    } else {
      setSelectedPrescriptions([]);
    }
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

  const getSectionLabel = (type: SectionType) => {
    if (type === 'patient-data') return 'Данные пациента';
    if (type === 'summary') return 'Общее резюме';
    return type;
  };

  const parseInlineMarkdown = (text: string): any[] => {
    const parts: any[] = [];
    let currentText = text;
    
    // Обрабатываем жирный текст (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    
    let lastIndex = 0;
    let match;
    
    // Сначала находим все жирные фрагменты
    const segments: Array<{ start: number; end: number; text: string; bold?: boolean; italic?: boolean }> = [];
    
    while ((match = boldRegex.exec(currentText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ start: lastIndex, end: match.index, text: currentText.substring(lastIndex, match.index) });
      }
      segments.push({ start: match.index, end: match.index + match[0].length, text: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < currentText.length) {
      segments.push({ start: lastIndex, end: currentText.length, text: currentText.substring(lastIndex) });
    }
    
    // Если нет жирного текста, проверяем курсив
    if (segments.length === 0) {
      lastIndex = 0;
      while ((match = italicRegex.exec(currentText)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ start: lastIndex, end: match.index, text: currentText.substring(lastIndex, match.index) });
        }
        segments.push({ start: match.index, end: match.index + match[0].length, text: match[1], italic: true });
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < currentText.length) {
        segments.push({ start: lastIndex, end: currentText.length, text: currentText.substring(lastIndex) });
      }
    }
    
    // Если нет форматирования вообще, возвращаем как есть
    if (segments.length === 0) {
      return [{ text: currentText }];
    }
    
    // Конвертируем сегменты в формат pdfmake
    segments.forEach(segment => {
      if (segment.text) {
        const textObj: any = { text: segment.text };
        if (segment.bold) textObj.bold = true;
        if (segment.italic) textObj.italics = true;
        parts.push(textObj);
      }
    });
    
    return parts.length > 0 ? parts : [{ text: currentText }];
  };

  const parseMarkdownToPdfMake = (markdown: string): any[] => {
    const content: any[] = [];
    const lines = markdown.split('\n');
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Пустая строка
      if (!trimmedLine) {
        content.push({ text: ' ', margin: [0, 5, 0, 0] });
        continue;
      }
      
      // Заголовки
      if (line.startsWith('### ')) {
        const headerText = line.replace('### ', '');
        content.push({ text: parseInlineMarkdown(headerText), style: 'h3', margin: [0, 6, 0, 3] });
      } else if (line.startsWith('## ')) {
        const headerText = line.replace('## ', '');
        content.push({ text: parseInlineMarkdown(headerText), style: 'h2', margin: [0, 8, 0, 4] });
      } else if (line.startsWith('# ')) {
        const headerText = line.replace('# ', '');
        content.push({ text: parseInlineMarkdown(headerText), style: 'h1', margin: [0, 10, 0, 5] });
      }
      // Списки
      else if (line.match(/^[-*]\s/)) {
        const listText = line.replace(/^[-*]\s/, '');
        const parsedText = parseInlineMarkdown(listText);
        content.push({ 
          text: [{ text: '• ' }, ...parsedText],
          style: 'listItem', 
          margin: [20, 0, 0, 5] 
        });
      }
      // Обычный текст
      else {
        const parsedText = parseInlineMarkdown(line);
        content.push({ 
          text: parsedText, 
          style: 'paragraph', 
          margin: [0, 0, 0, 10] 
        });
      }
    }
    
    return content;
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

      // Загружаем назначения для PDF
      let prescriptions: Prescription[] = [];
      if (selectedReport.analysisId) {
        const { data } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("analysis_id", selectedReport.analysisId)
          .order("created_at", { ascending: true });
        
        prescriptions = hasPatientAccess 
          ? (data || [])
          : (data || []).filter(p => p.status === "confirmed");
      }

      const sections = [
        ...(patientData ? [{ 
          id: 'patient-data', 
          type: 'patient-data' as SectionType,
          label: 'Данные пациента', 
          content: patientData.text 
        }] : []),
        ...(summary ? [{ 
          id: 'summary', 
          type: 'summary' as SectionType,
          label: 'Общее резюме', 
          content: summary.text 
        }] : []),
        ...(prescriptions.length > 0 ? [{
          id: 'prescriptions',
          type: 'prescriptions' as SectionType,
          label: 'Назначения',
          content: prescriptions.map((p, idx) => 
            `**${idx + 1}. ${p.prescription}**\n\n*${p.effect}*\n\nДлительность: ${
              (() => {
                if (!selectedReport.date || !p.control_date) return "—";
                const start = new Date(selectedReport.date);
                const end = new Date(p.control_date);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";
                const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
                return `${months} мес.`;
              })()
            }, Контрольная дата: ${p.control_date && !isNaN(new Date(p.control_date).getTime()) 
              ? format(new Date(p.control_date), "dd.MM.yyyy")
              : "—"}`
          ).join('\n\n---\n\n')
        }] : []),
        ...categories.flatMap(([type, recs]) => 
          recs.map((rec, idx) => ({
            id: `${toSlug(type)}-${idx}`,
            type,
            label: `${type}${recs.length > 1 ? ` (${idx + 1})` : ''}`,
            content: rec.text
          }))
        )
      ];

      // Определяем структуру документа для pdfmake
      const docDefinition: any = {
        content: [
          // Заголовок
          {
            text: 'Персональный отчет',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          {
            text: selectedReport.date && !isNaN(new Date(selectedReport.date).getTime())
              ? format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })
              : 'Дата не указана',
            style: 'date',
            alignment: 'center',
            margin: [0, 0, 0, 30]
          },
          
          // Содержание
          {
            text: 'Содержание',
            style: 'tocHeader',
            margin: [0, 0, 0, 15]
          },
          ...sections.map((section, idx) => ({
            text: `${idx + 1}. ${section.label}`,
            style: 'tocItem',
            margin: [0, 0, 0, 8]
          })),
          
          // Разрыв страницы после содержания
          { text: '', pageBreak: 'after' },
          
          // Секции с контентом
          ...sections.flatMap((section, idx) => [
            ...(idx > 0 ? [{ text: '', pageBreak: 'before' }] : []),
            {
              text: section.label,
              style: 'sectionHeader',
              margin: [0, 0, 0, 15]
            },
            ...parseMarkdownToPdfMake(section.content)
          ])
        ],
        
        // Стили
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            color: '#000000'
          },
          date: {
            fontSize: 12,
            color: '#666666'
          },
          tocHeader: {
            fontSize: 16,
            bold: true,
            color: '#000000'
          },
          tocItem: {
            fontSize: 11,
            color: '#000000'
          },
          sectionHeader: {
            fontSize: 16,
            bold: true,
            color: '#000000',
            decoration: 'underline'
          },
          h1: {
            fontSize: 14,
            bold: true
          },
          h2: {
            fontSize: 13,
            bold: true
          },
          h3: {
            fontSize: 12,
            bold: true
          },
          paragraph: {
            fontSize: 11,
            lineHeight: 1.5,
            alignment: 'justify'
          },
          listItem: {
            fontSize: 11,
            lineHeight: 1.5
          }
        },
        
        // Настройки страницы
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        
        // Номера страниц
        footer: function(currentPage: number) {
          return {
            text: currentPage.toString(),
            alignment: 'center',
            fontSize: 9,
            margin: [0, 20, 0, 0]
          };
        },
        
        // Настройки документа
        info: {
          title: selectedReport.date && !isNaN(new Date(selectedReport.date).getTime())
            ? `Отчет ${format(new Date(selectedReport.date), "dd-MM-yyyy")}`
            : 'Отчет',
          author: 'Health System',
          subject: 'Персональный отчет',
        }
      };

      const fileName = selectedReport.date && !isNaN(new Date(selectedReport.date).getTime())
        ? `Отчет_${format(new Date(selectedReport.date), "dd-MM-yyyy")}.pdf`
        : 'Отчет.pdf';
      pdfMake.createPdf(docDefinition).download(fileName);
      
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
    return <RecommendationsSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {demoMode && <DemoBanner />}
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
                        {report.date && !isNaN(new Date(report.date).getTime()) 
                          ? format(new Date(report.date), "d MMMM yyyy", { locale: ru })
                          : "Дата не указана"}
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
                        {hasPatientAccess && isViewMode && report.analysisId && (
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
                ...(selectedPrescriptions.length > 0 ? [{ id: 'prescriptions', label: 'Назначения' }] : []),
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
                        {selectedReport.date && !isNaN(new Date(selectedReport.date).getTime())
                          ? format(new Date(selectedReport.date), "d MMMM yyyy", { locale: ru })
                          : "Дата не указана"}
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

                        {selectedPrescriptions.length > 0 && (
                          <div id="section-prescriptions" className="scroll-mt-6">
                            <div className="mb-6">
                              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                                Назначения
                              </h2>
                              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                            </div>
                            <div className="space-y-4">
                              {selectedPrescriptions.map((prescription, idx) => (
                                <div key={prescription.id} className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <h3 className="font-semibold text-lg flex-1">
                                      {idx + 1}. {prescription.prescription}
                                    </h3>
                                    <Badge variant={prescription.status === "confirmed" ? "default" : "secondary"}>
                                      {prescription.status === "confirmed" ? "Подтверждено" : "На проверке"}
                                    </Badge>
                                  </div>
                                  {prescription.effect && (
                                    <p className="text-sm text-muted-foreground mb-3 italic">
                                      {prescription.effect}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>
                                      Длительность: {(() => {
                                        if (!selectedReport?.date || !prescription.control_date) return "—";
                                        const start = new Date(selectedReport.date);
                                        const end = new Date(prescription.control_date);
                                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";
                                        const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
                                        return `${months} мес.`;
                                      })()}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Контрольная дата: {prescription.control_date && !isNaN(new Date(prescription.control_date).getTime())
                                        ? format(new Date(prescription.control_date), "dd.MM.yyyy")
                                        : "—"}
                                    </span>
                                  </div>
                                </div>
                              ))}
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
  );
}
