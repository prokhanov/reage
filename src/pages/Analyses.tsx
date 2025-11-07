import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FlaskConical, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";

interface Analysis {
  id: string;
  date: string;
  lab_name: string | null;
  health_index: number | null;
  biological_age: number | null;
  biomarkers_count?: number;
}

export default function Analyses() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("analyses")
        .select("id, date, lab_name, health_index, biological_age")
        .eq("user_id", userId);

      if (error) throw error;

      // Сортируем по дате на клиенте (во избежание ошибок order("date"))
      const sorted = (data || []).sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Получаем количество биомаркеров для каждого анализа (не падать при ошибке)
      const analysesWithCounts = await Promise.all(
        sorted.map(async (analysis) => {
          const { count, error: countError } = await supabase
            .from("analysis_values")
            .select("*", { count: "exact", head: true })
            .eq("analysis_id", analysis.id);
          if (countError) {
            console.warn("Count error for analysis", analysis.id, countError);
          }
          return {
            ...analysis,
            biomarkers_count: count || 0,
          } as Analysis;
        })
      );
      
      setAnalyses(analysesWithCounts);
    } catch (error: any) {
      console.error("Error loading analyses:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить анализы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading && analyses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            История анализов
          </h2>
          <p className="text-muted-foreground">Отслеживайте динамику своих показателей</p>
        </div>

        {analyses.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative mb-6">
                <FlaskConical className="h-20 w-20 text-primary/40" />
                <Sparkles className="h-8 w-8 text-accent absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 bg-gradient-primary bg-clip-text text-transparent">
                Ваши анализы скоро появятся здесь
              </h3>
              <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                Администратор добавит результаты ваших анализов после их обработки. 
                Вы получите уведомление, когда данные будут готовы к просмотру.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="hover:shadow-neon-primary hover:border-primary/50 transition-all cursor-pointer border-primary/20 bg-gradient-to-br from-card to-primary/5 group"
                onClick={() => {
                  if (isViewMode) {
                    setSimPath(`/analyses/${analysis.id}`);
                  } else {
                    navigate(`/analyses/${analysis.id}`);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      {new Date(analysis.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </CardTitle>
                    {analysis.biomarkers_count !== undefined && analysis.biomarkers_count > 0 && (
                      <Badge 
                        className="ml-auto text-xs bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-sm"
                      >
                        {analysis.biomarkers_count} маркеров
                      </Badge>
                    )}
                  </div>
                  {analysis.lab_name && (
                    <p className="text-sm text-muted-foreground">{analysis.lab_name}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {analysis.health_index !== null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Индекс здоровья:</span>
                        <span className="text-2xl font-bold text-primary">
                          {analysis.health_index}
                        </span>
                      </div>
                      {analysis.biological_age !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Био. возраст:</span>
                          <span className="text-lg font-semibold text-foreground">
                            {analysis.biological_age} лет
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Нажмите, чтобы добавить показатели
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
