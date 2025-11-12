
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart, AlertCircle, Info, Clock, Sparkles, AlertTriangle, RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskMap } from "@/components/risk-zones/RiskMap";
import { AgingBlockers } from "@/components/risk-zones/AgingBlockers";
import { SmartPriorities } from "@/components/risk-zones/SmartPriorities";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BodyHeatmap } from "@/components/BodyHeatmap";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { WeightTracker } from "@/components/WeightTracker";
import { format } from "date-fns";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDemoMode, getLatestDemoAnalysis } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { BiologicalAgeCircle } from "@/components/BiologicalAgeCircle";
import { SystemRatingsCard } from "@/components/dashboard/SystemRatingsCard";
import { HealthTrendsCard } from "@/components/dashboard/HealthTrendsCard";
import { HealthPercentileCard } from "@/components/dashboard/HealthPercentileCard";
import { NextAnalysisCard } from "@/components/dashboard/NextAnalysisCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { getUserId, isViewMode, viewAsUserId } = useViewAsUser();
  const { demoMode, demoData, loading: demoLoading } = useDemoMode();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysesCount, setAnalysesCount] = useState(0);
  const [latestBioAge, setLatestBioAge] = useState<number | null>(null);
  const [latestHealthIndex, setLatestHealthIndex] = useState<number | null>(null);
  const [latestBiomarkersMetadata, setLatestBiomarkersMetadata] = useState<any>(null);
  const [ageTrend, setAgeTrend] = useState<string | null>(null);
  const [agingRate, setAgingRate] = useState<number | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [bodyHeatmapData, setBodyHeatmapData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Reset all state when exiting view mode
    setProfile(null);
    setLoading(true);
    setAnalysesCount(0);
    setLatestBioAge(null);
    setLatestHealthIndex(null);
    setLatestBiomarkersMetadata(null);
    setAgeTrend(null);
    setAgingRate(null);
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
      if (!demoMode) {
        fetchRiskZones();
      }
    }
  }, [profile, demoMode]);

  useEffect(() => {
    if (demoMode && demoData) {
      setRiskData(demoData.risk_zones);
      setNeedsRefresh(false);
    }
  }, [demoMode, demoData]);

  const fetchAnalysesStats = async () => {
    if (demoMode) return; // Skip fetching real data in demo mode
    if (!viewAsUserId) return;

    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', viewAsUserId);

      setAnalysesCount(totalCount || 0);

      // Get all analyses for trends
      const { data: allAnalysesData } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', viewAsUserId)
        .order('date', { ascending: true });

      setAllAnalyses(allAnalysesData || []);

      // Get latest analysis for biological age
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('id, biological_age, health_index, biomarkers_metadata, date')
        .eq('user_id', viewAsUserId)
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
          
          // Calculate aging rate
          if (latestAnalysis.biological_age && profile?.birth_date) {
            const chronologicalAge = calculateAge(profile.birth_date);
            const rate = latestAnalysis.biological_age / chronologicalAge;
            setAgingRate(rate);
          }
        } else {
          // No biomarkers - clear the values to show warning
          setLatestBioAge(null);
          setLatestHealthIndex(null);
          setLatestBiomarkersMetadata(null);
          setAgingRate(null);
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
  const displayAgingRate = latestDemoAnalysis?.ai_analysis?.aging_rate || agingRate;
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

  const chronologicalAge = profile?.birth_date ? calculateAge(profile.birth_date) : (demoMode && demoData ? demoData.profile.chronological_age : null);
  const ageDifference = displayBioAge && chronologicalAge ? chronologicalAge - displayBioAge : null;
  const circleProgress = displayHealthIndex ? displayHealthIndex : 0;

  // Calculate progress metrics
  const analyses = demoMode && demoData ? demoData.analyses : allAnalyses;
  let displayRecentChange: number | null = null;
  let displayRecentPeriod: string | null = null;
  let displayTotalProgress: number | null = null;

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
      {demoMode && <DemoBanner />}

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

        {/* Central Bio Age Circle */}
        <Card className="border-border bg-card backdrop-blur-sm">
          <CardContent className="pt-8 pb-12">
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">
              Ваш биологический возраст
            </h2>

            <div className="flex flex-col lg:flex-row items-start justify-center gap-12 lg:gap-20">
              {/* Left side - Circle and age comparison */}
              <div className="flex flex-col items-center gap-6 flex-shrink-0">
                {/* Animated Biological Age Circle */}
                <BiologicalAgeCircle
                  biologicalAge={displayBioAge}
                  chronologicalAge={chronologicalAge}
                  healthIndex={displayHealthIndex}
                  biomarkersMetadata={displayBiomarkersMetadata}
                />

                {/* Age Comparison Text Below Circle */}
                <div className="text-center max-w-md">
                  {displayBioAge && chronologicalAge && ageDifference !== null ? (
                    <>
                      {ageDifference > 0 ? (
                        <p className="text-base text-status-good animate-fade-in">
                          Это на <span className="font-bold text-xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} моложе, чем ваш паспортный возраст! 🎉
                        </p>
                      ) : ageDifference < 0 ? (
                        <p className="text-base text-status-danger animate-fade-in">
                          Это на <span className="font-bold text-xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} старше вашего паспортного возраста
                        </p>
                      ) : (
                        <p className="text-base text-muted-foreground animate-fade-in">
                          Это соответствует вашему паспортному возрасту
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-base text-muted-foreground">
                      Добавьте анализ, чтобы узнать свой биологический возраст
                    </p>
                  )}
                </div>
              </div>

              {/* Right side - Stats */}
              <div className="flex flex-col gap-6 w-full lg:w-auto lg:min-w-[300px]">
                {/* Health Index */}
                <div className="space-y-3 p-6 rounded-lg border border-border bg-background/50">
                  <div className="flex items-center gap-3">
                    <Heart className="h-6 w-6 text-accent flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Индекс здоровья</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">{displayHealthIndex || "—"}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    </div>
                  </div>
                  
                  {displayHealthIndex !== null && (
                    <div className="flex justify-start">
                      {displayHealthIndex >= 85 && (
                        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                          Отличное здоровье
                        </Badge>
                      )}
                      {displayHealthIndex >= 70 && displayHealthIndex < 85 && (
                        <Badge variant="secondary">
                          Хорошее здоровье
                        </Badge>
                      )}
                      {displayHealthIndex >= 50 && displayHealthIndex < 70 && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
                          Умеренные отклонения
                        </Badge>
                      )}
                      {displayHealthIndex < 50 && (
                        <Badge variant="destructive">
                          Требуется внимание
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50">
                    <Activity className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Анализов</div>
                      <div className="text-2xl font-bold text-foreground">{displayAnalysesCount}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50">
                    <TrendingUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Динамика</div>
                      <div className={`text-2xl font-bold ${
                        displayRecentChange && displayRecentChange < 0 
                          ? "text-status-good" 
                          : displayRecentChange && displayRecentChange > 0
                          ? "text-status-danger"
                          : "text-foreground"
                      }`}>
                        {displayRecentChange !== null 
                          ? `${displayRecentChange > 0 ? '+' : ''}${displayRecentChange.toFixed(1)} лет`
                          : "—"
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {displayRecentPeriod || "за последний период"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50">
                    <Trophy className="h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Общий прогресс</div>
                      <div className={`text-2xl font-bold ${
                        displayTotalProgress && displayTotalProgress < 0 
                          ? "text-status-good" 
                          : displayTotalProgress && displayTotalProgress > 0
                          ? "text-status-danger"
                          : "text-foreground"
                      }`}>
                        {displayTotalProgress !== null 
                          ? `${displayTotalProgress > 0 ? '+' : ''}${displayTotalProgress.toFixed(1)} лет`
                          : "—"
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {displayTotalProgress !== null 
                          ? displayTotalProgress < 0 
                            ? "помолодели" 
                            : "постарели"
                          : "за всё время"
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid - 3 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NextAnalysisCard userId={profile?.id} />
          <HealthPercentileCard 
            biologicalAge={displayBiologicalAge}
            chronologicalAge={chronologicalAge}
          />
        </div>

        {/* System Health Grid - 2/3 + 1/3 layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SystemRatingsCard 
              categoryScores={displayCategoryScores}
            />
          </div>
          <div className="lg:col-span-1">
            <HealthTrendsCard 
              analyses={displayAllAnalyses}
            />
          </div>
        </div>

        {/* Body Metrics Grid - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeightTracker />
          
          <Card className="border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Карта тела</CardTitle>
            </CardHeader>
            <CardContent>
              {displayBodyHeatmap.length > 0 ? (
                <BodyHeatmap 
                  biomarkerData={displayBodyHeatmap} 
                  patientAge={chronologicalAge} 
                  patientGender={profile?.gender as 'male' | 'female' | undefined}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Нет данных для отображения</p>
                    <p className="text-xs mt-2">Добавьте анализ для просмотра карты тела</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
      </div>
  );
}
