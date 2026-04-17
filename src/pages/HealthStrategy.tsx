import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { RiskMap } from "@/components/risk-zones/RiskMap";
import { AgingBlockers } from "@/components/risk-zones/AgingBlockers";
import { SmartPriorities } from "@/components/risk-zones/SmartPriorities";
import { useEffect, useState } from "react";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";

export default function HealthStrategy() {
  const { getUserId, isViewMode, viewAsUserId } = useViewAsUser();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const [riskData, setRiskData] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAnalyses, setHasAnalyses] = useState(false);

  useEffect(() => {
    setRiskData(null);
    setNeedsRefresh(false);
    setAnalyzing(false);
    setLoading(true);
    loadData();
  }, [viewAsUserId]);

  useEffect(() => {
    if (demoMode && demoData) {
      setRiskData(demoData.risk_zones);
      setNeedsRefresh(false);
      setLoading(false);
    } else if (!demoMode) {
      setRiskData(null);
      fetchRiskZones();
    }
  }, [demoMode, demoData]);

  const loadData = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { count } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setHasAnalyses((count || 0) > 0);

      if (demoMode && demoData) {
        setRiskData(demoData.risk_zones);
        setNeedsRefresh(false);
      } else {
        await fetchRiskZones();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskZones = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("needs_risk_refresh")
        .eq("id", userId)
        .single();

      setNeedsRefresh(profile?.needs_risk_refresh || false);

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
          setRiskData({
            risk_map: existingAnalysis.risk_map,
            aging_blockers: existingAnalysis.aging_blockers,
            smart_priorities: existingAnalysis.smart_priorities,
            analysis_date: existingAnalysis.created_at,
            has_biomarkers: true,
          });
          return;
        }
      }

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
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setRiskData(data);

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

  if (loading || demoLoading) {
    return (
      <div className="p-4 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Стратегия здоровья
          </h1>
          <p className="text-sm text-muted-foreground">
            Персональная дорожная карта на основе AI-анализа ваших биомаркеров
          </p>
        </div>

        {!demoMode && (
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
        )}
      </div>

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

      {riskData?.smart_priorities && (
        <SmartPriorities data={riskData.smart_priorities} />
      )}

      {riskData?.risk_map?.categories && (
        <RiskMap categories={riskData.risk_map.categories} />
      )}

      {riskData?.aging_blockers?.blockers && (
        <AgingBlockers blockers={riskData.aging_blockers.blockers} />
      )}

      {!riskData && hasAnalyses && (
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

      {!riskData && !hasAnalyses && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Нет анализов
            </h3>
            <p className="text-muted-foreground mb-4">
              Добавьте первый анализ для формирования стратегии здоровья
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
