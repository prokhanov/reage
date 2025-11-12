import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";

import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { format } from "date-fns";
import { TrendChartSkeleton } from "@/components/skeletons/TrendChartSkeleton";
import { getNormalRangeForAge, calculateAge, AgeRanges } from "@/lib/biomarkerNorms";

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
  age_ranges?: AgeRanges | null;
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
  const { demoMode, demoData, loading: demoLoading } = useDemoMode();
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"3" | "6" | "12">("6");
  const [patientGender, setPatientGender] = useState<'male' | 'female' | null>(null);
  const [patientBirthDate, setPatientBirthDate] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (demoMode && demoLoading) {
      return;
    }
    loadBiomarkers();
  }, [demoMode, demoLoading]);

  useEffect(() => {
    if (selectedBiomarker) {
      loadTrendData(selectedBiomarker);
    }
  }, [selectedBiomarker, period]);

  const loadBiomarkers = async () => {
    if (demoMode) {
      if (!demoData) {
        console.error("Demo mode active but demo data not loaded");
        setLoading(false);
        return;
      }
      
      const demoBiomarkers = demoData.biomarkers.map((b: any) => ({
        id: b.code,
        name: b.name || b.code,
        code: b.code,
        unit: b.unit || "units",
        normal_min: b.normal_min || null,
        normal_max: b.normal_max || null,
        normal_min_male: b.normal_min_male || null,
        normal_max_male: b.normal_max_male || null,
        normal_min_female: b.normal_min_female || null,
        normal_max_female: b.normal_max_female || null,
        age_ranges: null
      }));
      setBiomarkers(demoBiomarkers);
      if (demoBiomarkers.length > 0) {
        setSelectedBiomarker(demoBiomarkers[0].id);
      }
      setLoading(false);
      return;
    }

    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      // Load patient profile for age-dependent norms
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, birth_date")
        .eq("id", userId)
        .single();
      
      setPatientGender(profile?.gender as 'male' | 'female' || null);
      setPatientBirthDate(profile?.birth_date || null);

      // Get biomarkers that have values (with age_ranges)
      const { data: valuesData, error: valuesError } = await supabase
        .from("analysis_values")
        .select(`
          biomarker_id,
          biomarkers (
            id, name, code, unit, 
            normal_min, normal_max,
            normal_min_male, normal_max_male,
            normal_min_female, normal_max_female,
            age_ranges
          )
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
    if (demoMode && demoData) {
      const demoBiomarker = demoData.biomarkers.find((b: any) => b.code === biomarkerId);
      if (demoBiomarker) {
        setTrendData([
          { 
            date: "1 янв", 
            value: demoBiomarker.value * 0.95,
            refMin: demoBiomarker.normal_min,
            refMax: demoBiomarker.normal_max,
            age: demoData.profile.chronological_age
          },
          { 
            date: "15 янв", 
            value: demoBiomarker.value,
            refMin: demoBiomarker.normal_min,
            refMax: demoBiomarker.normal_max,
            age: demoData.profile.chronological_age
          }
        ]);
      }
      return;
    }

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

      const formattedData = data.map((item: any) => {
        // Calculate age at time of analysis for age-dependent reference lines
        let ageAtAnalysis = null;
        if (patientBirthDate) {
          const analysisDate = new Date(item.analyses.date);
          const birthDate = new Date(patientBirthDate);
          let age = analysisDate.getFullYear() - birthDate.getFullYear();
          const monthDiff = analysisDate.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && analysisDate.getDate() < birthDate.getDate())) {
            age--;
          }
          ageAtAnalysis = age;
        }

        // Get age-dependent norms for this data point
        let refMin = null;
        let refMax = null;
        if (ageAtAnalysis !== null && patientGender && selectedBiomarkerData) {
          const range = getNormalRangeForAge(selectedBiomarkerData, ageAtAnalysis, patientGender);
          refMin = range.min;
          refMax = range.max;
        }

        return {
          date: new Date(item.analyses.date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
          }),
          value: item.value,
          refMin,
          refMax,
          age: ageAtAnalysis,
        };
      });

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
    {demoMode && <DemoBanner />}
    {loading && <TrendChartSkeleton />}
    {!loading && (
    <>
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
                          formatter={(value: any, name: string, props: any) => {
                            const { payload } = props;
                            if (name === "value" && payload.age) {
                              return [
                                <>
                                  <div>{value}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Возраст: {payload.age} лет
                                  </div>
                                  {payload.refMin && payload.refMax && (
                                    <div className="text-xs text-muted-foreground">
                                      Норма: {payload.refMin} - {payload.refMax}
                                    </div>
                                  )}
                                </>,
                                name
                              ];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        {/* Dynamic reference lines based on age */}
                        {trendData.length > 0 && trendData[0].refMin && trendData[0].refMax && (
                          <>
                            <ReferenceLine 
                              y={trendData[0].refMin} 
                              stroke="hsl(var(--status-good))" 
                              strokeDasharray="3 3"
                              label={{ value: "Мин (первый)", position: "insideBottomLeft", fill: "hsl(var(--status-good))", fontSize: 10 }}
                            />
                            <ReferenceLine 
                              y={trendData[0].refMax} 
                              stroke="hsl(var(--status-good))" 
                              strokeDasharray="3 3"
                              label={{ value: "Макс (первый)", position: "insideTopLeft", fill: "hsl(var(--status-good))", fontSize: 10 }}
                            />
                          </>
                        )}
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

                    <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Возрастные нормы учитываются 💡
                      </p>
                      <p className="text-xs text-muted-foreground">
                        График показывает динамику с учетом вашего возраста на момент каждого анализа. 
                        Референсные линии показывают норму для возраста первого анализа.
                      </p>
                      {patientBirthDate && (
                        <p className="text-xs text-muted-foreground">
                          Ваш текущий возраст: {calculateAge(patientBirthDate)} лет
                        </p>
                      )}
                    </div>
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
      </>
      )}
      </div>
  );
}
