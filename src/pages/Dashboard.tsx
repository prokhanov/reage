
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart, AlertCircle, Info, Clock, Sparkles, AlertTriangle, RefreshCw, Trophy, Calendar, Target, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskMap } from "@/components/risk-zones/RiskMap";
import { AgingBlockers } from "@/components/risk-zones/AgingBlockers";
import { SmartPriorities } from "@/components/risk-zones/SmartPriorities";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BodyHeatmap } from "@/components/BodyHeatmap";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { WeightTracker } from "@/components/WeightTracker";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDemoMode, getLatestDemoAnalysis } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { BiologicalAgeCircle } from "@/components/BiologicalAgeCircle";
import { SystemRatingsCard } from "@/components/dashboard/SystemRatingsCard";
import { AnalysisBookingDialog } from "@/components/AnalysisBookingDialog";
import { BioAgeTrendChart } from "@/components/dashboard/BioAgeTrendChart";
import { HealthIndexTrendChart } from "@/components/dashboard/HealthIndexTrendChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const navigate = useNavigate();
  const { getUserId, isViewMode, viewAsUserId } = useViewAsUser();
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
  const [bodyHeatmapData, setBodyHeatmapData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [nextBooking, setNextBooking] = useState<any>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  useEffect(() => {
    // Reset all state when exiting view mode
    setProfile(null);
    setLoading(true);
    setAnalysesCount(0);
    setLatestBioAge(null);
    setLatestHealthIndex(null);
    setLatestBiomarkersMetadata(null);
    setAgeTrend(null);
    setRecentAnalyses([]);
    setBodyHeatmapData([]);
    setRiskData(null);
    setNeedsRefresh(false);
    setAnalyzing(false);
    
    fetchProfile();
  }, [viewAsUserId]);

  useEffect(() => {
    if (profile) {
      fetchAnalysesStats();
      fetchBodyHeatmapData();
      fetchNextBooking();
    }
  }, [profile]);

  useEffect(() => {
    if (demoMode && demoData) {
      setRiskData(demoData.risk_zones);
      setNeedsRefresh(false);
    } else if (!demoMode && profile) {
      // Clear demo risk data and fetch real data when demo mode is disabled
      setRiskData(null);
      fetchRiskZones();
    }
  }, [demoMode, demoData, profile]);

  const fetchAnalysesStats = async () => {
    if (demoMode) return; // Skip fetching real data in demo mode
    const userId = await getUserId();
    if (!userId) return;

    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setAnalysesCount(totalCount || 0);

      // Get all analyses for trends
      const { data: allAnalysesData } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      setAllAnalyses(allAnalysesData || []);

      // Get latest analysis for biological age
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('id, biological_age, health_index, biomarkers_metadata, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (latestAnalysis) {
        // Validate that this analysis has biomarkers
        const { count: biomarkerCount } = await supabase
          .from('analysis_values')
          .select('*', { count: 'exact', head: true })
          .eq('analysis_id', latestAnalysis.id);

        // Only use biological_age and health_index if biomarkers exist
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
          // No biomarkers - clear the values to show warning
          setLatestBioAge(null);
          setLatestHealthIndex(null);
          setLatestBiomarkersMetadata(null);
          
        }
      }

      // Get recent analyses
      const { data: analyses } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', viewAsUserId)
        .order('date', { ascending: false })
        .limit(3);

      setRecentAnalyses(analyses || []);

      // Calculate trend if there are multiple analyses
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

  const fetchRiskZones = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      // Check if profile needs refresh
      const { data: profile } = await supabase
        .from("profiles")
        .select("needs_risk_refresh")
        .eq("id", userId)
        .single();

      setNeedsRefresh(profile?.needs_risk_refresh || false);

      // Check for existing analysis (last 24 hours)
      const { data: existingAnalysis } = await supabase
        .from("risk_zone_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingAnalysis) {
        const analysisAge = Date.now() - new Date(existingAnalysis.created_at).getTime();
        const hoursOld = analysisAge / (1000 * 60 * 60);

        if (hoursOld < 24) {
          // Use cached analysis
          setRiskData({
            risk_map: existingAnalysis.risk_map,
            aging_blockers: existingAnalysis.aging_blockers,
            smart_priorities: existingAnalysis.smart_priorities,
            analysis_date: existingAnalysis.created_at,
            has_biomarkers: true
          });
          return;
        }
      }

      // Generate new analysis if no recent one exists
      await generateAnalysis();
    } catch (error) {
      console.error("Error fetching risk zones:", error);
    }
  };

  const generateAnalysis = async () => {
    try {
      setAnalyzing(true);
      const userId = await getUserId();
      if (!userId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("analyze-risk-zones", {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setRiskData(data);

      // Reset needs_refresh flag
      await supabase
        .from("profiles")
        .update({ needs_risk_refresh: false })
        .eq("id", userId);

      setNeedsRefresh(false);
    } catch (error: any) {
      console.error("Error generating analysis:", error);
    } finally {
      setAnalyzing(false);
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
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
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
        .single();

      setNextBooking(data);
    } catch (error) {
      console.error('Error loading next booking:', error);
    }
  };

  const fetchBodyHeatmapData = async () => {
    if (demoMode) return; // Skip fetching real data in demo mode
    try {
      const userId = await getUserId();
      if (!userId) return;

      // Получаем последний анализ
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(1);

      if (!analyses || analyses.length === 0) return;

      // Получаем биомаркеры последнего анализа с их нормами (включая age_ranges)
      const { data: biomarkerValues, error } = await supabase
        .from("analysis_values")
        .select(`
          value,
          biomarkers (
            name,
            category,
            normal_min,
            normal_max,
            normal_min_male,
            normal_max_male,
            normal_min_female,
            normal_max_female,
            age_ranges
          )
        `)
        .eq("analysis_id", analyses[0].id);

      if (error) throw error;

      const formattedDataRaw = biomarkerValues?.map((item: any) => ({
        category: item.biomarkers.category,
        name: item.biomarkers.name,
        value: item.value,
        normal_min: item.biomarkers.normal_min,
        normal_max: item.biomarkers.normal_max,
        normal_min_male: item.biomarkers.normal_min_male,
        normal_max_male: item.biomarkers.normal_max_male,
        normal_min_female: item.biomarkers.normal_min_female,
        normal_max_female: item.biomarkers.normal_max_female,
        age_ranges: item.biomarkers.age_ranges
      })) || [];

      // Удаляем возможные дубликаты по названию биомаркера
      const deduped = Array.from(new Map(formattedDataRaw.map((i: any) => [i.name, i])).values());

      setBodyHeatmapData(deduped);
    } catch (error) {
      console.error("Error fetching body heatmap data:", error);
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
  
  // For body heatmap in demo mode, use latest analysis biomarkers
  const latestAnalysisIndex = demoMode && demoData ? demoData.analyses.length - 1 : -1;
  const displayBodyHeatmap = demoMode && demoData 
    ? demoData.biomarkers
        .filter((b: any) => (b.analysis_index || 0) === latestAnalysisIndex)
        .map((b: any) => ({
          name: b.code,
          category: b.category,
          value: b.value,
          normal_min: null,
          normal_max: null
        }))
    : bodyHeatmapData;

  // Calculate chronological age at the date of the latest analysis (not today) for consistency with the chart
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
  const circleProgress = displayHealthIndex ? displayHealthIndex : 0;

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
     
     // Calculate period between last two analyses
     const latestDate = new Date(latest.date || latest.analysis_date);
     const secondLatestDate = new Date(secondLatest.date || secondLatest.analysis_date);
     const monthsDiff = Math.round((latestDate.getTime() - secondLatestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
     displayRecentPeriod = monthsDiff > 0 ? `за ${monthsDiff} ${monthsDiff === 1 ? 'месяц' : monthsDiff < 5 ? 'месяца' : 'месяцев'}` : null;

     displayTotalProgress = latestBioAge && firstBioAge ? latestBioAge - firstBioAge : null;
     
     // Format first analysis date for display
     const firstDate = new Date(first.date || first.analysis_date);
     displayFirstAnalysisDate = `с ${format(firstDate, 'LLL yyyy', { locale: ru })}`;
   }

  // Additional display variables
  const displayBiologicalAge = displayBioAge;
  const displayCategoryScores = demoMode && latestDemoAnalysis 
    ? latestDemoAnalysis.biomarkers_metadata?.ai_analysis?.category_scores 
    : latestBiomarkersMetadata?.ai_analysis?.category_scores;
  const displayAllAnalyses = analyses || [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Demo Banner */}
      {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}

      {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Добро пожаловать, {profile?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Паспортный возраст: <span className="text-primary font-medium">{chronologicalAge || "—"} лет</span>
          </p>
        </div>

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
          <CardHeader>
            <CardTitle className="text-2xl">Ваш биологический возраст</CardTitle>
          </CardHeader>
          <CardContent className="p-6 lg:p-8">
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
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
                  <div className="grid grid-cols-2 gap-4">
                    {/* Health Index - Highlighted Large Card */}
                    <div className="col-span-2 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground mb-2">Индекс здоровья</div>
                          <div className="text-5xl font-bold text-foreground mb-3">
                            {displayHealthIndex || "—"}
                            <span className="text-2xl text-muted-foreground ml-1">/100</span>
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
                        <Heart className="h-8 w-8 text-primary/60" />
                      </div>
                    </div>

                    {/* Compact Metric Cards - Uniform Height */}
                    {/* Analyses Count */}
                    <div className="p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
                      <Activity className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Анализов</div>
                      <div className="text-3xl font-bold text-foreground">{displayAnalysesCount}</div>
                    </div>

                    {/* Recent Change */}
                    <div className="p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
                      <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Последнее изменение</div>
                      <div className={`text-3xl font-bold ${
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
                      <div className="text-xs text-muted-foreground mt-1">
                        {displayRecentPeriod || "за период"}
                      </div>
                    </div>

                    {/* Total Progress */}
                    <div className="p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
                      <Trophy className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Общий прогресс</div>
                      <div className={`text-3xl font-bold ${
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
                      <div className="text-xs text-muted-foreground mt-1">
                        {displayFirstAnalysisDate || "всего"}
                      </div>
                    </div>

                    {/* Next Analysis */}
                    <div className="p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
                      <Calendar className="h-5 w-5 text-primary/60 mb-2" />
                      <div className="text-xs text-muted-foreground mb-1">Следующий анализ</div>
                      {nextBooking ? (
                        <>
                          <div className="text-2xl font-bold text-foreground mb-1">
                            {format(new Date(nextBooking.booking_date), 'd MMM', { locale: ru })}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            через {differenceInDays(new Date(nextBooking.booking_date), new Date())} дней
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground mb-3">Не запланирован</div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => setBookingDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Назначить внеурочный
                      </Button>
                    </div>

                    {/* Health Percentile */}
                    <div className="col-span-2 p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
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
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 ${color}`} />
                              <div>
                                <div className="text-xs text-muted-foreground">Место среди ровесников</div>
                                <div className={`text-2xl font-bold ${color}`}>Топ {topPercent}%</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Лучше {betterThanPercent}% людей вашего возраста
                                </div>
                              </div>
                            </div>
                            {diff !== 0 && (
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${color}`}>
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
                      Добавьте минимум 2 анализа для отслеживания динамики
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* System Health */}
        <SystemRatingsCard 
          categoryScores={displayCategoryScores}
          analyses={displayAllAnalyses}
        />

        {/* Weight Tracker - Full Width */}
        <WeightTracker />

        {/* Divider - Strategy Section */}
        <div className="relative py-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-muted-foreground font-medium">
              СТРАТЕГИЯ ЗДОРОВЬЯ
            </span>
          </div>
        </div>

        {/* Update Strategy Button */}
        {!demoMode && (
          <div className="flex justify-end">
            <Button
              onClick={generateAnalysis}
              disabled={analyzing}
              variant={needsRefresh ? "default" : "outline"}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Анализируем...
                </>
              ) : needsRefresh ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Доступно обновление
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Обновить стратегию
                </>
              )}
            </Button>
          </div>
        )}

        {/* Alert if no biomarkers in risk analysis */}
        {riskData && !riskData.has_biomarkers && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Предварительные рекомендации</AlertTitle>
            <AlertDescription>
              Для точной оценки стратегии и формирования персональной карты риска необходимы лабораторные данные. 
              Сдайте анализы крови для получения полноценной аналитики.
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Zones Components */}
         {riskData?.smart_priorities && (
           <SmartPriorities data={riskData.smart_priorities} />
         )}

         {riskData?.risk_map?.categories && (
           <RiskMap categories={riskData.risk_map.categories} />
         )}

         {riskData?.aging_blockers?.blockers && (
           <AgingBlockers blockers={riskData.aging_blockers.blockers} />
         )}

         {/* Message if no strategy data */}
         {!riskData && analysesCount > 0 && (
           <Card className="border-dashed">
             <CardContent className="py-12 text-center">
               <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-semibold mb-2">
                 Стратегия здоровья не сформирована
               </h3>
               <p className="text-muted-foreground mb-4">
                 Нажмите "Обновить стратегию" для формирования персональной карты здоровья
               </p>
             </CardContent>
           </Card>
         )}

      {/* Analysis Booking Dialog */}
      <AnalysisBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        onSuccess={() => {
          fetchNextBooking();
        }}
      />
    </div>
  );
}
