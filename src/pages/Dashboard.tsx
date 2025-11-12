
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart, AlertCircle, Info, Clock, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
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
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";

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
    if (!viewAsUserId) return;

    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', viewAsUserId);

      setAnalysesCount(totalCount || 0);

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
  const displayBioAge = demoMode && demoData ? demoData.analysis.biological_age : latestBioAge;
  const displayHealthIndex = demoMode && demoData ? demoData.analysis.health_index : latestHealthIndex;
  const displayAnalysesCount = demoMode && demoData ? 1 : analysesCount;
  const displayAgingRate = demoMode && demoData ? demoData.analysis.ai_analysis.aging_rate : agingRate;
  const displayBiomarkersMetadata = demoMode && demoData ? { ai_analysis: demoData.analysis.ai_analysis } : latestBiomarkersMetadata;
  const displayBodyHeatmap = demoMode && demoData ? demoData.biomarkers.map((b: any) => ({
    name: b.code,
    category: b.category,
    value: b.value,
    normal_min: null,
    normal_max: null
  })) : bodyHeatmapData;

  const chronologicalAge = profile?.birth_date ? calculateAge(profile.birth_date) : (demoMode && demoData ? demoData.profile.chronological_age : null);
  const ageDifference = displayBioAge && chronologicalAge ? chronologicalAge - displayBioAge : null;
  const circleProgress = displayHealthIndex ? displayHealthIndex : 0;

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
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
              {/* Circular Progress */}
              <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="hsl(var(--border))"
                    strokeWidth="16"
                    fill="none"
                    opacity="0.2"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke={
                      ageDifference && ageDifference > 0 
                        ? "hsl(var(--status-good))" 
                        : ageDifference && ageDifference < 0
                        ? "hsl(var(--status-danger))"
                        : "hsl(var(--primary))"
                    }
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 112}`}
                    strokeDashoffset={`${2 * Math.PI * 112 * (1 - circleProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-6xl font-bold text-foreground animate-scale-in">
                    {latestBioAge ? latestBioAge.toFixed(1) : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    лет
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 px-4">
                    Биологический возраст
                  </div>
                  {latestBiomarkersMetadata && (
                    <div className="space-y-2">
                      {/* Базовая информация о биомаркерах */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 mt-1 cursor-help">
                              <Info className="h-3 w-3" />
                              {latestBiomarkersMetadata.current_count} свежих + {latestBiomarkersMetadata.historical_count} исторических
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium mb-1">Расчет основан на {latestBiomarkersMetadata.total_count} биомаркерах:</p>
                            <p className="text-sm">• {latestBiomarkersMetadata.current_count} из текущего анализа</p>
                            <p className="text-sm">• {latestBiomarkersMetadata.historical_count} из предыдущих анализов (за 4 месяца)</p>
                            {latestBiomarkersMetadata.oldest_historical_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Самые старые данные: {new Date(latestBiomarkersMetadata.oldest_historical_date).toLocaleDateString('ru-RU')}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* AI-анализ если есть */}
                      {latestBiomarkersMetadata.ai_analysis && (
                        <div className="space-y-3 mt-4">
                          {/* Уверенность и скорость старения */}
                          <div className="flex items-center justify-center gap-3 text-xs">
                            <Badge variant={
                              latestBiomarkersMetadata.ai_analysis.confidence_score >= 80 ? "default" :
                              latestBiomarkersMetadata.ai_analysis.confidence_score >= 60 ? "secondary" : "outline"
                            }>
                              Уверенность: {latestBiomarkersMetadata.ai_analysis.confidence_score}%
                            </Badge>
                            <Badge variant={
                              latestBiomarkersMetadata.ai_analysis.aging_rate < 1 ? "default" :
                              latestBiomarkersMetadata.ai_analysis.aging_rate === 1 ? "secondary" : "destructive"
                            }>
                              Скорость старения: {latestBiomarkersMetadata.ai_analysis.aging_rate.toFixed(2)}x
                            </Badge>
                          </div>

                          {/* Объяснение AI */}
                          <Alert className="text-left">
                            <Sparkles className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {latestBiomarkersMetadata.ai_analysis.explanation}
                            </AlertDescription>
                          </Alert>

                          {/* Топ-3 ключевых маркера старения */}
                          {latestBiomarkersMetadata.ai_analysis.key_aging_markers?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Ключевые маркеры старения:</p>
                              {latestBiomarkersMetadata.ai_analysis.key_aging_markers.slice(0, 3).map((marker: any, idx: number) => (
                                <TooltipProvider key={idx}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 text-xs cursor-help">
                                        <Badge variant={marker.impact === 'high' ? 'destructive' : marker.impact === 'moderate' ? 'secondary' : 'outline'}>
                                          {marker.name}
                                        </Badge>
                                        <span className="text-muted-foreground">{marker.deviation}</span>
                                        <Info className="h-3 w-3" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{marker.reason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          )}

                          {/* Недостающие критичные маркеры */}
                          {latestBiomarkersMetadata.ai_analysis.missing_critical_markers?.length > 0 && (
                            <Alert variant="destructive" className="text-left">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Для более точной оценки рекомендуем сдать: {latestBiomarkersMetadata.ai_analysis.missing_critical_markers.join(", ")}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Оценки по категориям */}
                          {latestBiomarkersMetadata.ai_analysis.category_scores && (
                            <div className="grid grid-cols-5 gap-2 mt-4">
                              {Object.entries(latestBiomarkersMetadata.ai_analysis.category_scores).map(([category, data]: [string, any]) => (
                                <TooltipProvider key={category}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-center p-2 rounded-lg border cursor-help">
                                        <div className="text-2xl mb-1">
                                          {category.includes("Энергия") && "⚡"}
                                          {category.includes("Сердечно-сосудистая") && "❤️"}
                                          {category.includes("Воспалительная") && "🛡️"}
                                          {category.includes("Эндокринная") && "🧬"}
                                          {category.includes("Обмен веществ") && "🔄"}
                                        </div>
                                        <div className={`text-sm font-semibold ${
                                          data.score >= 70 ? 'text-green-600' : 
                                          data.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                          {data.score}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">{category}</p>
                                      <p className="text-xs">Оценка: {data.score}/100</p>
                                      <p className="text-xs">Влияние: {
                                        data.impact === 'high' ? 'Высокое' :
                                        data.impact === 'moderate' ? 'Среднее' : 'Низкое'
                                      }</p>
                                      {data.key_markers?.length > 0 && (
                                        <p className="text-xs mt-1">Ключевые: {data.key_markers.join(", ")}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Age Comparison */}
              <div className="flex flex-col gap-4 text-center lg:text-left">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Ваш биологический возраст
                  </h3>
                  {displayBioAge && chronologicalAge && ageDifference !== null ? (
                    <>
                    {ageDifference > 0 ? (
                      <p className="text-lg text-status-good animate-fade-in">
                        Это на <span className="font-bold text-2xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} моложе, чем ваш паспортный возраст! 🎉
                      </p>
                    ) : ageDifference < 0 ? (
                      <p className="text-lg text-status-danger animate-fade-in">
                        Это на <span className="font-bold text-2xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} старше вашего паспортного возраста
                      </p>
                      ) : (
                        <p className="text-lg text-muted-foreground animate-fade-in">
                          Это соответствует вашему паспортному возрасту
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-lg text-muted-foreground">
                      Добавьте анализ, чтобы узнать свой биологический возраст
                    </p>
                  )}
                </div>

                {/* Health Index */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Heart className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">Индекс здоровья:</span>
                    <span className="text-2xl font-bold text-foreground">{displayHealthIndex || "—"}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  
                  {/* Интерпретация значения */}
                  {displayHealthIndex !== null && (
                    <div className="flex justify-center lg:justify-start">
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

                  {/* Расшифровка расчета если есть AI */}
                  {displayHealthIndex !== null && displayBiomarkersMetadata?.ai_analysis?.explanation && (
                    <Alert className="bg-card/50 border-border/50">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs text-muted-foreground">
                        Индекс рассчитан с учетом веса биомаркеров, степени отклонения и взаимосвязей.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col items-center lg:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Анализов</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{displayAnalysesCount}</span>
                  </div>
                  <div className="flex flex-col items-center lg:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-status-good" />
                      <span className="text-sm text-muted-foreground">Скорость</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{displayAgingRate ? displayAgingRate.toFixed(2) : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Разница в возрасте</CardTitle>
              <Brain className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                ageDifference && ageDifference > 0 
                  ? "text-status-good" 
                  : ageDifference && ageDifference < 0
                  ? "text-status-danger"
                  : "text-foreground"
              }`}>
                {ageDifference !== null ? (ageDifference > 0 ? `−${ageDifference.toFixed(1)}` : `+${Math.abs(ageDifference).toFixed(1)}`) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ageDifference !== null ? "лет от паспортного" : "Требуется анализ"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Скорость старения</CardTitle>
              <Activity className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                displayAgingRate && displayAgingRate < 1 
                  ? "text-status-good" 
                  : displayAgingRate && displayAgingRate > 1
                  ? "text-status-danger"
                  : "text-foreground"
              }`}>
                {displayAgingRate ? displayAgingRate.toFixed(2) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {displayAgingRate ? (displayAgingRate < 1 ? "Медленнее нормы" : displayAgingRate > 1 ? "Быстрее нормы" : "Норма") : "Требуется анализ"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Тренд за месяц</CardTitle>
              <TrendingUp className="h-5 w-5 text-status-good" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {ageTrend || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Изменение возраста</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Всего анализов</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{displayAnalysesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">За всё время</p>
            </CardContent>
          </Card>
        </div>

        {/* Weight Tracker */}
        <WeightTracker />

        {/* Body Heatmap */}
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
