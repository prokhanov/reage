import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Sparkles, Search, Edit, Trash2, ChevronDown, ChevronUp, Info, Activity, Brain } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";
import { isAnalysisReportComplete, waitForAnalysisCompletion } from "@/lib/analysisCompletionCheck";
import { invokeAnalyzeBiomarkers } from "@/lib/analyzeBiomarkers";


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { EditAnalysisWizard } from "@/components/admin/EditAnalysisWizard";
import { EditReportDialog } from "@/components/admin/EditReportDialog";
import { getNormalRangeForAge, calculateAge, AgeRanges, getBiomarkerStatus, getStatusHslColor } from "@/lib/biomarkerNorms";
import { BiomarkerScale } from "@/components/BiomarkerScale";
import { BiomarkerStatusBadge } from "@/components/BiomarkerStatusBadge";

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string;
  category: string;
  description: string | null;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
  age_ranges?: AgeRanges | null;
}

interface AnalysisValue {
  id: string;
  biomarker_id: string;
  value: number;
  biomarkers: Biomarker;
}

export default function AnalysisDetail({ analysisId }: { analysisId?: string }) {
  const params = useParams<{ id: string }>();
  const id = analysisId ?? params.id;
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const { hasPatientAccess } = usePatientModuleAccess();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const [analysis, setAnalysis] = useState<any>(null);
  const [values, setValues] = useState<AnalysisValue[]>([]);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 7, currentCategory: "", stage: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editAnalysisDialogOpen, setEditAnalysisDialogOpen] = useState(false);
  const [showEditReport, setShowEditReport] = useState(false);
  const [editReportAnalysisId, setEditReportAnalysisId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const isDemoAnalysis = id?.startsWith("demo-analysis-");

  useEffect(() => {
    if (isDemoAnalysis && demoLoading) {
      return;
    }
    loadData();
  }, [id, isDemoAnalysis, demoLoading]);

  // При маунте: если по этому анализу уже идёт генерация — подцепляемся к ней,
  // вместо того чтобы дать пользователю кликнуть «Сгенерировать» и поднять каскад.
  useEffect(() => {
    if (!id || isDemoAnalysis) return;
    let cancelled = false;
    (async () => {
      const { data: job } = await supabase
        .from("report_jobs")
        .select("id, status, updated_at")
        .eq("analysis_id", id)
        .in("status", ["queued", "running"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !job) return;
      // Считаем job живой если updated_at свежее 2 минут — иначе он, скорее всего, мертв.
      const ageMs = Date.now() - new Date(job.updated_at).getTime();
      if (ageMs > 120_000) return;
      if (!analyzing) handleAnalyze("standard");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDemoAnalysis]);

  useEffect(() => {
    // Auto-expand all categories on load
    const allCategories = [...new Set(values.map(v => v.biomarkers.category))];
    const expanded = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
    setExpandedCategories(expanded);
  }, [values]);

  const loadData = async () => {
    if (isDemoAnalysis) {
      if (!demoMode || !demoData) {
        console.error("Demo mode not active or demo data not loaded");
        toast({
          title: "Ошибка",
          description: "Демо-данные недоступны. Попробуйте перезагрузить страницу.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      try {
        // Load demo data
        setPatientGender(demoData.profile.gender || null);
        setPatientAge(demoData.profile.chronological_age || null);
        
        // Extract analysis index from id (e.g., "demo-analysis-2" -> 2)
        const analysisIndex = parseInt(id.replace("demo-analysis-", ""));
        const selectedAnalysis = demoData.analyses[analysisIndex];
        
        if (!selectedAnalysis) {
          throw new Error("Demo analysis not found");
        }
        
        // Set demo analysis
        setAnalysis({
          id: id,
          date: selectedAnalysis.date,
          lab_name: selectedAnalysis.lab_name,
          health_index: selectedAnalysis.health_index,
          biological_age: selectedAnalysis.biological_age,
          status: "processed",
          note: selectedAnalysis.note || null,
          biomarkers_metadata: selectedAnalysis.biomarkers_metadata || null,
        });
        
        // Load category order from database
        const { data: categoriesData } = await supabase
          .from("biomarker_categories")
          .select("name, display_order")
          .order("display_order");

        const categoryOrderMap = new Map(
          (categoriesData || []).map((cat) => [cat.name, cat.display_order])
        );
        
        // Filter biomarkers for this specific analysis
        const analysisBiomarkers = demoData.biomarkers.filter(
          (b: any) => (b.analysis_index || 0) === analysisIndex
        );
        
        // Get unique codes from demo biomarkers and convert to database codes
        const uniqueCodes = [...new Set(
          analysisBiomarkers
            .map((b: any) => DEMO_TO_DB_CODE[b.code] || b.code)
            .filter(Boolean)
        )];
        
        // Fetch biomarker metadata from database
        const { data: biomarkersMetadata } = await supabase
          .from('biomarkers')
          .select('*')
          .in('code', uniqueCodes);
        
        // Map metadata by code
        const metadataMap = new Map(
          (biomarkersMetadata || []).map((b: any) => [b.code, b])
        );
        
        // Transform demo biomarkers to analysis values format with full metadata
        const demoValues: AnalysisValue[] = analysisBiomarkers
          .map((b: any) => {
            const dbCode = DEMO_TO_DB_CODE[b.code] || b.code;
            const metadata = metadataMap.get(dbCode);
            if (!metadata) {
              console.warn(`No metadata found for biomarker code: ${b.code} (DB code: ${dbCode})`);
              return null;
            }
            
            return {
              id: `demo-value-${b.code}`,
              biomarker_id: metadata.id,
              value: b.value,
              biomarkers: {
                id: metadata.id,
                name: metadata.name,
                code: metadata.code,
                unit: b.unit || metadata.unit,
                category: metadata.category,
                description: metadata.description,
                normal_min: metadata.normal_min,
                normal_max: metadata.normal_max,
                normal_min_male: metadata.normal_min_male,
                normal_max_male: metadata.normal_max_male,
                normal_min_female: metadata.normal_min_female,
                normal_max_female: metadata.normal_max_female,
                age_ranges: metadata.age_ranges || null,
              },
            };
          })
          .filter((v) => v !== null) as AnalysisValue[];
        
        setValues(demoValues);
        
        // Extract unique biomarkers and sort
        const uniqueBiomarkers = demoValues.map((v) => v.biomarkers);
        const sortedBiomarkers = uniqueBiomarkers.sort((a, b) => {
          const orderA = categoryOrderMap.get(a.category) ?? 999;
          const orderB = categoryOrderMap.get(b.category) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        
        setBiomarkers(sortedBiomarkers);
      } catch (error: any) {
        console.error("Error loading demo data:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить демо-данные",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");
      if (!id) throw new Error("Некорректный идентификатор анализа");

      // Load patient gender and birth_date
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, birth_date")
        .eq("id", userId)
        .single();
      
      setPatientGender(profile?.gender || null);
      if (profile?.birth_date) {
        setPatientAge(calculateAge(profile.birth_date));
      }

      // Load category order from database
      const { data: categoriesData } = await supabase
        .from("biomarker_categories")
        .select("name, display_order")
        .order("display_order");

      const categoryOrderMap = new Map(
        (categoriesData || []).map((cat) => [cat.name, cat.display_order])
      );

      // Load analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (analysisError) throw analysisError;
      setAnalysis(analysisData);

      // Load values
      const { data: valuesData, error: valuesError } = await supabase
        .from("analysis_values")
        .select(`
          *,
          biomarkers (*)
        `)
        .eq("analysis_id", id);

      if (valuesError) throw valuesError;
      setValues(valuesData as any || []);

      // Load all biomarkers and sort by category order
      const { data: biomarkersData, error: biomarkersError } = await supabase
        .from("biomarkers")
        .select("*")
        .order("name");

      if (biomarkersError) throw biomarkersError;
      
      // Sort biomarkers by category display_order
      const sortedBiomarkers = (biomarkersData || []).sort((a, b) => {
        const orderA = categoryOrderMap.get(a.category) ?? 999;
        const orderB = categoryOrderMap.get(b.category) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      
      setBiomarkers(sortedBiomarkers as any);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditReport = () => {
    if (isViewMode) {
      setSimPath("/recommendations");
    } else {
      navigate("/recommendations");
    }
  };

  const handleAnalyze = async (mode: "standard" | "deep" = "standard") => {
    if (values.length === 0) {
      toast({
        title: "Недостаточно данных",
        description: "Добавьте хотя бы один показатель для анализа",
        variant: "destructive",
      });
      return;
    }

    // Определяем количество категорий
    const categories = [...new Set(values.map(v => v.biomarkers.category))];
    // total = categories + "Данные пациента" + "Общее резюме" + "Назначения" = categories.length + 3
    const totalSteps = categories.length + 3;
    const generationStartedAt = new Date();
    setAnalysisProgress({ current: 0, total: totalSteps, currentCategory: "", stage: "Подготовка данных..." });
    setAnalyzing(true);

    // Polling прогресса напрямую из report_jobs — это точный источник истины
    // (steps_done/steps_total/current_step заполняются оркестратором).
    let pollingStopped = false;
    const stepLabelMap: Record<string, string> = {
      "prescriptions": "Подбор назначений и нутрицевтиков...",
      "finalize:summary": "Формирование общего резюме...",
      "finalize:bioage": "Расчёт биологического возраста...",
    };

    const pollInterval = setInterval(async () => {
      if (pollingStopped) return;
      try {
        const { data: job } = await supabase
          .from("report_jobs")
          .select("steps_done, steps_total, current_step, status")
          .eq("analysis_id", id!)
          .gte("updated_at", generationStartedAt.toISOString())
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!job) return;
        const cur = job.current_step || "";
        let stage = stepLabelMap[cur] || "";
        if (!stage && cur.startsWith("category:")) {
          stage = `Анализ: ${cur.replace(/^category:/, "")}...`;
        }
        if (!stage) stage = "Идёт обработка...";

        setAnalysisProgress({
          current: job.steps_done || 0,
          total: job.steps_total || totalSteps,
          currentCategory: cur,
          stage,
        });
      } catch {}
    }, 2500);

    try {
      const data = await invokeAnalyzeBiomarkers({ analysisId: id!, mode });
      const error = null;

      // 1) Сетевая/транспортная ошибка от supabase-js
      if (error) {
        const msg = error.message || "";
        if (msg.includes("402") || msg.includes("Payment required")) {
          toast({
            title: "Недостаточно средств",
            description: "Пополните баланс в Settings → Workspace → Usage",
            variant: "destructive",
          });
          return;
        }
        if (msg.includes("429") || msg.includes("Rate limit")) {
          toast({
            title: "Превышен лимит запросов",
            description: "Подождите несколько минут и попробуйте снова",
            variant: "destructive",
          });
          return;
        }

        // Edge runtime мог закрыть соединение по таймауту (deep-режим идёт 3+ мин),
        // хотя фоновая работа продолжается и может уже завершиться. Проверяем БД.
        setAnalysisProgress((p) => ({
          ...p,
          stage: mode === "deep"
            ? "Глубокий анализ ещё сохраняется, проверяем готовность отчёта..."
            : "Проверяем готовность отчёта...",
        }));
        const completionWaitMs = mode === "deep" ? 25 * 60 * 1000 : 3 * 60 * 1000;
        const completed = (await isAnalysisReportComplete(id!, { startedAt: generationStartedAt }))
          || (await waitForAnalysisCompletion(id!, completionWaitMs, 3000, { startedAt: generationStartedAt }));

        if (completed) {
          setAnalysisProgress({ current: totalSteps, total: totalSteps, currentCategory: "", stage: "Готово!" });
          toast({
            title: "Отчет сгенерирован",
            description: "Анализ завершён. Открываем редактор...",
          });
          loadData();
          setEditReportAnalysisId(id || null);
          setShowEditReport(true);
          return;
        }
        throw error;
      }

      // 2) Логическая ошибка от edge-функции (status=200, success=false)
      if (data && data.success === false) {
        const completed = (await isAnalysisReportComplete(id!, { startedAt: generationStartedAt }))
          || (await waitForAnalysisCompletion(id!, mode === "deep" ? 25 * 60 * 1000 : 3 * 60 * 1000, 3000, { startedAt: generationStartedAt }));

        if (!completed) {
          console.error("analyze-biomarkers returned error:", data);
          throw new Error(data.error || "Не удалось выполнить AI-анализ");
        }
      }

      if (data?.accepted) {
        setAnalysisProgress((p) => ({
          ...p,
          stage: "Глубокий анализ выполняется в фоне, ожидаем финальное сохранение отчёта...",
        }));
        const completed =
          (await isAnalysisReportComplete(id!, { startedAt: generationStartedAt })) ||
          (await waitForAnalysisCompletion(id!, 25 * 60 * 1000, 3000, { startedAt: generationStartedAt }));
        if (!completed) {
          // Не показываем красную ошибку — задача почти всегда дописывается в фоне.
          // Запускаем тихий «дофон» ещё на 5 минут, и если успеем — обновим страницу.
          pollingStopped = true;
          clearInterval(pollInterval);
          toast({
            title: "Отчёт ещё формируется",
            description: "Можно закрыть страницу — мы откроем готовый отчёт автоматически, как только он будет готов.",
          });
          waitForAnalysisCompletion(id!, 5 * 60 * 1000, 5000, { startedAt: generationStartedAt }).then((ok) => {
            if (ok) {
              toast({ title: "Отчёт готов", description: "Глубокий анализ завершён." });
              loadData();
            }
          });
          return;
        }
        pollingStopped = true;
        clearInterval(pollInterval);
        setAnalysisProgress({ current: totalSteps, total: totalSteps, currentCategory: "", stage: "Готово!" });
        toast({
          title: "Отчет сгенерирован",
          description: "Глубокий анализ завершён. Открываем редактор...",
        });
        loadData();
        setEditReportAnalysisId(id || null);
        setShowEditReport(true);
        return;
      }

      pollingStopped = true;
      clearInterval(pollInterval);

      const categoryResults = Object.values(data?.categories_processed || {}) as any[];
      const totalCount = Math.max(Object.keys(data?.categories_processed || {}).length, categories.length);
      let successCount = categoryResults.filter((s: any) => s?.success).length;

      if (data?.success === false || successCount === 0) {
        const completed = (await isAnalysisReportComplete(id!, { startedAt: generationStartedAt }))
          || (await waitForAnalysisCompletion(id!, mode === "deep" ? 25 * 60 * 1000 : 3 * 60 * 1000, 3000, { startedAt: generationStartedAt }));

        if (!completed) {
          throw new Error(data?.error || "Отчет не был полностью сгенерирован. Попробуйте запустить генерацию ещё раз.");
        }
        successCount = totalCount;
      }

      setAnalysisProgress({ current: totalSteps, total: totalSteps, currentCategory: "", stage: "Готово!" });

      toast({
        title: "Отчет сгенерирован",
        description: "Анализ завершён. Открываем редактор...",
      });

      loadData();

      // Открываем диалог редактирования отчета
      setEditReportAnalysisId(id || null);
      setShowEditReport(true);
    } catch (error: any) {
      pollingStopped = true;
      clearInterval(pollInterval);
      // Спецслучай: клиентский поллинг истёк, но фоновая задача почти всегда дописывается.
      if (mode === "deep" && (error?.message === "accepted_background" || error?.message?.includes("ещё не заверш"))) {
        toast({
          title: "Отчёт ещё формируется",
          description: "Можно закрыть страницу — мы откроем готовый отчёт автоматически, как только он будет готов.",
        });
        waitForAnalysisCompletion(id!, 5 * 60 * 1000, 5000, { startedAt: generationStartedAt }).then((ok) => {
          if (ok) {
            toast({ title: "Отчёт готов", description: "Глубокий анализ завершён." });
            loadData();
          }
        });
      } else {
        toast({
          title: "Ошибка анализа",
          description: error.message || "Не удалось выполнить AI-анализ",
          variant: "destructive",
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const getNormalRange = (biomarker: Biomarker) => {
    if (patientAge !== null && patientGender && (patientGender === 'male' || patientGender === 'female')) {
      return getNormalRangeForAge(biomarker, patientAge, patientGender);
    }
    // Fallback to gender-specific or general norms
    if (patientGender === 'male' && biomarker.normal_min_male !== null && biomarker.normal_max_male !== null) {
      return { min: biomarker.normal_min_male, max: biomarker.normal_max_male };
    } else if (patientGender === 'female' && biomarker.normal_min_female !== null && biomarker.normal_max_female !== null) {
      return { min: biomarker.normal_min_female, max: biomarker.normal_max_female };
    }
    return { min: biomarker.normal_min, max: biomarker.normal_max };
  };

  const getGaugeAngle = (value: number, biomarker: Biomarker) => {
    const { min, max } = getNormalRange(biomarker);
    if (min === null || max === null) return 90;
    const range = max - min;
    const extendedMin = min - range * 0.5;
    const extendedMax = max + range * 0.5;
    const extendedRange = extendedMax - extendedMin;
    const position = ((value - extendedMin) / extendedRange) * 180;
    return Math.max(0, Math.min(180, position));
  };

  const getGaugeColor = (value: number, biomarker: Biomarker) => {
    const gender = (patientGender === 'male' || patientGender === 'female') ? patientGender : 'male';
    const statusInfo = getBiomarkerStatus(value, biomarker, patientAge, gender);
    return statusInfo.colorClass;
  };

  const filteredValues = values.filter(
    (v) =>
      v.biomarkers.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.biomarkers.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.biomarkers.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedValues = filteredValues.reduce((acc, value) => {
    const category = value.biomarkers.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(value);
    return acc;
  }, {} as Record<string, AnalysisValue[]>);

  if (loading && !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {isDemoAnalysis && demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (isViewMode ? setSimPath("/analyses") : navigate("/analyses"))}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {analysis && new Date(analysis.date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                {analysis && <AnalysisStatusBadge status={analysis.status} />}
              </div>
              <p className="text-muted-foreground">
                Сдано маркеров: {values.length}
                {analysis?.lab_name && ` · ${analysis.lab_name}`}
              </p>
            </div>
          </div>

          {hasPatientAccess && isViewMode && (
            <div className="flex gap-2">
              <Button
                onClick={() => setEditAnalysisDialogOpen(true)}
                variant="outline"
              >
                <Edit className="mr-2 h-4 w-4" />
                Редактировать анализ
              </Button>
              <div className="flex">
                <Button
                  onClick={() => handleAnalyze("standard")}
                  disabled={analyzing || values.length === 0}
                  className="shadow-neon-accent rounded-r-none"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {analyzing ? "Генерируем..." : "Перегенерировать"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={analyzing || values.length === 0}
                      className="shadow-neon-accent rounded-l-none border-l border-primary-foreground/20 px-2"
                      aria-label="Выбрать режим генерации"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Глубина анализа</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAnalyze("standard")}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Стандартный
                        <span className="text-xs text-muted-foreground font-normal">~3–5 мин</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Быстрая генерация на базовой модели.
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAnalyze("deep")}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Brain className="h-4 w-4 text-primary" />
                        Глубокий анализ
                        <span className="text-xs text-muted-foreground font-normal">~8–15 мин</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Усиленная модель + расширенное «обдумывание». Выше точность и связность, требует больше времени и AI-кредитов.
                      </p>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Progress Dialog */}
        {analyzing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-full max-w-md p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Анализируем ваши показатели...
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{analysisProgress.stage || "Подготовка..."}</span>
                    <span className="font-medium">{analysisProgress.current}/{analysisProgress.total}</span>
                  </div>
                  <Progress value={analysisProgress.total > 0 ? (analysisProgress.current / analysisProgress.total) * 100 : 0} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Это может занять 2-3 минуты. Создаем детальный отчет с персональными советами...
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, коду или категории..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary/30"
            />
          </div>
        </div>

        {/* Entered Values */}
        <div className="space-y-6">
            {values.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground text-center">
                    Пока нет введенных значений
                  </p>
                </CardContent>
              </Card>
            ) : (
              <TooltipProvider delayDuration={0}>
                <Accordion type="multiple" defaultValue={Object.keys(groupedValues)} className="space-y-4">
                  {Object.entries(groupedValues).map(([category, categoryValues]) => (
                    <AccordionItem
                      key={category}
                      value={category}
                      className="border border-primary/20 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden"
                    >
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-primary" />
                          <span className="text-lg font-semibold">{category}</span>
                          <Badge variant="secondary" className="ml-2">
                            {categoryValues.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        <div className="mt-4 border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-secondary/50">
                                <TableHead className="font-semibold">Название</TableHead>
                                <TableHead className="font-semibold">Значение</TableHead>
                                <TableHead className="font-semibold">Статус</TableHead>
                                <TableHead className="font-semibold">Шкала</TableHead>
                                <TableHead className="font-semibold w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryValues.map((value) => {
                                const { min, max } = getNormalRange(value.biomarkers);
                                const gender = (patientGender === 'male' || patientGender === 'female') ? patientGender : 'male';
                                const statusInfo = getBiomarkerStatus(value.value, value.biomarkers, patientAge, gender);

                                return (
                                  <TableRow
                                    key={value.id}
                                    className={`${
                                      statusInfo?.status === 'critical'
                                        ? "bg-status-critical/5 hover:bg-status-critical/10"
                                        : statusInfo?.status === 'risk'
                                        ? "bg-status-risk/5 hover:bg-status-risk/10"
                                        : statusInfo?.status === 'acceptable'
                                        ? "bg-status-acceptable/5 hover:bg-status-acceptable/10"
                                        : statusInfo?.status === 'optimal'
                                        ? "bg-status-optimal/5 hover:bg-status-optimal/10"
                                        : "hover:bg-secondary/50"
                                    }`}
                                  >
                                    <TableCell className="font-medium">
                                      <div>
                                        <div className="font-semibold">{value.biomarkers.name}</div>
                                        <div className="text-xs text-muted-foreground">{value.biomarkers.code}</div>
                                      </div>
                                    </TableCell>

                                    <TableCell>
                                      <span
                                        className="text-lg font-bold"
                                        style={{
                                          color: statusInfo ? getStatusHslColor(statusInfo.status) : "hsl(var(--primary))"
                                        }}
                                      >
                                        {value.value} {value.biomarkers.unit}
                                      </span>
                                    </TableCell>

                                    <TableCell>
                                      {statusInfo ? (
                                        <BiomarkerStatusBadge statusInfo={statusInfo} />
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>

                                    <TableCell className="min-w-[280px]">
                                      {min !== null || max !== null ? (
                                        <BiomarkerScale
                                          biomarker={value.biomarkers}
                                          value={value.value}
                                          age={patientAge}
                                          gender={patientGender}
                                          unit={value.biomarkers.unit}
                                          compact
                                        />
                                      ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                      {value.biomarkers.description ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button className="inline-flex items-center justify-center rounded-full w-7 h-7 bg-primary/10 hover:bg-primary/20 transition-colors">
                                              <Info className="h-5 w-5 text-primary" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs" side="top" align="center" sideOffset={8}>
                                            <p className="text-sm">{value.biomarkers.description}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : null}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TooltipProvider>
            )}
        </div>

        {id && (
          <>
            <EditAnalysisWizard
              analysisId={id}
              open={editAnalysisDialogOpen}
              onOpenChange={setEditAnalysisDialogOpen}
              onSuccess={loadData}
            />
            <EditReportDialog
              analysisId={editReportAnalysisId || id}
              analysisStatus={analysis?.status || "on_review"}
              open={showEditReport}
              onOpenChange={setShowEditReport}
              onStatusChange={loadData}
            />
          </>
        )}
      </div>
  );
}
