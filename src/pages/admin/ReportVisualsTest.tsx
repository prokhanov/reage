import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { MarkdownContent } from "@/components/MarkdownContent";
import { supabase } from "@/integrations/supabase/client";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CHAGIN_USER_ID = "d950e0d2-7379-4bc0-8294-fee699f3146d";

interface BiomarkerData {
  name: string;
  code: string;
  value: number;
  unit: string;
  category: string;
  biomarker: any;
  status: string;
  statusLabel: string;
  rangeDisplay: string;
}

interface CategoryScore {
  system: string;
  score: number;
  fullMark: number;
  impact: string;
  key_markers: string[];
}

export default function ReportVisualsTest() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [biomarkers, setBiomarkers] = useState<BiomarkerData[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load latest analysis
      const { data: analysisData } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", CHAGIN_USER_ID)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!analysisData) return;
      setAnalysis(analysisData);

      // Extract category_scores from biomarkers_metadata
      const metadata = analysisData.biomarkers_metadata as any;
      if (metadata?.ai_analysis?.category_scores) {
        const scores = Object.entries(metadata.ai_analysis.category_scores).map(
          ([system, data]: [string, any]) => ({
            system,
            score: data.score,
            fullMark: 100,
            impact: data.impact,
            key_markers: data.key_markers || [],
          })
        );
        setCategoryScores(scores);
      }

      // Load biomarkers with values
      const { data: valuesData } = await supabase
        .from("analysis_values")
        .select("value, unit_override, biomarker_id, biomarkers!inner(name, code, unit, category, display_order, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female, range_mode, age_ranges)")
        .eq("analysis_id", analysisData.id)
        .order("biomarkers(category)")
        .order("biomarkers(display_order)");

      if (valuesData) {
        const age = 26; // Chagin's age
        const gender = "male" as const;
        const processed = valuesData.map((v: any) => {
          const b = v.biomarkers;
          const status = getBiomarkerStatus(v.value, b, age, gender);
          const optMin = b.optimal_min_male ?? b.optimal_min;
          const optMax = b.optimal_max_male ?? b.optimal_max;
          const normMin = b.normal_min_male ?? b.normal_min;
          const normMax = b.normal_max_male ?? b.normal_max;
          const rangeDisplay = optMin != null && optMax != null
            ? `${optMin}–${optMax}`
            : normMin != null && normMax != null
              ? `${normMin}–${normMax}`
              : "";

          return {
            name: b.name,
            code: b.code,
            value: v.value,
            unit: v.unit_override || b.unit,
            category: b.category,
            biomarker: b,
            status: status.tier,
            statusLabel: status.label,
            rangeDisplay,
          };
        });
        setBiomarkers(processed);
      }

      // Load recommendations
      const { data: recsData } = await supabase
        .from("recommendations")
        .select("type, text")
        .eq("analysis_id", analysisData.id)
        .eq("user_id", CHAGIN_USER_ID);

      if (recsData) {
        const recs: Record<string, string> = {};
        recsData.forEach((r: any) => {
          recs[r.type] = r.text;
        });
        setRecommendations(recs);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!analysis) {
    return <div className="container mx-auto px-4 py-8">Нет данных</div>;
  }

  const { biological_age, health_index } = analysis;
  const chronologicalAge = 26;
  const ageDiff = chronologicalAge - (biological_age || 0);

  // Group biomarkers by status for traffic light
  const trafficLight = {
    critical: biomarkers.filter((b) => b.status === "critical"),
    risk: biomarkers.filter((b) => b.status === "risk"),
    acceptable: biomarkers.filter((b) => b.status === "acceptable"),
    optimal: biomarkers.filter((b) => b.status === "optimal"),
  };

  // Group biomarkers by category
  const categories = [...new Set(biomarkers.map((b) => b.category))];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-status-optimal";
    if (score >= 70) return "text-status-acceptable";
    if (score >= 50) return "text-status-risk";
    return "text-status-critical";
  };

  const getProgressBg = (score: number) => {
    if (score >= 85) return "bg-status-optimal";
    if (score >= 70) return "bg-status-acceptable";
    if (score >= 50) return "bg-status-risk";
    return "bg-status-critical";
  };

  const statusColorMap: Record<string, string> = {
    critical: "text-status-critical",
    risk: "text-status-risk",
    acceptable: "text-status-acceptable",
    optimal: "text-status-optimal",
  };

  const totalMarkers = biomarkers.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-1 bg-gradient-primary bg-clip-text text-transparent">
          Визуальные элементы отчёта
        </h1>
        <p className="text-muted-foreground text-sm">
          Реальные данные: Сергей Чагин · Анализ от {analysis.date} · {totalMarkers} маркеров
        </p>
      </div>

      {/* ═══ 1. СВОДКА-ДАШБОРД ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">1. Сводка-дашборд</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Биологический возраст</div>
              <div className="text-4xl font-bold text-foreground">{biological_age}</div>
              <div className={`text-sm font-medium mt-1 ${ageDiff > 0 ? "text-status-optimal" : "text-status-critical"}`}>
                {ageDiff > 0 ? `−${ageDiff.toFixed(1)} лет` : `+${Math.abs(ageDiff).toFixed(1)} лет`}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Индекс здоровья</div>
              <div className="text-4xl font-bold text-foreground">
                {health_index}<span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getProgressBg(health_index)}`} style={{ width: `${health_index}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Всего маркеров</div>
              <div className="text-4xl font-bold text-foreground">{totalMarkers}</div>
              <div className="text-xs text-muted-foreground mt-1">сдано в анализе</div>
            </CardContent>
          </Card>

          <Card className={trafficLight.critical.length > 0 ? "border-status-critical/30 bg-status-critical/5" : "border-status-risk/20"}>
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Требуют внимания</div>
              <div className="text-4xl font-bold text-status-critical">
                {trafficLight.critical.length + trafficLight.risk.length}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xs">🔴 {trafficLight.critical.length}</span>
                <span className="text-xs">🟠 {trafficLight.risk.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown bar */}
        <div className="flex rounded-full overflow-hidden h-3">
          <div className="bg-status-optimal h-full" style={{ width: `${(trafficLight.optimal.length / totalMarkers) * 100}%` }} />
          <div className="bg-status-acceptable h-full" style={{ width: `${(trafficLight.acceptable.length / totalMarkers) * 100}%` }} />
          <div className="bg-status-risk h-full" style={{ width: `${(trafficLight.risk.length / totalMarkers) * 100}%` }} />
          <div className="bg-status-critical h-full" style={{ width: `${(trafficLight.critical.length / totalMarkers) * 100}%` }} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-optimal inline-block" /> Оптимально ({trafficLight.optimal.length})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-acceptable inline-block" /> Допустимо ({trafficLight.acceptable.length})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-risk inline-block" /> Риск ({trafficLight.risk.length})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-critical inline-block" /> Критично ({trafficLight.critical.length})</span>
        </div>
      </section>

      {/* ═══ 2. РАДАР СИСТЕМ ОРГАНИЗМА ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">2. Радар систем организма</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={categoryScores} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="system"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickCount={5} />
                    <Radar name="Оценка" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {categoryScores.map((item) => (
                  <div key={item.system}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.system}</span>
                      <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getProgressBg(item.score)}`} style={{ width: `${item.score}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Ключевые: {item.key_markers.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══ 3. СВЕТОФОР ПРИОРИТЕТОВ ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">3. Светофор приоритетов</h2>
        <div className="space-y-4">
          {([
            { key: "critical" as const, emoji: "🔴", label: "Критично", color: "status-critical", variant: "destructive" as const },
            { key: "risk" as const, emoji: "🟠", label: "Риск", color: "status-risk", variant: "secondary" as const },
            { key: "acceptable" as const, emoji: "🟡", label: "Допустимо", color: "status-acceptable", variant: "secondary" as const },
            { key: "optimal" as const, emoji: "🟢", label: "Оптимально", color: "status-optimal", variant: "secondary" as const },
          ]).map(({ key, emoji, label, color }) => {
            const items = trafficLight[key];
            if (items.length === 0) return null;
            return (
              <Card key={key} className={`border-${color}/30 bg-${color}/5`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <span className={`text-${color} font-semibold`}>{label}</span>
                    <Badge className={`ml-auto bg-${color}/20 text-${color} border-${color}/30`}>{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((m) => (
                      <div key={m.code} className="flex items-center justify-between p-3 rounded-lg bg-background/60">
                        <div>
                          <span className="font-medium text-sm text-foreground">{m.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({m.code})</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${statusColorMap[key]}`}>{m.value} {m.unit}</span>
                          {m.rangeDisplay && <div className="text-xs text-muted-foreground">опт: {m.rangeDisplay}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══ 4. ПРИМЕР ОТЧЁТА ПО КАТЕГОРИИ ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">4. Пример отчёта по категории</h2>
        <Tabs defaultValue={categories[0] || ""}>
          <TabsList className="flex-wrap h-auto gap-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => {
            const catBiomarkers = biomarkers.filter((b) => b.category === cat);
            const reportText = recommendations[cat];

            return (
              <TabsContent key={cat} value={cat} className="space-y-6">
                {/* Biomarker bars for this category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Шкалы биомаркеров — {cat}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {catBiomarkers.map((item) => (
                      <div key={item.code} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground">({item.code})</span>
                            <Badge variant="outline" className={`text-xs ${statusColorMap[item.status]} border-${item.status === 'optimal' ? 'status-optimal' : item.status === 'acceptable' ? 'status-acceptable' : item.status === 'risk' ? 'status-risk' : 'status-critical'}/30`}>
                              {item.statusLabel}
                            </Badge>
                          </div>
                          <span className={`text-sm font-bold ${statusColorMap[item.status]}`}>
                            {item.value} {item.unit}
                          </span>
                        </div>
                        <BiomarkerRangeBar
                          biomarker={item.biomarker}
                          value={item.value}
                          age={26}
                          gender="male"
                          showLabels
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI report text */}
                {reportText && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Текст отчёта — {cat}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownContent content={reportText} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      {/* ═══ 5. ОБЩЕЕ РЕЗЮМЕ ═══ */}
      {recommendations["Общее резюме"] && recommendations["Общее резюме"] !== "Не удалось сгенерировать общее резюме" && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">5. Общее резюме</h2>
          <Card>
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={recommendations["Общее резюме"]} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* ═══ 6. ДАННЫЕ ПАЦИЕНТА ═══ */}
      {recommendations["Данные пациента"] && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">6. Данные пациента</h2>
          <Card>
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={recommendations["Данные пациента"]} />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
