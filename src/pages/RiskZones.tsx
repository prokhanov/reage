import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { RiskMap } from "@/components/risk-zones/RiskMap";
import { AgingBlockers } from "@/components/risk-zones/AgingBlockers";
import { SmartPriorities } from "@/components/risk-zones/SmartPriorities";
import { RiskZonesSkeleton } from "@/components/skeletons/RiskZonesSkeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";


export default function RiskZones() {
  const { getUserId } = useViewAsUser();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    fetchRiskZones();
  }, []);

  const fetchRiskZones = async () => {
    try {
      setLoading(true);
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
            has_biomarkers: true // Assume true if saved in DB
          });
          setLoading(false);
          return;
        }
      }

      // Generate new analysis
      await generateAnalysis();
    } catch (error) {
      console.error("Error fetching risk zones:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные о зонах риска",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      
      toast({
        title: "Анализ завершен",
        description: "Зоны риска обновлены",
      });
    } catch (error: any) {
      console.error("Error generating analysis:", error);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось выполнить анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <RiskZonesSkeleton />
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertTriangle className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">
            Нет данных для анализа
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Добавьте анализ с биомаркерами, чтобы получить полноценную оценку зон риска
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {riskData && !riskData.has_biomarkers && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Предварительные рекомендации</AlertTitle>
          <AlertDescription>
            Для точной оценки зон риска и формирования персональной стратегии необходимы лабораторные данные. 
            Сдайте анализы крови для получения полноценной аналитики.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Стратегическая карта здоровья</h1>
          {riskData && riskData.analysis_date && (
            <p className="text-sm text-muted-foreground">
              Последнее обновление: {format(new Date(riskData.analysis_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </p>
          )}
        </div>
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
              Обновить анализ
            </>
          )}
        </Button>
      </div>

      {riskData?.smart_priorities && (
        <SmartPriorities data={riskData.smart_priorities} />
      )}

      {riskData.risk_map?.categories && (
        <RiskMap categories={riskData.risk_map.categories} />
      )}

      {riskData.aging_blockers?.blockers && (
        <AgingBlockers blockers={riskData.aging_blockers.blockers} />
      )}
    </div>
  );
}