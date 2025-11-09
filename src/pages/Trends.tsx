import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { format } from "date-fns";

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
}

interface AnalysisValue {
  value: number;
  analysis: {
    date: string;
  };
}

export default function Trends() {
  const { getUserId } = useViewAsUser();
  const { setSimPath } = useContext(ViewAsPatientContext);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"3" | "6" | "12">("6");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadBiomarkers();
  }, []);

  useEffect(() => {
    if (selectedBiomarker) {
      loadTrendData(selectedBiomarker);
    }
  }, [selectedBiomarker, period]);

  const loadBiomarkers = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      // Get biomarkers that have values
      const { data: valuesData, error: valuesError } = await supabase
        .from("analysis_values")
        .select(`
          biomarker_id,
          biomarkers (id, name, code, unit, normal_min, normal_max)
        `)
        .limit(1000);

      if (valuesError) throw valuesError;

      // Extract unique biomarkers
      const uniqueBiomarkers = Array.from(
        new Map(
          valuesData
            .filter((v: any) => v.biomarkers)
            .map((v: any) => [v.biomarkers.id, v.biomarkers])
        ).values()
      ) as Biomarker[];

      setBiomarkers(uniqueBiomarkers);
      if (uniqueBiomarkers.length > 0 && !selectedBiomarker) {
        setSelectedBiomarker(uniqueBiomarkers[0].id);
      }
    } catch (error: any) {
      console.error("Error loading biomarkers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить биомаркеры",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async (biomarkerId: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(period));

      const { data, error } = await supabase
        .from("analysis_values")
        .select(`
          value,
          analyses!inner (
            date,
            user_id
          )
        `)
        .eq("biomarker_id", biomarkerId)
        .eq("analyses.user_id", userId)
        .gte("analyses.date", format(monthsAgo, 'yyyy-MM-dd'))
        .order("analyses(date)", { ascending: true });

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        date: new Date(item.analyses.date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        }),
        value: item.value,
      }));

      setTrendData(formattedData);
    } catch (error: any) {
      console.error("Error loading trend data:", error);
    }
  };

  const selectedBiomarkerData = biomarkers.find((b) => b.id === selectedBiomarker);

  const calculateTrend = () => {
    if (trendData.length < 2) return "neutral";
    const first = trendData[0].value;
    const last = trendData[trendData.length - 1].value;
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) return "neutral";
    return change > 0 ? "up" : "down";
  };

  const trend = trendData.length >= 2 ? calculateTrend() : "neutral";

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex min-h-full items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Динамика показателей
          </h2>
          <p className="text-muted-foreground">
            Отслеживайте изменение биомаркеров во времени
          </p>
        </div>

        {biomarkers.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Нет данных для анализа</h3>
              <p className="text-muted-foreground text-center mb-6">
                Добавьте несколько анализов, чтобы увидеть тренды
              </p>
              <Button onClick={() => setSimPath("/analyses")} className="shadow-neon-primary">
                Добавить анализ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Controls */}
            <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Выберите показатель
                    </label>
                    <select
                      value={selectedBiomarker || ""}
                      onChange={(e) => setSelectedBiomarker(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {biomarkers.map((biomarker) => (
                        <option key={biomarker.id} value={biomarker.id}>
                          {biomarker.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Период</label>
                    <div className="flex gap-2">
                      {(["3", "6", "12"] as const).map((p) => (
                        <Button
                          key={p}
                          variant={period === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPeriod(p)}
                          className={
                            period === p
                              ? "shadow-neon-secondary"
                              : "border-secondary/30 hover:border-secondary"
                          }
                        >
                          {p} мес
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            {trendData.length > 0 ? (
              <>
                <Card className="border-primary/30 shadow-neon-primary bg-gradient-to-br from-card to-card/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {selectedBiomarkerData?.name}
                        {trend === "up" && <TrendingUp className="h-5 w-5 text-accent" />}
                        {trend === "down" && <TrendingDown className="h-5 w-5 text-status-good" />}
                        {trend === "neutral" && <Minus className="h-5 w-5 text-muted-foreground" />}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Единица: {selectedBiomarkerData?.unit}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--primary))", r: 6 }}
                          activeDot={{ r: 8, stroke: "hsl(var(--primary-glow))", strokeWidth: 2 }}
                          name={selectedBiomarkerData?.name}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    {selectedBiomarkerData?.normal_min !== null &&
                      selectedBiomarkerData?.normal_max !== null && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                          <p className="text-sm text-muted-foreground">
                            Референсные значения: {selectedBiomarkerData.normal_min} -{" "}
                            {selectedBiomarkerData.normal_max} {selectedBiomarkerData.unit}
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* AI Summary placeholder */}
                <Card className="border-secondary/20 bg-gradient-to-br from-card to-secondary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                      AI-анализ динамики
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      AI-комментарии появятся после подключения функции анализа трендов
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed border-2 border-accent/30 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">
                    Недостаточно данных для построения графика.
                    <br />
                    Добавьте больше анализов с этим показателем.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      )}
    </DashboardLayout>
  );
}
