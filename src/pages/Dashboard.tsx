
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Heart, Trophy, Calendar, Target, RefreshCw, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { WeightTracker } from "@/components/WeightTracker";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useDemoMode, getLatestDemoAnalysis } from "@/hooks/useDemoMode";
import { BiologicalAgeCircle } from "@/components/BiologicalAgeCircle";

import { PassportReminderCard } from "@/components/PassportReminderCard";
import { BioAgeTrendChart } from "@/components/dashboard/BioAgeTrendChart";
import { HealthIndexTrendChart } from "@/components/dashboard/HealthIndexTrendChart";
import { SystemRatingsCard } from "@/components/dashboard/SystemRatingsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyPreviewDialog } from "@/components/health-strategy/StrategyPreviewDialog";
import { RecomputeOptionsDialog, ALL_SECTIONS, type RecomputeSection } from "@/components/health-strategy/RecomputeOptionsDialog";
import Biomarkers from "@/pages/Biomarkers";
import Trends from "@/pages/Trends";


const PREVIEW_STAGES = [
  "Загружаем анализы пациента",
  "Считаем индекс здоровья и био-возраст",
  "Анализируем системы организма",
  "Строим дорожную карту",
  "Генерируем ожидания и план действий",
  "Финализируем стратегию",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { getUserId, isViewMode, viewAsUserId } = useViewAsUser();
  const { data: roleData } = useUserRole();
  const isSuperAdmin = !!roleData?.isSuperAdmin;
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysesCount, setAnalysesCount] = useState(0);
  const [latestBioAge, setLatestBioAge] = useState<number | null>(null);
  const [latestHealthIndex, setLatestHealthIndex] = useState<number | null>(null);
  const [latestBiomarkersMetadata, setLatestBiomarkersMetadata] = useState<any>(null);
  const [ageTrend, setAgeTrend] = useState<string | null>(null);

  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [nextBooking, setNextBooking] = useState<any>(null);

  // Superadmin "recalculate & preview" (only in view-as-patient mode)
  const [categories, setCategories] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"preview" | "edit">("preview");
  const [previewing, setPreviewing] = useState(false);
  const [previewStage, setPreviewStage] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const canRecalculate = isSuperAdmin && isViewMode;


  

  useEffect(() => {
    setProfile(null);
    setLoading(true);
    setAnalysesCount(0);
    setLatestBioAge(null);
    setLatestHealthIndex(null);
    setLatestBiomarkersMetadata(null);
    setAgeTrend(null);
    setRecentAnalyses([]);
    
    fetchProfile();
  }, [viewAsUserId]);

  useEffect(() => {
    if (profile) {
      Promise.all([
        fetchAnalysesStats(),
        fetchNextBooking(),
      ]).finally(() => setLoading(false));
    }
  }, [profile]);

  const fetchAnalysesStats = async () => {
    if (demoMode) return;
    const userId = await getUserId();
    if (!userId) return;

    try {
      const [countResult, allAnalysesResult, latestAnalysisResult, recentAnalysesResult] = await Promise.all([
        supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('analyses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true }),
        supabase
          .from('analyses')
          .select('id, biological_age, health_index, biomarkers_metadata, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('analyses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(3),
      ]);

      setAnalysesCount(countResult.count || 0);
      setAllAnalyses(allAnalysesResult.data || []);
      setRecentAnalyses(recentAnalysesResult.data || []);

      const latestAnalysis = latestAnalysisResult.data;

      if (latestAnalysis) {
        const { count: biomarkerCount } = await supabase
          .from('analysis_values')
          .select('*', { count: 'exact', head: true })
          .eq('analysis_id', latestAnalysis.id);

        if (biomarkerCount && biomarkerCount > 0) {
          if (latestAnalysis.biological_age) {
            setLatestBioAge(latestAnalysis.biological_age);
          }
          if (latestAnalysis.health_index !== null && latestAnalysis.health_index !== undefined) {
            setLatestHealthIndex(latestAnalysis.health_index);
          }
          if (latestAnalysis.biomarkers_metadata) {
            setLatestBiomarkersMetadata(latestAnalysis.biomarkers_metadata);
          }
        } else {
          setLatestBioAge(null);
          setLatestHealthIndex(null);
          setLatestBiomarkersMetadata(null);
        }
      }

      const analyses = recentAnalysesResult.data;
      if (analyses && analyses.length > 1 && latestAnalysis?.biological_age) {
        const prevAnalysis = analyses[1];
        if (prevAnalysis.biological_age) {
          const trend = prevAnalysis.biological_age - latestAnalysis.biological_age;
          setAgeTrend(trend > 0 ? `−${trend}` : trend < 0 ? `+${Math.abs(trend)}` : "0");
        }
      }
    } catch (error) {
      console.error("Error fetching analyses stats:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        if (!isViewMode) navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const fetchNextBooking = async () => {
    if (demoMode) return;
    if (!profile?.id) return;

    try {
      const { data } = await supabase
        .from('analysis_bookings')
        .select('booking_date')
        .eq('user_id', profile.id)
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextBooking(data);
    } catch (error) {
      console.error('Error loading next booking:', error);
    }
  };

  // Load category list once (used by strategy preview dialog)
  useEffect(() => {
    if (!canRecalculate) return;
    void supabase
      .from("biomarker_categories")
      .select("name, display_order")
      .order("display_order")
      .then(({ data }) => setCategories((data || []).map((c: any) => c.name)));
  }, [canRecalculate]);

  const runRecompute = async (sections: RecomputeSection[]) => {
    let stageTimer: ReturnType<typeof setInterval> | null = null;
    try {
      setPreviewing(true);
      setPreviewStage(0);
      stageTimer = setInterval(() => {
        setPreviewStage((s) => Math.min(s + 1, PREVIEW_STAGES.length - 1));
      }, 4000);
      const userId = await getUserId();
      if (!userId) return;
      const { data: { session } } = await supabase.auth.getSession();

      // Fetch last snapshot to merge unselected sections
      const { data: lastSnap } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("compute-health-strategy", {
        body: { userId, preview: true },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const allKeys = ALL_SECTIONS.map((s) => s.key);
      const skip = allKeys.filter((k) => !sections.includes(k));
      let merged = { ...data };

      if (lastSnap && skip.length > 0) {
        for (const key of skip) {
          if (key === "ages") {
            merged.current_bio_age = Number(lastSnap.current_bio_age);
            merged.chronological_age = Number(lastSnap.chronological_age);
            merged.target_bio_age = Number(lastSnap.target_bio_age);
            merged.health_index = lastSnap.health_index;
          } else if (key === "system_ratings") {
            merged.rationale = {
              ...(merged.rationale || {}),
              system_ratings: (lastSnap.rationale as any)?.system_ratings,
            };
          } else if (key === "system_goals") {
            merged.system_goals = lastSnap.system_goals || [];
          } else if (key === "roadmap") {
            merged.roadmap = lastSnap.roadmap || [];
          } else if (key === "expectations") {
            merged.expectations = lastSnap.expectations || [];
          } else if (key === "key_biomarkers") {
            merged.key_biomarkers = lastSnap.key_biomarkers;
          } else if (key === "action_map") {
            merged.action_map = lastSnap.action_map || [];
          }
        }
      }

      setPreviewData(merged);
      setPreviewMode("preview");
      setOptionsOpen(false);
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось пересчитать", description: e?.message || "Попробуйте позже", variant: "destructive" });
    } finally {
      if (stageTimer) clearInterval(stageTimer);
      setPreviewing(false);
      setPreviewStage(0);
    }
  };


  const openStrategyEdit = async () => {
    try {
      setLoadingEdit(true);
      const userId = await getUserId();
      if (!userId) return;
      const { data: snap, error } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!snap) {
        toast({ title: "Нет сохранённой стратегии", description: "Сначала выполните перерасчёт и публикацию.", variant: "destructive" });
        return;
      }
      setPreviewData({
        analysis_id: snap.analysis_id,
        current_bio_age: Number(snap.current_bio_age),
        chronological_age: Number(snap.chronological_age),
        target_bio_age: Number(snap.target_bio_age),
        health_index: snap.health_index,
        rationale: snap.rationale,
        system_goals: snap.system_goals || [],
        action_map: snap.action_map || [],
        cohort_percentile: snap.cohort_percentile,
        cohort_label: snap.cohort_label,
        trajectory: snap.trajectory,
        roadmap: snap.roadmap || [],
        key_biomarkers: snap.key_biomarkers,
        expectations: snap.expectations || [],
        analyses_per_year: snap.analyses_per_year,
        adherence_pct: null,
        explanation: null,
      });
      setPreviewMode("edit");
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось загрузить стратегию", description: e?.message || "Попробуйте позже", variant: "destructive" });
    } finally {
      setLoadingEdit(false);
    }
  };

  const publishStrategy = async (edited: any) => {
    try {
      setPublishing(true);
      const userId = await getUserId();
      if (!userId) return;
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("compute-health-strategy", {
        body: { userId, publish: true, edited },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPreviewOpen(false);
      setPreviewData(null);
      toast({ title: "Стратегия опубликована клиенту" });
      // Refresh dashboard data so updated bio age / HI surface immediately
      await fetchAnalysesStats();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось опубликовать", description: e?.message || "Попробуйте позже", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };



  if (loading || demoLoading) {
    return (
      <div className="p-4 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // Use demo data if demo mode is active
  const latestDemoAnalysis = getLatestDemoAnalysis(demoData);
  const displayBioAge = latestDemoAnalysis ? latestDemoAnalysis.biological_age : latestBioAge;
  const displayHealthIndex = latestDemoAnalysis ? latestDemoAnalysis.health_index : latestHealthIndex;
  const displayAnalysesCount = demoMode && demoData ? demoData.analyses.length : analysesCount;
  
  const displayBiomarkersMetadata = latestDemoAnalysis?.biomarkers_metadata || latestBiomarkersMetadata;

  // Calculate chronological age at the date of the latest analysis
  const latestAnalysisDate = (() => {
    const ans = demoMode && demoData ? demoData.analyses : allAnalyses;
    if (!ans || ans.length === 0) return null;
    const sorted = [...ans].sort((a: any, b: any) => new Date(a.date || a.analysis_date).getTime() - new Date(b.date || b.analysis_date).getTime());
    return sorted[sorted.length - 1]?.date || sorted[sorted.length - 1]?.analysis_date || null;
  })();
  const birthDateStr = profile?.birth_date || (demoMode && demoData ? demoData.profile.birth_date : null);
  const chronologicalAge = (() => {
    if (!birthDateStr) return demoMode && demoData ? demoData.profile.chronological_age : null;
    if (latestAnalysisDate) {
      const analysisMs = new Date(latestAnalysisDate).getTime();
      const birthMs = new Date(birthDateStr).getTime();
      return Math.round(((analysisMs - birthMs) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
    }
    return calculateAge(birthDateStr);
  })();
  const ageDifference = displayBioAge && chronologicalAge ? chronologicalAge - displayBioAge : null;

  // Calculate progress metrics
  const analyses = demoMode && demoData ? demoData.analyses : allAnalyses;
  let displayRecentChange: number | null = null;
  let displayRecentPeriod: string | null = null;
  let displayTotalProgress: number | null = null;
  let displayFirstAnalysisDate: string | null = null;

  if (analyses && analyses.length >= 2) {
    const sortedAnalyses = [...analyses].sort((a: any, b: any) => 
      new Date(a.date || a.analysis_date).getTime() - new Date(b.date || b.analysis_date).getTime()
    );

    const latest = sortedAnalyses[sortedAnalyses.length - 1];
    const secondLatest = sortedAnalyses[sortedAnalyses.length - 2];
    const first = sortedAnalyses[0];

    const latestBioAge = latest.biological_age;
    const secondLatestBioAge = secondLatest.biological_age;
    const firstBioAge = first.biological_age;

    displayRecentChange = latestBioAge && secondLatestBioAge ? latestBioAge - secondLatestBioAge : null;
    
    const latestDate = new Date(latest.date || latest.analysis_date);
    const secondLatestDate = new Date(secondLatest.date || secondLatest.analysis_date);
    const monthsDiff = Math.round((latestDate.getTime() - secondLatestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    displayRecentPeriod = monthsDiff > 0 ? `за ${monthsDiff} ${monthsDiff === 1 ? 'месяц' : monthsDiff < 5 ? 'месяца' : 'месяцев'}` : null;

    displayTotalProgress = latestBioAge && firstBioAge ? latestBioAge - firstBioAge : null;
    
    const firstDate = new Date(first.date || first.analysis_date);
    displayFirstAnalysisDate = `с ${format(firstDate, 'LLL yyyy', { locale: ru })}`;
  }

  const displayBiologicalAge = displayBioAge;
  const displayCategoryScores = demoMode && latestDemoAnalysis 
    ? latestDemoAnalysis.biomarkers_metadata?.ai_analysis?.category_scores 
    : latestBiomarkersMetadata?.ai_analysis?.category_scores;
  const displayAllAnalyses = analyses || [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Demo Banner */}

      {/* Passport data reminder (paid users only, until filled) */}
      {!demoMode && <PassportReminderCard />}

      {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              <span className="text-foreground">Добро пожаловать,</span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">{profile?.name}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Паспортный возраст: <span className="text-primary font-medium">{birthDateStr ? calculateAge(birthDateStr) : (chronologicalAge ? Math.floor(chronologicalAge) : "—")} лет</span>
            </p>
          </div>
          {canRecalculate && displayAnalysesCount > 0 && (
            <div className="flex flex-col items-end gap-1 min-w-[240px]">
              <div className="flex gap-2">
                <Button onClick={openStrategyPreview} disabled={previewing || loadingEdit} variant="outline" size="sm">
                  <RefreshCw className={`mr-2 h-4 w-4 ${previewing ? "animate-spin" : ""}`} />
                  {previewing ? "Считаем..." : "Пересчитать"}
                </Button>
                <Button onClick={openStrategyEdit} disabled={previewing || loadingEdit} variant="outline" size="sm">
                  <Pencil className={`mr-2 h-4 w-4 ${loadingEdit ? "animate-pulse" : ""}`} />
                  {loadingEdit ? "Загружаем..." : "Изменить"}
                </Button>
              </div>
              {previewing && (
                <>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${((previewStage + 1) / PREVIEW_STAGES.length) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground text-right w-full">
                    Шаг {previewStage + 1}/{PREVIEW_STAGES.length}: {PREVIEW_STAGES[previewStage]}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {canRecalculate && (
          <StrategyPreviewDialog
            open={previewOpen}
            data={previewData}
            startDate={new Date().toISOString().slice(0, 10)}
            nextCheckupDate={nextBooking?.booking_date || null}
            categories={categories}
            publishing={publishing}
            mode={previewMode}
            onCancel={() => setPreviewOpen(false)}
            onPublish={publishStrategy}
          />
        )}



        {/* Data Status Alerts */}
        {!demoMode && displayAnalysesCount === 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Нет анализов</h3>
                <p className="text-sm text-muted-foreground">
                  Добавьте первый анализ для оценки вашего биологического возраста и индекса здоровья
                </p>
              </div>
            </div>
          </div>
        )}

        {!demoMode && displayAnalysesCount > 0 && displayBioAge === null && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Анализ без биомаркеров</h3>
                <p className="text-sm text-muted-foreground">
                  Для точной оценки биологического возраста необходимо добавить биомаркеры в ваш анализ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section - Biological Age with Metrics and Trends */}
        <Card className="border-border bg-card backdrop-blur-sm overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3">
            <CardTitle className="text-xl md:text-2xl">Ваш биологический возраст</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 lg:p-8">
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-muted">
                <TabsTrigger value="current">Текущее состояние</TabsTrigger>
                <TabsTrigger value="dynamics">Динамика</TabsTrigger>
              </TabsList>

              {/* Tab 1: Current State */}
              <TabsContent value="current" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Left: Circle */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground tracking-wide mb-3">Биологический возраст</span>
                      <BiologicalAgeCircle
                        biologicalAge={displayBioAge}
                        chronologicalAge={chronologicalAge}
                      />
                    
                    {/* Compact comparison text */}
                    {displayBioAge && chronologicalAge && ageDifference !== null ? (
                      <div className="mt-6 text-center">
                        {ageDifference > 0 ? (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-good/10">
                            <span className="text-2xl font-bold text-status-good">−{Math.abs(ageDifference).toFixed(1)}</span>
                            <span className="text-sm text-status-good">лет моложе</span>
                          </div>
                        ) : ageDifference < 0 ? (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-danger/10">
                            <span className="text-2xl font-bold text-status-danger">+{Math.abs(ageDifference).toFixed(1)}</span>
                            <span className="text-sm text-status-danger">лет старше</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                            <span className="text-sm text-muted-foreground">Равен паспортному</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Right: Unified Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {/* Health Index - Highlighted Large Card */}
                    <div className="col-span-2 p-4 md:p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-muted-foreground mb-2">Индекс здоровья</div>
                          <div className="text-4xl md:text-5xl font-bold text-foreground mb-3 tabular-nums">
                            {displayHealthIndex || "—"}
                            <span className="text-xl md:text-2xl text-muted-foreground ml-1">/100</span>
                          </div>
                          {displayHealthIndex !== null && (
                            <div className="inline-flex">
                              {displayHealthIndex >= 85 && (
                                <span className="text-xs px-2 py-1 rounded-full bg-status-good/20 text-status-good font-medium">
                                  Отлично
                                </span>
                              )}
                              {displayHealthIndex >= 70 && displayHealthIndex < 85 && (
                                <span className="text-xs px-2 py-1 rounded-full bg-status-moderate/20 text-status-moderate font-medium">
                                  Хорошо
                                </span>
                              )}
                              {displayHealthIndex >= 50 && displayHealthIndex < 70 && (
                                <span className="text-xs px-2 py-1 rounded-full bg-status-warning/20 text-status-warning font-medium">
                                  Умеренно
                                </span>
                              )}
                              {displayHealthIndex < 50 && (
                                <span className="text-xs px-2 py-1 rounded-full bg-status-danger/20 text-status-danger font-medium">
                                  Внимание
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Heart className="h-7 w-7 md:h-8 md:w-8 text-primary/60 flex-shrink-0" />
                      </div>
                    </div>

                    {/* Compact Metric Cards - equal height */}
                    <div className="flex flex-col h-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-border/50">
                      <Activity className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Анализов</div>
                      <div className="text-3xl font-bold text-foreground tabular-nums mt-auto">{displayAnalysesCount}</div>
                    </div>

                    <div className="flex flex-col h-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-border/50">
                      <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Последнее изменение</div>
                      <div className={`text-2xl font-bold tabular-nums mt-auto ${
                        displayRecentChange && displayRecentChange < 0 
                          ? "text-status-good" 
                          : displayRecentChange && displayRecentChange > 0
                          ? "text-status-danger"
                          : "text-foreground"
                      }`}>
                        {displayRecentChange !== null 
                          ? `${displayRecentChange > 0 ? '+' : ''}${displayRecentChange.toFixed(1)} г.`
                          : "—"
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {displayRecentPeriod || "за период"}
                      </div>
                    </div>

                    <div className="flex flex-col h-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-border/50">
                      <Trophy className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Общий прогресс</div>
                      <div className={`text-2xl font-bold tabular-nums mt-auto ${
                        displayTotalProgress && displayTotalProgress < 0 
                          ? "text-status-good" 
                          : displayTotalProgress && displayTotalProgress > 0
                          ? "text-status-danger"
                          : "text-foreground"
                      }`}>
                        {displayTotalProgress !== null 
                          ? `${displayTotalProgress > 0 ? '+' : ''}${displayTotalProgress.toFixed(1)} г.`
                          : "—"
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {displayFirstAnalysisDate || "всего"}
                      </div>
                    </div>

                    <div className="flex flex-col h-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-border/50">
                      <Calendar className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Следующий анализ</div>
                      {nextBooking ? (
                        <>
                          <div className="text-xl font-bold text-foreground mb-1 tabular-nums">
                            {format(new Date(nextBooking.booking_date), 'd MMM', { locale: ru })}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            через {differenceInDays(new Date(nextBooking.booking_date), new Date())} дн.
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground mb-2 mt-auto">Не запланирован</div>
                      )}
                    </div>

                    {/* Health Percentile */}
                    <div className="col-span-2 p-4 rounded-2xl bg-background/50 border border-border/50">
                      {(() => {
                        if (!displayBiologicalAge || !chronologicalAge) {
                          return (
                            <div className="flex items-center gap-3">
                              <Trophy className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">Место среди ровесников</div>
                                <div className="text-xl font-bold text-muted-foreground">—</div>
                              </div>
                            </div>
                          );
                        }

                        const diff = chronologicalAge - displayBiologicalAge;
                        let topPercent = 0;
                        let betterThanPercent = 0;
                        let Icon = Trophy;
                        let color = "text-muted-foreground";

                        if (diff >= 10) {
                          topPercent = 5;
                          betterThanPercent = 95;
                          color = "text-status-good";
                        } else if (diff >= 7) {
                          topPercent = 10;
                          betterThanPercent = 90;
                          color = "text-status-good";
                        } else if (diff >= 4) {
                          topPercent = 20;
                          betterThanPercent = 80;
                          color = "text-status-good";
                        } else if (diff >= 2) {
                          topPercent = 40;
                          betterThanPercent = 60;
                          color = "text-status-moderate";
                        } else if (diff >= -2) {
                          topPercent = 60;
                          betterThanPercent = 40;
                          Icon = Target;
                        } else {
                          topPercent = 80;
                          betterThanPercent = 20;
                          color = "text-status-warning";
                          Icon = TrendingUp;
                        }

                        return (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <Icon className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} />
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Место среди ровесников</div>
                                <div className={`text-xl md:text-2xl font-bold ${color} tabular-nums`}>Топ {topPercent}%</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Лучше {betterThanPercent}% людей вашего возраста
                                </div>
                              </div>
                            </div>
                            {diff !== 0 && (
                              <div className="text-right flex-shrink-0">
                                <div className={`text-xl md:text-2xl font-bold ${color} tabular-nums whitespace-nowrap`}>
                                  {diff > 0 ? '−' : '+'}{Math.abs(diff).toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">лет</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Dynamics */}
              <TabsContent value="dynamics" className="mt-0">
                {displayAllAnalyses.length >= 2 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BioAgeTrendChart 
                      analyses={displayAllAnalyses}
                      birthDate={profile?.birth_date}
                    />
                    <HealthIndexTrendChart 
                      analyses={displayAllAnalyses}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="h-16 w-16 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Динамика будет доступна после проведения минимум 2 анализов
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Weight Tracker */}
        <WeightTracker />

        {/* System Ratings */}
        <SystemRatingsCard
          categoryScores={displayCategoryScores}
          analyses={displayAllAnalyses}
        />

        {/* Biomarkers & Trends Tabs */}
        <Card className="border-border bg-card overflow-visible">
          <CardContent className="p-0 overflow-visible">
            <Tabs defaultValue="biomarkers" className="w-full">
              <div className="px-4 pt-4 md:px-6 md:pt-6">
                <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted">
                  <TabsTrigger value="biomarkers">Маркеры</TabsTrigger>
                  <TabsTrigger value="trends">Тренды</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="biomarkers" className="mt-0">
                <Biomarkers categoryScores={displayCategoryScores} />
              </TabsContent>
              <TabsContent value="trends" className="mt-0">
                <Trends />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

    </div>
  );
}
