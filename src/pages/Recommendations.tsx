import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Brain, Download, Sparkles, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";

import { MarkdownContent } from "@/components/MarkdownContent";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
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
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import {
  PdfBiomarkerData,
  parseMarkdownToPdfContent,
  PDF_STYLES,
  imageToBase64,
  buildCoverPageContent,
  buildCoverBackground,
} from "@/lib/pdfExportHelpers";
import coverBgUrl from "@/assets/pdf-cover-bg.jpg";
import logoLightUrl from "@/assets/reage-logo-light.png";
import { renderInterleavedWeb, buildInterleavedPdf } from "@/lib/anchorRenderer";
import { parseReportSnapshot, type ReportSnapshot } from "@/lib/reportSnapshot";
import { renderSnapshotWeb, buildSnapshotPdf } from "@/lib/snapshotRenderer";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { AdvisorySections } from "@/components/prescriptions/AdvisorySections";
import { buildPrescriptionsPdf } from "@/lib/pdfPrescriptions";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  content_json?: any;
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
  name?: string | null;
  form?: string | null;
  dosage?: string | null;
  how_to_take?: string | null;
  duration?: string | null;
  reason: string | null;
  effect: string;
  control_date: string;
  status: "on_review" | "confirmed";
}

type SectionType = 'patient-data' | 'summary' | string;


