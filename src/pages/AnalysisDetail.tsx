import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Sparkles, Search, Edit, Trash2, ChevronDown, ChevronUp, Info, Activity } from "lucide-react";
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { AnalysisStatusBadge } from "@/components/admin/AnalysisStatusBadge";
import { EditAnalysisWizard } from "@/components/admin/EditAnalysisWizard";
import { EditReportDialog } from "@/components/admin/EditReportDialog";
import { getNormalRangeForAge, calculateAge, AgeRanges, getBiomarkerStatus, getStatusHslColor } from "@/lib/biomarkerNorms";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";

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

  useEffect(() => {
    // Auto-expand all categories on load
    const allCategories = Object.keys(groupedBiomarkers);
    const expanded = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
    setExpandedCategories(expanded);
  }, [biomarkers]);

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

  const handleAnalyze = async () => {
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
    setAnalysisProgress({ current: 0, total: totalSteps, currentCategory: "", stage: "Подготовка данных..." });
    setAnalyzing(true);

    // Запускаем polling для отслеживания прогресса
    let pollingStopped = false;
    const stageNames: Record<string, string> = {
      "Данные пациента": "Сохранение данных пациента...",
      "Общее резюме": "Формирование общего резюме...",
    };
    categories.forEach(c => { stageNames[c] = `Анализ: ${c}...`; });

    const pollInterval = setInterval(async () => {
      if (pollingStopped) return;
      try {
        const { data: recs } = await supabase
          .from("recommendations")
          .select("type")
          .eq("analysis_id", id!);

        const savedCount = recs?.length || 0;
        const lastSaved = recs?.[recs.length - 1]?.type || "";
        const stageName = stageNames[lastSaved] || lastSaved;

        setAnalysisProgress({
          current: savedCount,
          total: totalSteps,
          currentCategory: lastSaved,
          stage: savedCount < totalSteps ? stageName : "Генерация назначений..."
        });
      } catch {}
    }, 2500);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-biomarkers", {
        body: { analysisId: id },
      });

      pollingStopped = true;
      clearInterval(pollInterval);

      if (error) {
        if (error.message?.includes("402") || error.message?.includes("Payment required")) {
          toast({
            title: "Недостаточно средств",
            description: "Пополните баланс в Settings → Workspace → Usage",
            variant: "destructive",
          });
        } else if (error.message?.includes("429") || error.message?.includes("Rate limit")) {
          toast({
            title: "Превышен лимит запросов",
            description: "Подождите несколько минут и попробуйте снова",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setAnalysisProgress({ current: totalSteps, total: totalSteps, currentCategory: "", stage: "Готово!" });

      const successCount = Object.values(data.categories_processed).filter((s: any) => s.success).length;
      
      toast({
        title: "Отчет сгенерирован",
        description: `Успешно: ${successCount} из ${categories.length} категорий`,
      });

      loadData();
      
      // Открываем диалог редактирования отчета
      setEditReportAnalysisId(id || null);
      setShowEditReport(true);
    } catch (error: any) {
      pollingStopped = true;
      clearInterval(pollInterval);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось выполнить AI-анализ",
        variant: "destructive",
      });
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

  const filteredBiomarkers = biomarkers.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBiomarkers = filteredBiomarkers.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) acc[biomarker.category] = [];
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  const groupedValues = values.reduce((acc, value) => {
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
              {analysis?.lab_name && (
                <p className="text-muted-foreground">Лаборатория: {analysis.lab_name}</p>
              )}
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
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || values.length === 0}
                className="shadow-neon-accent"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {analyzing ? "Генерируем..." : "Перегенерировать"}
              </Button>
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

        {/* Tabs */}
        <Tabs defaultValue="entered" className="space-y-6">
          {isDemoAnalysis ? (
            <h3 className="text-lg font-semibold">
              Введенные значения ({values.length})
            </h3>
          ) : (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="entered">
                Введенные значения ({values.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                Все показатели ({filteredBiomarkers.length})
              </TabsTrigger>
            </TabsList>
          )}

          {/* Entered Values Tab */}
          <TabsContent value="entered" className="space-y-6">
            {values.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground text-center">
                    Пока нет введенных значений
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedValues).map(([category, categoryValues]) => (
                <Card
                  key={category}
                  className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader 
                    className="cursor-pointer hover:bg-primary/5 transition-colors rounded-t-lg"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
                          {category}
                        </CardTitle>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                          {categoryValues.length}
                        </span>
                      </div>
                      {expandedCategories[category] ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedCategories[category] && (
                    <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryValues.map((value) => {
                        const angle = getGaugeAngle(value.value, value.biomarkers);
                        const color = getGaugeColor(value.value, value.biomarkers);
                        const { min, max } = getNormalRange(value.biomarkers);
                        const gender = (patientGender === 'male' || patientGender === 'female') ? patientGender : 'male';
                        const statusInfo = getBiomarkerStatus(value.value, value.biomarkers, patientAge, gender);

                        return (
                          <Card
                            key={value.id}
                            className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/20 hover:border-primary/50 transition-all group"
                          >
                            <CardContent className="p-6">
                              {/* Header with actions */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-foreground mb-1">
                                    {value.biomarkers.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {value.biomarkers.code}
                                  </p>
                                </div>
                              </div>

                              {/* Gauge Chart */}
                              <div className="flex justify-center mb-4">
                                <div className="relative w-40 h-20">
                                  <svg viewBox="0 0 120 60" className="w-full h-full">
                                    {/* Background arc */}
                                    <path
                                      d="M 15 55 A 45 45 0 0 1 105 55"
                                      fill="none"
                                      stroke="hsl(var(--muted))"
                                      strokeWidth="10"
                                      strokeLinecap="round"
                                      opacity="0.2"
                                    />
                                    
                                    {value.biomarkers.normal_min !== null && value.biomarkers.normal_max !== null ? (
                                      <>
                                        {/* Critical zone left */}
                                        <path
                                          d="M 15 55 A 45 45 0 0 1 25 35"
                                          fill="none"
                                          stroke="hsl(var(--status-critical))"
                                          strokeWidth="10"
                                          strokeLinecap="round"
                                        />
                                        {/* Risk zone left */}
                                        <path
                                          d="M 25 35 A 45 45 0 0 1 35 25"
                                          fill="none"
                                          stroke="hsl(var(--status-risk))"
                                          strokeWidth="10"
                                        />
                                        {/* Acceptable zone left */}
                                        <path
                                          d="M 35 25 A 45 45 0 0 1 45 20"
                                          fill="none"
                                          stroke="hsl(var(--status-acceptable))"
                                          strokeWidth="10"
                                        />
                                        {/* Optimal zone */}
                                        <path
                                          d="M 45 20 A 45 45 0 0 1 75 20"
                                          fill="none"
                                          stroke="hsl(var(--status-optimal))"
                                          strokeWidth="10"
                                        />
                                        {/* Acceptable zone right */}
                                        <path
                                          d="M 75 20 A 45 45 0 0 1 85 25"
                                          fill="none"
                                          stroke="hsl(var(--status-acceptable))"
                                          strokeWidth="10"
                                        />
                                        {/* Risk zone right */}
                                        <path
                                          d="M 85 25 A 45 45 0 0 1 95 35"
                                          fill="none"
                                          stroke="hsl(var(--status-risk))"
                                          strokeWidth="10"
                                        />
                                        {/* Critical zone right */}
                                        <path
                                          d="M 95 35 A 45 45 0 0 1 105 55"
                                          fill="none"
                                          stroke="hsl(var(--status-critical))"
                                          strokeWidth="10"
                                          strokeLinecap="round"
                                        />
                                      </>
                                    ) : null}
                                    
                                    {/* Needle with glow */}
                                    <defs>
                                      <filter id={`glow-${value.id}`}>
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                        <feMerge>
                                          <feMergeNode in="coloredBlur"/>
                                          <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                      </filter>
                                    </defs>
                                    <line
                                      x1="60"
                                      y1="55"
                                      x2={60 + 40 * Math.cos((angle - 90) * Math.PI / 180)}
                                      y2={55 + 40 * Math.sin((angle - 90) * Math.PI / 180)}
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      className={color}
                                      filter={`url(#glow-${value.id})`}
                                    />
                                    {/* Center dot */}
                                    <circle 
                                      cx="60" 
                                      cy="55" 
                                      r="4" 
                                      fill="currentColor" 
                                      className={color}
                                    />
                                  </svg>
                                </div>
                              </div>

                              {/* Value Display */}
                              <div className="text-center mb-4">
                                <div className={`text-4xl font-bold mb-1 ${color}`}>
                                  {value.value}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {value.biomarkers.unit}
                                </div>
                              </div>

                              {/* Status Badge */}
                              {(min !== null || max !== null) && (
                                <div className="flex justify-center mb-4">
                                  <div className={`px-3 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.colorClass} text-sm font-medium border ${statusInfo.borderClass}`}>
                                    {statusInfo.emoji} {statusInfo.label}
                                  </div>
                                </div>
                              )}

                              {/* 7-segment Range Bar */}
                              <div className="mb-4">
                                <BiomarkerRangeBar
                                  biomarker={value.biomarkers}
                                  value={value.value}
                                  age={patientAge}
                                  gender={patientGender}
                                  showLabels
                                />
                              </div>

                              {/* Reference Range */}
                              {(min !== null || max !== null) && (
                                <div className="text-center mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Референсные значения
                                  </div>
                                  <div className="text-sm font-semibold text-status-good">
                                    {min !== null && max !== null
                                      ? `${min} - ${max} ${value.biomarkers.unit}`
                                      : min !== null
                                        ? `≥ ${min} ${value.biomarkers.unit}`
                                        : `≤ ${max} ${value.biomarkers.unit}`
                                    }
                                  </div>
                                </div>
                              )}

                              {/* Description */}
                              {value.biomarkers.description && (
                                <div className="text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                                  {value.biomarkers.description}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Biomarkers Tab */}
          <TabsContent value="all" className="space-y-6">
            {Object.entries(groupedBiomarkers).map(([category, categoryBiomarkers]) => {
              const enteredCount = categoryBiomarkers.filter(b => 
                values.some(v => v.biomarker_id === b.id)
              ).length;
              
              return (
                <Card
                  key={category}
                  className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader 
                    className="cursor-pointer hover:bg-primary/5 transition-colors rounded-t-lg"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
                          {category}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent/20 text-accent border border-accent/30">
                            {categoryBiomarkers.length} всего
                          </span>
                          {enteredCount > 0 && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                              {enteredCount} введено
                            </span>
                          )}
                        </div>
                      </div>
                      {expandedCategories[category] ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedCategories[category] && (
                    <CardContent>
                  <div className="space-y-3">
                    {categoryBiomarkers.map((biomarker) => {
                      const existingValue = values.find((v) => v.biomarker_id === biomarker.id);

                      return (
                        <div
                          key={biomarker.id}
                          className="p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-foreground">{biomarker.name}</h4>
                                  <p className="text-xs text-muted-foreground">{biomarker.code}</p>
                                </div>
                                {existingValue && (
                                  <span className="text-lg font-bold text-primary">
                                    {existingValue.value} {biomarker.unit}
                                  </span>
                                )}
                              </div>
                              {biomarker.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {biomarker.description}
                                </p>
                              )}
                              {biomarker.normal_min !== null && biomarker.normal_max !== null && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Референс:</span>
                                  <span className="font-medium text-status-good">
                                    {biomarker.normal_min} - {biomarker.normal_max} {biomarker.unit}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

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
