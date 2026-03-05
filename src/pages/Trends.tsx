import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea } from "recharts";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";

import { useViewAsUser } from "@/hooks/useViewAsUser";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { format } from "date-fns";
import { TrendChartSkeleton } from "@/components/skeletons/TrendChartSkeleton";
import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge, calculateAge, AgeRanges } from "@/lib/biomarkerNorms";

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
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
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
      loadTrendData(selectedBiomarker, period);
    }
  }, [selectedBiomarker, period]);

  const loadBiomarkers = async () => {
    if (demoMode) {
      if (!demoData) {
        console.error("Demo mode active but demo data not loaded");
        setLoading(false);
        return;
      }
      
      // Get unique biomarker codes from demo data
      const uniqueCodes = [...new Set(
        demoData.biomarkers
          .map((b: any) => DEMO_TO_DB_CODE[b.code] || b.code)
          .filter(Boolean)
      )];
      
      // Fetch biomarker metadata from database
      const { data: biomarkersMetadata } = await supabase
        .from('biomarkers')
        .select('*')
        .in('code', uniqueCodes);
      
      if (!biomarkersMetadata || biomarkersMetadata.length === 0) {
        console.error("No biomarker metadata found");
        setLoading(false);
        return;
      }
      
      // Set patient profile data for age-dependent norms
      setPatientGender(demoData.profile.gender as 'male' | 'female');
      setPatientBirthDate(demoData.profile.birth_date || null);
      
      setBiomarkers(biomarkersMetadata as Biomarker[]);
      if (biomarkersMetadata.length > 0) {
        setSelectedBiomarker(biomarkersMetadata[0].id);
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
            optimal_min, optimal_max,
            optimal_min_male, optimal_max_male,
            optimal_min_female, optimal_max_female,
            critical_min, critical_max,
            critical_min_male, critical_max_male,
            critical_min_female, critical_max_female,
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

  const loadTrendData = async (biomarkerId: string, period: string) => {
    if (demoMode && demoData) {
      const now = new Date();
      const periodMonths = period === "3" ? 3 : period === "6" ? 6 : 12;
      const cutoffDate = new Date(now);
      cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);

      const filteredAnalyses = demoData.analyses.filter((analysis: any) => {
        const analysisDate = new Date(analysis.date);
        return analysisDate >= cutoffDate;
      });
      
      // Find the selected biomarker metadata
      const selectedBiomarkerData = biomarkers.find(b => b.id === biomarkerId);
      if (!selectedBiomarkerData) {
        console.error("Selected biomarker not found");
        return;
      }

      const trendData: any[] = [];
      filteredAnalyses.forEach((analysis: any, index: number) => {
        const analysisIndex = demoData.analyses.indexOf(analysis);
        const biomarker = demoData.biomarkers.find(
          (b: any) => {
            const dbCode = DEMO_TO_DB_CODE[b.code] || b.code;
            return (dbCode === selectedBiomarkerData.code) && (b.analysis_index || 0) === analysisIndex;
          }
        );
        
        if (biomarker) {
          const analysisDate = new Date(analysis.date);
          
          // Calculate age at time of analysis for age-dependent ranges
          let ageAtAnalysis = demoData.profile.chronological_age || null;
          if (patientBirthDate && analysis.date) {
            ageAtAnalysis = calculateAge(patientBirthDate);
          }
          
          // Get age-dependent normal ranges
          const normalRange = getNormalRangeForAge(
            selectedBiomarkerData,
            ageAtAnalysis || 40,
            patientGender || 'male'
          );
          
          const optimalRange = getOptimalRangeForAge(
            selectedBiomarkerData,
            ageAtAnalysis || 40,
            patientGender || 'male'
          );
          const criticalRange = getCriticalRangeForAge(
            selectedBiomarkerData,
            ageAtAnalysis || 40,
            patientGender || 'male'
          );
          
          trendData.push({
            date: analysisDate.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            }),
            value: biomarker.value,
            refMin: normalRange.min,
            refMax: normalRange.max,
            optimalMin: optimalRange.min,
            optimalMax: optimalRange.max,
            criticalMin: criticalRange.min,
            criticalMax: criticalRange.max,
            age: ageAtAnalysis
          });
        }
      });
      
      setTrendData(trendData);
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

        // Get optimal/critical ranges
        let optimalMin = null, optimalMax = null, criticalMin2 = null, criticalMax2 = null;
        if (ageAtAnalysis !== null && patientGender && selectedBiomarkerData) {
          const optRange = getOptimalRangeForAge(selectedBiomarkerData, ageAtAnalysis, patientGender);
          optimalMin = optRange.min;
          optimalMax = optRange.max;
          const critRange = getCriticalRangeForAge(selectedBiomarkerData, ageAtAnalysis, patientGender);
          criticalMin2 = critRange.min;
          criticalMax2 = critRange.max;
        }

        return {
          date: new Date(item.analyses.date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
          }),
          value: item.value,
          refMin,
          refMax,
          optimalMin,
          optimalMax,
          criticalMin: criticalMin2,
          criticalMax: criticalMax2,
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
    {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
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
                        {/* 7-segment reference zones */}
                        {trendData.length > 0 && trendData[0].refMin != null && trendData[0].refMax != null && (() => {
                          const d = trendData[0];
                          const zones: React.ReactNode[] = [];
                          
                          // Optimal zone (green)
                          if (d.optimalMin != null && d.optimalMax != null) {
                            zones.push(
                              <ReferenceArea key="optimal" y1={d.optimalMin} y2={d.optimalMax} fill="hsl(var(--status-optimal))" fillOpacity={0.1} />
                            );
                          }
                          
                          // Acceptable zones (yellow) — between normal and optimal
                          if (d.optimalMin != null && d.refMin != null && d.optimalMin > d.refMin) {
                            zones.push(<ReferenceArea key="acc-lo" y1={d.refMin} y2={d.optimalMin} fill="hsl(var(--status-acceptable))" fillOpacity={0.08} />);
                          }
                          if (d.optimalMax != null && d.refMax != null && d.optimalMax < d.refMax) {
                            zones.push(<ReferenceArea key="acc-hi" y1={d.optimalMax} y2={d.refMax} fill="hsl(var(--status-acceptable))" fillOpacity={0.08} />);
                          }
                          
                          // Risk zones (orange) — between normal and critical
                          if (d.criticalMin != null && d.refMin != null && d.criticalMin < d.refMin) {
                            zones.push(<ReferenceArea key="risk-lo" y1={d.criticalMin} y2={d.refMin} fill="hsl(var(--status-risk))" fillOpacity={0.06} />);
                          }
                          if (d.criticalMax != null && d.refMax != null && d.criticalMax > d.refMax) {
                            zones.push(<ReferenceArea key="risk-hi" y1={d.refMax} y2={d.criticalMax} fill="hsl(var(--status-risk))" fillOpacity={0.06} />);
                          }
                          
                          // Normal range lines
                          zones.push(
                            <ReferenceLine key="min" y={d.refMin} stroke="hsl(var(--status-acceptable))" strokeDasharray="3 3" />,
                            <ReferenceLine key="max" y={d.refMax} stroke="hsl(var(--status-acceptable))" strokeDasharray="3 3" />
                          );
                          
                          // Critical lines
                          if (d.criticalMin != null) {
                            zones.push(<ReferenceLine key="crit-min" y={d.criticalMin} stroke="hsl(var(--status-critical))" strokeDasharray="5 3" />);
                          }
                          if (d.criticalMax != null) {
                            zones.push(<ReferenceLine key="crit-max" y={d.criticalMax} stroke="hsl(var(--status-critical))" strokeDasharray="5 3" />);
                          }
                          
                          return zones;
                        })()}
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
                      <div className="flex flex-wrap gap-3 mb-2">
                        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-sm bg-status-optimal/30 border border-status-optimal/50" /> Оптимально</span>
                        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-sm bg-status-acceptable/30 border border-status-acceptable/50" /> Допустимо</span>
                        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-sm bg-status-risk/30 border border-status-risk/50" /> Риск</span>
                        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-sm bg-status-critical/30 border border-status-critical/50" /> Критично</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Зоны отображают 7-сегментную классификацию показателей с учётом вашего возраста.
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