export default function Recommendations() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const { hasPatientAccess, loading: accessLoading } = usePatientModuleAccess();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reports, setReports] = useState<RecommendationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RecommendationReport | null>(null);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Prescription[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [webBiomarkers, setWebBiomarkers] = useState<PdfBiomarkerData[]>([]);
  const [patientAge, setPatientAge] = useState(40);
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
  const [biomarkersLoading, setBiomarkersLoading] = useState(false);
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
    if (demoLoading || accessLoading) {
      return;
    }
    loadRecommendations();
  }, [demoMode, demoLoading, accessLoading]);

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

  /**
   * Pure fetcher: returns biomarker dataset + patient age/gender for the given analysis.
   * Does NOT touch component state — callers decide whether to push it into state
   * (for the on-screen view) or just consume it directly (for the PDF export).
   */
  const fetchReportBiomarkers = async (
    analysisId: string | null,
  ): Promise<{ biomarkers: PdfBiomarkerData[]; age: number; gender: 'male' | 'female' }> => {
    if (!analysisId) {
      return { biomarkers: [], age: 40, gender: 'male' };
    }
    try {
      // --- Demo mode: build biomarkers from demoData + DB metadata ---
      if (demoMode && demoData && analysisId.startsWith('demo-analysis-')) {
        const analysisIndex = parseInt(analysisId.split('-')[2]) || 0;
        const age = demoData.profile?.chronological_age || 40;
        const gender: 'male' | 'female' = demoData.profile?.gender === 'female' ? 'female' : 'male';

        // Filter demo biomarkers for this analysis and map codes
        const analysisBiomarkers = demoData.biomarkers
          .filter((b: any) => (b.analysis_index || 0) === analysisIndex)
          .map((b: any) => ({ ...b, code: DEMO_TO_DB_CODE[b.code] || b.code }));

        const uniqueCodes = [...new Set(analysisBiomarkers.map((b: any) => b.code))];

        const { data: biomarkersMetadata } = await supabase
          .from('biomarkers')
          .select('*')
          .in('code', uniqueCodes);

        const metadataMap = new Map((biomarkersMetadata || []).map((b: any) => [b.code, b]));

        const biomarkers = analysisBiomarkers
          .map((b: any) => {
            const meta = metadataMap.get(b.code);
            if (!meta) return null;
            const statusInfo = getBiomarkerStatus(b.value, meta, age, gender);
            const optMin = gender === 'female' ? (meta.optimal_min_female ?? meta.optimal_min) : (meta.optimal_min_male ?? meta.optimal_min);
            const optMax = gender === 'female' ? (meta.optimal_max_female ?? meta.optimal_max) : (meta.optimal_max_male ?? meta.optimal_max);
            const normMin = gender === 'female' ? (meta.normal_min_female ?? meta.normal_min) : (meta.normal_min_male ?? meta.normal_min);
            const normMax = gender === 'female' ? (meta.normal_max_female ?? meta.normal_max) : (meta.normal_max_male ?? meta.normal_max);
            const rangeDisplay = optMin != null && optMax != null
              ? `${optMin}–${optMax}` : normMin != null && normMax != null
                ? `${normMin}–${normMax}` : "";
            return {
              id: meta.id, name: meta.name, code: meta.code, value: b.value,
              unit: b.unit || meta.unit, category: meta.category,
              biomarker: meta, status: statusInfo.status, statusLabel: statusInfo.label, rangeDisplay,
            };
          })
          .filter(Boolean) as PdfBiomarkerData[];

        return { biomarkers, age, gender };
      }

      // --- Production mode: load from DB ---
      let age = 40;
      let gender: 'male' | 'female' = 'male';

      const userId = await getUserId();
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("birth_date, gender")
          .eq("id", userId)
          .single();
        if (profile) {
          gender = (profile.gender === 'female') ? 'female' : 'male';
          const birth = new Date(profile.birth_date);
          age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
      }

      const { data: valuesData } = await supabase
        .from("analysis_values")
        .select("value, unit_override, biomarker_id, biomarkers!inner(id, name, code, unit, category, display_order, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female, range_mode, age_ranges)")
        .eq("analysis_id", analysisId);

      if (valuesData) {
        const biomarkers = valuesData.map((v: any) => {
          const b = v.biomarkers;
          const statusInfo = getBiomarkerStatus(v.value, b, age, gender);
          const optMin = gender === 'female' ? (b.optimal_min_female ?? b.optimal_min) : (b.optimal_min_male ?? b.optimal_min);
          const optMax = gender === 'female' ? (b.optimal_max_female ?? b.optimal_max) : (b.optimal_max_male ?? b.optimal_max);
          const normMin = gender === 'female' ? (b.normal_min_female ?? b.normal_min) : (b.normal_min_male ?? b.normal_min);
          const normMax = gender === 'female' ? (b.normal_max_female ?? b.normal_max) : (b.normal_max_male ?? b.normal_max);
          const rangeDisplay = optMin != null && optMax != null
            ? `${optMin}–${optMax}` : normMin != null && normMax != null
              ? `${normMin}–${normMax}` : "";
          return {
            id: v.biomarker_id || b.id,
            name: b.name, code: b.code, value: v.value,
            unit: v.unit_override || b.unit, category: b.category,
            biomarker: b, status: statusInfo.status, statusLabel: statusInfo.label, rangeDisplay,
          };
        });
        return { biomarkers, age, gender };
      }
      return { biomarkers: [], age, gender };
    } catch (error) {
      console.error("Error loading biomarkers for report:", error);
      return { biomarkers: [], age: 40, gender: 'male' };
    }
  };

  /** Loads biomarkers for the on-screen viewer (pushes them into component state). */
  const loadBiomarkersForReport = async (analysisId: string | null) => {
    setBiomarkersLoading(true);
    try {
      const { biomarkers, age, gender } = await fetchReportBiomarkers(analysisId);
      setPatientAge(age);
      setPatientGender(gender);
      setWebBiomarkers(biomarkers);
    } finally {
      setBiomarkersLoading(false);
    }
  };

  const handleView = async (report: RecommendationReport) => {
    setSelectedReport(report);
    setViewDialogOpen(true);

    let freshReport = report;

    if (!demoMode && report.analysisId) {
      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          *,
          analyses!recommendations_analysis_id_fkey(date, status)
        `)
        .eq("analysis_id", report.analysisId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const freshRecommendations = data.map((rec: any) => ({
          ...rec,
          analysis_date: rec.analyses?.date || null,
          analysis_status: rec.analyses?.status || null,
          analysis_id: rec.analysis_id || null,
        }));

        freshReport = {
          ...report,
          recommendations: freshRecommendations,
          count: freshRecommendations.length,
        };
        setSelectedReport(freshReport);
      }
    }
    
    // Load biomarkers for interleaved rendering
    loadBiomarkersForReport(freshReport.analysisId);
    
    // Загружаем назначения для этого анализа
    if (demoMode && demoData?.prescriptions) {
      // Extract analysis index from analysisId (format: "demo-analysis-{index}")
      const analysisIndex = freshReport.analysisId ? parseInt(freshReport.analysisId.split('-')[2]) : 0;
      
      // Filter prescriptions for this specific analysis
      const filteredPrescriptions = demoData.prescriptions
        .filter((p: any) => (p.analysis_index ?? 0) === analysisIndex)
        .map((p: any, idx: number) => ({
          id: `demo-presc-${analysisIndex}-${idx}`,
          prescription: p.prescription,
          reason: p.reason || null,
          effect: p.effect,
          control_date: p.control_date,
          status: "confirmed" as const
        }));
      
      setSelectedPrescriptions(filteredPrescriptions);
    } else if (freshReport.analysisId) {
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("analysis_id", freshReport.analysisId)
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
    const target = document.getElementById(`section-${sectionId}`);
    if (!target) {
      console.warn(`[scrollToSection] Element not found: section-${sectionId}`);
      return;
    }
    // scrollIntoView корректно работает в любом скролл-контейнере
    // (включая Radix Dialog), без ручных расчётов offset.
    target.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // parseInlineMarkdown / cleanMarkdownEscapes / parseMarkdownToPdfMake removed — now in shared pdfExportHelpers

  const handleExportPDF = async () => {
    if (!selectedReport) return;

    try {
      // Load cover assets in parallel
      const [bgBase64, logoBase64] = await Promise.all([
        imageToBase64(coverBgUrl),
        imageToBase64(logoLightUrl),
      ]);

      // Get patient name
      let patientName = '';
      const userId = await getUserId();
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();
        if (profile) {
          patientName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        }
      }

      const grouped = groupByType(selectedReport.recommendations);
      const patientData = grouped["Данные пациента"]?.[0];
      const summary = grouped["Общее резюме"]?.[0];
      const prescriptionsRec = grouped["Назначения"]?.[0];
      const lifestylePdf = (prescriptionsRec?.content_json?.lifestyle || {}) as {
        nutrition?: string[]; activity?: string[]; sleep?: string[];
      };
      const followUpsPdf = (prescriptionsRec?.content_json?.follow_ups || []) as Array<{
        specialist?: string; goal?: string; trigger?: string;
      }>;
      const categories = Object.entries(grouped).filter(([type]) =>
        type !== "Общее резюме" && type !== "Данные пациента" && type !== "Назначения"
      );

      // Load prescriptions
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

      // Always fetch fresh biomarkers for the PDF — relying on `webBiomarkers` from
      // state caused the export to ship empty data (no scales/colors, "0 биомаркеров"
      // on the cover) when the user opened the dialog and clicked Download before
      // the async load finished, or when the export is triggered without first
      // opening the viewer.
      const { biomarkers: pdfBiomarkers, age: pdfAge, gender: pdfGender } =
        await fetchReportBiomarkers(selectedReport.analysisId);

      // Try to use the structured snapshot for the main body.
      // When present, it replaces summary + per-system category sections with
      // a single coherent "Анализ здоровья" section rendered through the unified
      // snapshotRenderer (UUID-based biomarker matching).
      const snapshotResult = summary?.content_json
        ? parseReportSnapshot(summary.content_json)
        : null;
      const snapshot: ReportSnapshot | null =
        snapshotResult && snapshotResult.ok ? snapshotResult.snapshot : null;
      const snapshotSections = snapshot
        ? snapshot.blocks.reduce((acc, block) => {
            if (block.type === 'section') {
              acc.push({
                id: `snapshot-${acc.length}`,
                type: 'snapshot-section' as SectionType,
                label: block.title,
                blocks: [] as ReportSnapshot['blocks'],
              });
              return acc;
            }
            if (acc.length === 0) {
              acc.push({
                id: 'snapshot-0',
                type: 'snapshot-section' as SectionType,
                label: 'Анализ здоровья',
                blocks: [] as ReportSnapshot['blocks'],
              });
            }
            acc[acc.length - 1].blocks.push(block);
            return acc;
          }, [] as Array<{ id: string; type: SectionType; label: string; blocks: ReportSnapshot['blocks'] }>)
        : [];

      // Build sections
      const sections = [
        ...(patientData ? [{ 
          id: 'patient-data', 
          type: 'patient-data' as SectionType,
          label: 'Данные пациента', 
          content: patientData.text 
        }] : []),
        ...(snapshot
          ? snapshotSections.map((section) => ({
              ...section,
              content: '', // rendered from snapshot blocks, не из markdown
            }))
          : [
              ...(summary ? [{ 
                id: 'summary', 
                type: 'summary' as SectionType,
                label: 'Общее резюме', 
                content: summary.text 
              }] : []),
              ...categories.flatMap(([type, recs]) => 
                recs.map((rec, idx) => ({
                  id: `${toSlug(type)}-${idx}`,
                  type,
                  label: `${type}${recs.length > 1 ? ` (${idx + 1})` : ''}`,
                  content: rec.text
                }))
              )
            ]),
        ...((() => {
          const hasLs =
            (lifestylePdf.nutrition?.length || 0) +
              (lifestylePdf.activity?.length || 0) +
              (lifestylePdf.sleep?.length || 0) >
            0;
          const hasFu = followUpsPdf.length > 0;
          if (prescriptions.length === 0 && !hasLs && !hasFu) return [];

          // Передаём СТРУКТУРИРОВАННЫЕ данные дальше — рендер «Назначений»
          // в PDF полностью повторяет визуал PrescriptionCard + AdvisorySections
          // через buildPrescriptionsPdf (см. src/lib/pdfPrescriptions.ts).
          // Раньше тут собирался markdown, из-за чего колонки/блоки в PDF
          // выглядели иначе, чем в личном кабинете.
          return [
            {
              id: "prescriptions",
              type: "prescriptions" as SectionType,
              label: "Назначения",
              content: "",
              prescriptionsData: {
                prescriptions,
                lifestyle: lifestylePdf,
                followUps: followUpsPdf,
              },
            },
          ];
        })()),
      ];

      const barWidth = 515;
      const barHeight = 10;

      const buildSectionContent = (section: typeof sections[0]): any[] => {
        // Snapshot-based body (UUID-binding) — single source of truth.
        if (section.type === 'snapshot-section' && snapshot && (section as any).blocks) {
          return buildSnapshotPdf(
            { ...snapshot, blocks: (section as any).blocks },
            pdfBiomarkers,
            barWidth,
            pdfAge,
            pdfGender,
          );
        }
        // Структурированные «Назначения» — карточки 1:1 с личным кабинетом.
        if (section.type === 'prescriptions' && (section as any).prescriptionsData) {
          return buildPrescriptionsPdf((section as any).prescriptionsData);
        }
        // Legacy per-category body (anchor parsing fallback for old reports).
        const isCategory = section.type !== 'patient-data' && section.type !== 'summary' && section.type !== 'prescriptions' && section.type !== 'snapshot';
        if (isCategory && pdfBiomarkers.length > 0) {
          const catBio = pdfBiomarkers.filter(b => b.category === section.type);
          if (catBio.length > 0) {
            return buildInterleavedPdf(section.content, catBio, barWidth, barHeight, pdfAge, pdfGender);
          }
        }
        return parseMarkdownToPdfContent(section.content);
      };

      const dateFormatted = selectedReport.date && !isNaN(new Date(selectedReport.date).getTime())
        ? format(new Date(selectedReport.date), "dd.MM.yyyy")
        : '';

      const docDefinition: any = {
        content: [
          ...buildCoverPageContent(patientName, dateFormatted, pdfBiomarkers.length, logoBase64),
          { text: 'Содержание', style: 'tocHeader', margin: [0, 0, 0, 15] },
          ...sections.map((section, idx) => ({
            text: `${idx + 1}. ${section.label}`,
            style: 'tocItem', margin: [0, 0, 0, 8]
          })),
          { text: '', pageBreak: 'after' },
          ...sections.flatMap((section, idx) => [
            ...(idx > 0 ? [{ text: '', pageBreak: 'before' }] : []),
            { text: section.label, style: 'sectionHeader', margin: [0, 0, 0, 15] },
            ...buildSectionContent(section)
          ])
        ],
        background: buildCoverBackground(bgBase64),
        styles: PDF_STYLES,
        pageSize: 'A4',
        pageMargins: [40, 50, 40, 50],
        footer: (currentPage: number) => {
          if (currentPage === 1) return null;
          return {
            text: (currentPage - 1).toString(),
            alignment: 'center', fontSize: 9, margin: [0, 15, 0, 0]
          };
        },
        info: {
          title: dateFormatted ? `Отчет ${dateFormatted}` : 'Отчет',
          author: 'ReAge',
          subject: 'Персональный отчет',
        }
      };

      const fileName = dateFormatted ? `Отчет_${dateFormatted}.pdf` : 'Отчет.pdf';
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

  if (loading || accessLoading) {
    return <RecommendationsSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Персональные отчёты
        </h2>
        <p className="text-muted-foreground">
          Персонализированные отчёты на основе ваших анализов
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
                система сгенерирует персональные отчёты для улучшения здоровья.
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
                  <TableRow 
                    key={report.date} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleView(report)}
                  >
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
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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
              const prescriptionsRec = grouped["Назначения"]?.[0];
              const lifestyleData = prescriptionsRec?.content_json?.lifestyle as
                | { nutrition?: string[]; activity?: string[]; sleep?: string[] }
                | undefined;
              const followUpsData = prescriptionsRec?.content_json?.follow_ups as
                | Array<{ specialist?: string; goal?: string; trigger?: string }>
                | undefined;
              const hasLifestyle =
                !!lifestyleData &&
                ((lifestyleData.nutrition?.length || 0) +
                  (lifestyleData.activity?.length || 0) +
                  (lifestyleData.sleep?.length || 0) >
                  0);
              const hasFollowUps = !!followUpsData && followUpsData.length > 0;
              const hasPrescriptionsBlock =
                selectedPrescriptions.length > 0 || hasLifestyle || hasFollowUps;
              console.log("[ReportModal] prescription block diag", {
                groupedTypes: Object.keys(grouped),
                hasPrescriptionsRec: !!prescriptionsRec,
                hasContentJson: !!prescriptionsRec?.content_json,
                hasLifestyle,
                hasFollowUps,
                nutraceuticals: selectedPrescriptions.length,
              });
              const categories = Object.entries(grouped).filter(([type]) =>
                type !== "Общее резюме" && type !== "Данные пациента" && type !== "Назначения"
              );

              // Try to extract a structured ReportSnapshot from the summary recommendation.
              // If valid, the entire body (summary + per-system blocks) is rendered through
              // the unified snapshotRenderer; the legacy category fallback is used otherwise.
              const snapshotResult = summary?.content_json
                ? parseReportSnapshot(summary.content_json)
                : null;
              const snapshot: ReportSnapshot | null =
                snapshotResult && snapshotResult.ok ? snapshotResult.snapshot : null;

              const sections = [
                ...(patientData ? [{ id: 'patient-data', label: 'Данные пациента' }] : []),
                ...(snapshot
                  ? snapshot.blocks
                      .map((b, i) => b.type === 'section' ? { id: `snapshot-section-${i}`, label: b.title } : null)
                      .filter((s): s is { id: string; label: string } => s !== null)
                  : [
                      ...(summary ? [{ id: 'summary', label: 'Общее резюме' }] : []),
                      ...categories.map(([type]) => ({ id: toSlug(type), label: type })),
                    ]),
                ...(hasPrescriptionsBlock ? [{ id: 'prescriptions', label: 'Назначения' }] : [])
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
                                <MarkdownContent content={cleanMarkdownArtifacts(patientData.text)} />
                              </div>
                            </div>
                          </div>
                        )}

                        {snapshot ? (
                          // Unified snapshot rendering — single source of truth.
                          // Все блоки (section/summary/biomarker/text/spacer) идут одним
                          // потоком, биомаркеры привязаны по UUID.
                          biomarkersLoading ? (
                            <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm space-y-3">
                              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                              <div className="h-4 w-full bg-muted animate-pulse rounded" />
                              <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                            </div>
                          ) : (
                            <div id="snapshot-root" className="prose prose-sm max-w-none">
                              {renderSnapshotWeb(snapshot, webBiomarkers, patientAge, patientGender)}
                            </div>
                          )
                        ) : (
                          <>
                            {summary && (
                              <div id="section-summary" className="scroll-mt-6">
                                <div className="prose prose-sm max-w-none">
                                  <div className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border border-accent/10 shadow-sm">
                                    <MarkdownContent content={cleanMarkdownArtifacts(summary.text)} />
                                  </div>
                                </div>
                              </div>
                            )}

                            {categories.map(([type, recs]) => (
                              <div key={type} id={`section-${toSlug(type)}`} className="scroll-mt-6">
                                <div className="space-y-4">
                                  <div className="mb-6">
                                    <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                                      {type}
                                    </h2>
                                    <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                                  </div>
                                  {biomarkersLoading ? (
                                    <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm space-y-3">
                                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                                      <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                                    </div>
                                  ) : (
                                    recs.map((rec) => (
                                      <div key={rec.id} className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                        {renderInterleavedWeb(rec.text, webBiomarkers.filter(b => b.category === type), patientAge, patientGender)}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {hasPrescriptionsBlock && (
                          <div id="section-prescriptions" className="scroll-mt-6">
                            <div className="mb-6">
                              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                                Назначения
                              </h2>
                              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                            </div>

                            {/* ── Нутрицевтики (единый компонент с разделом «Рекомендации») ── */}
                            {selectedPrescriptions.length > 0 && (
                              <section className="space-y-4 mb-8">
                                <h3 className="text-xl font-semibold text-foreground">
                                  Нутрицевтики ({selectedPrescriptions.length})
                                </h3>
                                <div className="space-y-4">
                                  {selectedPrescriptions.map((p, idx) => (
                                    <PrescriptionCard
                                      key={p.id}
                                      prescription={p}
                                      index={idx}
                                      showStatus={hasPatientAccess}
                                    />
                                  ))}
                                </div>
                              </section>
                            )}

                            {/* ── Питание/образ жизни и Доп. обследования (единый компонент) ── */}
                            <AdvisorySections
                              lifestyle={lifestyleData}
                              followUps={followUpsData}
                            />
                          </div>
                        )}
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
