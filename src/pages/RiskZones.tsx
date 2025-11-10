import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { RiskMap } from "@/components/risk-zones/RiskMap";
import { PriorityTasks } from "@/components/risk-zones/PriorityTasks";
import { AgingBlockers } from "@/components/risk-zones/AgingBlockers";
import { RiskZonesSkeleton } from "@/components/skeletons/RiskZonesSkeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function RiskZones() {
  const { getUserId } = useViewAsUser();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);

  useEffect(() => {
    fetchRiskZones();
  }, []);

  const fetchRiskZones = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) return;

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
            priority_tasks: existingAnalysis.priority_tasks,
            aging_blockers: existingAnalysis.aging_blockers,
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
      <div className="p-4 md:p-8">
        <RiskZonesSkeleton />
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertTriangle className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">
            Нет данных для анализа
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Добавьте хотя бы один анализ, чтобы получить оценку зон риска
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Зоны риска
          </h1>
          <p className="text-sm text-muted-foreground">
            Комплексная оценка состояния здоровья и потенциальных рисков
          </p>
        </div>
        <Button
          onClick={generateAnalysis}
          disabled={analyzing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Анализ..." : "Обновить"}
        </Button>
      </div>

      {/* Priority Tasks */}
      {riskData.priority_tasks?.tasks && (
        <PriorityTasks tasks={riskData.priority_tasks.tasks} />
      )}

      {/* Risk Map */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Карта рисков
        </h2>
        {riskData.risk_map?.categories && (
          <RiskMap categories={riskData.risk_map.categories} />
        )}
      </div>

      {/* Aging Blockers */}
      {riskData.aging_blockers?.blockers && (
        <AgingBlockers blockers={riskData.aging_blockers.blockers} />
      )}
    </div>
  );
}