import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { MarkdownContent } from "@/components/MarkdownContent";
import { supabase } from "@/integrations/supabase/client";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

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

// Split report text by biomarker mentions, returning alternating text/code chunks
function splitTextByBiomarkers(text: string, biomarkerCodes: string[]): { type: "text" | "biomarker"; content: string; code?: string }[] {
  if (!text || biomarkerCodes.length === 0) return [{ type: "text", content: text }];

  // Build regex to find biomarker headers like **Name (CODE)**: or **Name (CODE)**
  // The AI text uses pattern: **Общий холестерин (TC)**:
  const codePattern = biomarkerCodes.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(\\*\\*[^*]+\\((?:${codePattern})\\)\\*\\*:?)`, 'g');

  const parts: { type: "text" | "biomarker"; content: string; code?: string }[] = [];
  let lastIndex = 0;
  const matches = [...text.matchAll(regex)];

  if (matches.length === 0) return [{ type: "text", content: text }];

  matches.forEach((match, idx) => {
    const matchStart = match.index!;
    
    // Text before this biomarker header
    if (matchStart > lastIndex) {
      const beforeText = text.slice(lastIndex, matchStart).trim();
      if (beforeText) {
        parts.push({ type: "text", content: beforeText });
      }
    }

    // Find the end of this biomarker's section (next biomarker header or end of text)
    const nextMatch = matches[idx + 1];
    const sectionEnd = nextMatch ? nextMatch.index! : text.length;
    const sectionText = text.slice(matchStart, sectionEnd).trim();

    // Extract code from the header
    const codeMatch = match[0].match(/\(([A-Za-z0-9\-\/+]+)\)/);
    const code = codeMatch ? codeMatch[1] : undefined;

    parts.push({ type: "biomarker", content: sectionText, code });
    lastIndex = sectionEnd;
  });

  // Remaining text after last biomarker
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", content: remaining });
  }

  return parts;
}

export default function ReportVisualsTest() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [biomarkers, setBiomarkers] = useState<BiomarkerData[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);

  // Lifted prompt state for sharing between tabs
  const [systemPrompt, setSystemPrompt] = useState(DEMO_SYSTEM_PROMPT);
  const [userPrompt, setUserPrompt] = useState(DEMO_USER_PROMPT);

  // Generated content for demo category
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadData(); }, []);


  const loadData = async () => {
    try {
      // Load prompts from DB
      const { data: promptsData } = await supabase
        .from("ai_prompt_settings")
        .select("key, prompt_text")
        .in("key", ["category_energy_system", "category_energy_user"]);

      if (promptsData) {
        const systemRow = promptsData.find(p => p.key === "category_energy_system");
        const userRow = promptsData.find(p => p.key === "category_energy_user");
        if (systemRow) setSystemPrompt(systemRow.prompt_text);
        if (userRow) setUserPrompt(userRow.prompt_text);
      }

      const { data: analysisData } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", CHAGIN_USER_ID)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!analysisData) return;
      setAnalysis(analysisData);

      const metadata = analysisData.biomarkers_metadata as any;
      if (metadata?.ai_analysis?.category_scores) {
        const scores = Object.entries(metadata.ai_analysis.category_scores).map(
          ([system, data]: [string, any]) => ({
            system, score: data.score, fullMark: 100,
            impact: data.impact, key_markers: data.key_markers || [],
          })
        );
        setCategoryScores(scores);
      }

      const { data: valuesData } = await supabase
        .from("analysis_values")
        .select("value, unit_override, biomarker_id, biomarkers!inner(name, code, unit, category, display_order, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female, range_mode, age_ranges)")
        .eq("analysis_id", analysisData.id);

      if (valuesData) {
        const age = 26;
        const gender = "male" as const;
        const processed = valuesData.map((v: any) => {
          const b = v.biomarkers;
          const status = getBiomarkerStatus(v.value, b, age, gender);
          const optMin = b.optimal_min_male ?? b.optimal_min;
          const optMax = b.optimal_max_male ?? b.optimal_max;
          const normMin = b.normal_min_male ?? b.normal_min;
          const normMax = b.normal_max_male ?? b.normal_max;
          const rangeDisplay = optMin != null && optMax != null
            ? `${optMin}–${optMax}` : normMin != null && normMax != null
              ? `${normMin}–${normMax}` : "";
          return {
            name: b.name, code: b.code, value: v.value,
            unit: v.unit_override || b.unit, category: b.category,
            biomarker: b, status: status.status, statusLabel: status.label, rangeDisplay,
          };
        });
        setBiomarkers(processed);
      }

      const { data: recsData } = await supabase
        .from("recommendations")
        .select("type, text, created_at")
        .eq("analysis_id", analysisData.id)
        .eq("user_id", CHAGIN_USER_ID);

      if (recsData && recsData.length > 0) {
        const recs: Record<string, string> = {};
        recsData.forEach((r: any) => { recs[r.type] = r.text; });
        setRecommendations(recs);
        // Find the latest created_at among all recommendations
        const latest = recsData.reduce((max: string, r: any) => r.created_at > max ? r.created_at : max, recsData[0].created_at);
        setLastGeneratedAt(latest);
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

  if (!analysis) return <div className="container mx-auto px-4 py-8">Нет данных</div>;

  const { biological_age, health_index } = analysis;
  const chronologicalAge = 26;
  const ageDiff = chronologicalAge - (biological_age || 0);
  const totalMarkers = biomarkers.length;

  const trafficLight = {
    critical: biomarkers.filter((b) => b.status === "critical"),
    risk: biomarkers.filter((b) => b.status === "risk"),
    acceptable: biomarkers.filter((b) => b.status === "acceptable"),
    optimal: biomarkers.filter((b) => b.status === "optimal"),
  };

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

  const statusBgMap: Record<string, string> = {
    critical: "bg-status-critical/10 border-status-critical/30",
    risk: "bg-status-risk/10 border-status-risk/30",
    acceptable: "bg-status-acceptable/10 border-status-acceptable/30",
    optimal: "bg-status-optimal/10 border-status-optimal/30",
  };

  const statusEmojiMap: Record<string, string> = {
    critical: "🔴", risk: "🟠", acceptable: "🟡", optimal: "🟢",
  };

  // Build substituted prompt for generation
  const buildSubstitutedPrompt = () => {
    const exampleCategory = categories[0] || "Энергия и восстановление";
    const catBio = biomarkers.filter(b => b.category === exampleCategory);
    
    const biomarkersText = catBio.map(b => {
      const statusEmoji = b.status === 'optimal' ? '🟢 ОПТИМАЛЬНО' 
        : b.status === 'acceptable' ? '🟡 ДОПУСТИМО' 
        : b.status === 'risk' ? '🟠 РИСК' 
        : '🔴 КРИТИЧНО';
      return `${b.name} (${b.code}):\n  Значение: ${b.value} ${b.unit}\n  🟢 Оптимально: ${b.rangeDisplay} ${b.unit}\n  Статус: ${statusEmoji}`;
    }).join("\n\n");

    const userContextText = `ДАННЫЕ ПАЦИЕНТА:\nИмя: Сергей Чагин\nВозраст: 26 лет\nПол: male\nРост: 183 см\nВес: 76 кг\nBMI: 22.7 (норма)\n\nМЕДИЦИНСКИЙ АНАМНЕЗ:\nНе указан\n\nТЕКУЩИЕ ЖАЛОБЫ И СИМПТОМЫ:\nНе указаны`;

    return userPrompt
      .replace("{userContext}", userContextText)
      .replace("{category}", exampleCategory)
      .replace("{biomarkers}", biomarkersText)
      .replace("{trends}", "Нет предыдущих анализов для сравнения")
      .replace("{recommendations}", "Нет предыдущих рекомендаций");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const substitutedPrompt = buildSubstitutedPrompt();
      const { data, error } = await supabase.functions.invoke("test-prompt", {
        body: { systemPrompt, userPrompt: substitutedPrompt },
      });
      if (error) throw error;
      if (data?.content) {
        setGeneratedContent(data.content);
        toast.success("Генерация завершена");
      } else {
        throw new Error("Пустой ответ от модели");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(`Ошибка генерации: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Render interleaved text + biomarker bars
  const renderInterleavedReport = (category: string, overrideText?: string) => {
    const text = overrideText || recommendations[category];
    const catBiomarkers = biomarkers.filter((b) => b.category === category);
    if (!text) return null;

    const codes = catBiomarkers.map((b) => b.code);
    const chunks = splitTextByBiomarkers(text, codes);

    return (
      <div className="space-y-4">
        {chunks.map((chunk, idx) => {
          if (chunk.type === "text") {
            return (
              <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownContent content={chunk.content} />
              </div>
            );
          }

          // Biomarker section: render bar + text
          const bm = chunk.code ? catBiomarkers.find((b) => b.code === chunk.code) : null;
          return (
            <div key={idx} className="space-y-3">
              {/* Visual bar card */}
              {bm && (
                <div className={`rounded-lg border p-3 ${statusBgMap[bm.status]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{statusEmojiMap[bm.status]}</span>
                      <span className="font-semibold text-sm text-foreground">{bm.name}</span>
                      <span className="text-xs text-muted-foreground">({bm.code})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${statusColorMap[bm.status]}`}>
                        {bm.value} {bm.unit}
                      </span>
                      <Badge variant="outline" className={`text-xs ${statusColorMap[bm.status]}`}>
                        {bm.statusLabel}
                      </Badge>
                    </div>
                  </div>
                  <BiomarkerRangeBar
                    biomarker={bm.biomarker}
                    value={bm.value}
                    age={26}
                    gender="male"
                    showLabels
                  />
                </div>
              )}

              {/* Text for this biomarker (without the header since the card shows it) */}
              <div className="prose prose-sm dark:prose-invert max-w-none pl-2 border-l-2 border-muted">
                <MarkdownContent content={chunk.content} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Персональный отчёт
        </h1>
        <p className="text-muted-foreground text-sm">
          Сергей Чагин · {analysis.date} · {totalMarkers} маркеров
        </p>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="preview">Превью отчёта</TabsTrigger>
          <TabsTrigger value="prompt">Демо-промпт</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-10 mt-6">
          {/* ═══ 1. ДАННЫЕ ПАЦИЕНТА ═══ */}
          {recommendations["Данные пациента"] && (
            <section className="space-y-3">
              <Card>
                <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownContent content={recommendations["Данные пациента"]} />
                </CardContent>
              </Card>
            </section>
          )}

          {/* ═══ 2. ОБЩЕЕ РЕЗЮМЕ ═══ */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Общее резюме</h2>

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

            {recommendations["Общее резюме"] && recommendations["Общее резюме"] !== "Не удалось сгенерировать общее резюме" && (
              <Card>
                <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownContent content={recommendations["Общее резюме"]} />
                </CardContent>
              </Card>
            )}

            {categoryScores.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Баланс систем организма</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  {categoryScores
                    .sort((a, b) => a.score - b.score)
                    .map((item) => (
                    <div key={item.system} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{item.system}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                          <span className="text-xs text-muted-foreground">/ 100</span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressBg(item.score)}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ключевые маркеры: {item.key_markers.join(", ")}
                      </div>
                    </div>
                  ))}
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Средняя оценка</span>
                    <span className={`text-lg font-bold ${getScoreColor(
                      Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length)
                    )}`}>
                      {Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <Separator className="my-6" />

          {/* ═══ 3. ОТЧЁТЫ ПО СИСТЕМАМ ═══ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Детальный анализ по системам</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {generating ? "Генерация..." : "Сгенерировать"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Тестовая категория: <strong>{categories[0] || "—"}</strong> · Используется демо-промпт из вкладки «Демо-промпт»
            </p>
            <Card>
              <CardContent className="p-6">
                {generatedContent ? (
                  renderInterleavedReport(categories[0] || "", generatedContent)
                ) : recommendations[categories[0]] ? (
                  renderInterleavedReport(categories[0] || "")
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Нажмите кнопку «Сгенерировать», чтобы протестировать демо-промпт
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Separator className="my-6" />

          {/* ═══ 4. ПРИОРИТЕТЫ ═══ */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Приоритеты</h2>
            <div className="space-y-3">
              {([
                { key: "critical" as const, emoji: "🔴", label: "Критично", color: "status-critical" },
                { key: "risk" as const, emoji: "🟠", label: "Риск", color: "status-risk" },
                { key: "acceptable" as const, emoji: "🟡", label: "Допустимо", color: "status-acceptable" },
                { key: "optimal" as const, emoji: "🟢", label: "Оптимально", color: "status-optimal" },
              ]).map(({ key, emoji, label, color }) => {
                const items = trafficLight[key];
                if (items.length === 0) return null;
                return (
                  <Card key={key} className={`border-${color}/30 bg-${color}/5`}>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>{emoji}</span>
                        <span className={`text-${color} font-semibold`}>{label}</span>
                        <Badge className={`ml-auto bg-${color}/20 text-${color} border-${color}/30 text-xs`}>{items.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {items.map((m) => (
                          <span key={m.code} className="text-xs px-2 py-1 rounded bg-background/60 text-foreground">
                            {m.name} <span className={`font-bold ${statusColorMap[key]}`}>{m.value}</span> {m.unit}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-6 mt-6">
          <PromptDemoTab
            biomarkers={biomarkers}
            categories={categories}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Демо-промпт таб — системный + основной промпт для тестирования
   ═══════════════════════════════════════════════════════════════ */

const DEMO_SYSTEM_PROMPT = `Вы — врач функциональной медицины, специализирующийся на энергетическом метаболизме, гормональной регуляции и митохондриальной функции. Анализируйте биомаркеры с точки зрения производства энергии, окислительного стресса, метаболического здоровья и способности организма к восстановлению.`;

const DEMO_USER_PROMPT = `Твоя задача — написать один раздел отчёта ReAge для клиента на русском языке.

Раздел должен быть:
— понятным человеку без медицинского образования
— интересным и персонализированным
— достаточно подробным, но легко читаемым
— написанным простым, уверенным, спокойным языком
— основанным именно на данных клиента
— без постановки диагнозов
— без пугающих формулировок
— без сухого перечисления анализов

Важно:
не просто объясняй каждый анализ отдельно.
Показывай связи между показателями и делай выводы о том, как работает система организма клиента.
Если информации недостаточно для какого-то вывода — не придумывай.

Дополнительные обязательные требования
• Никогда не упоминайте, что вы ИИ, алгоритм, модель или чат-бот.
• Не обращайтесь к пациенту по имени.
• Не используйте прямые обращения «Вы», «Ваш(и)», «тебе», «у вас».
Используйте нейтральные формулировки: «наблюдается», «отмечается», «имеются признаки», «рекомендуется».
• Пишите спокойно, вежливо и поддерживающе, как на приёме у врача.
• Не запугивайте.
• Не используйте тревожные формулировки: «срочно», «опасно», «критично», «катастрофа».
• Если показатель выраженно отклонён — описывайте это спокойно и конструктивно.
• Пишите простым языком.
• Если используется медицинский термин — сразу объясняйте его простыми словами.
• Давайте максимально подробный объём объяснений.
• Не ставьте диагнозы.
• Не назначайте лекарства.
• При подозрении болезни мягко рекомендуйте консультацию врача.
• Не прощайтесь и не пишите завершающих фраз, потому что после этого текста будет следующий блок.

Требования к Markdown (строго соблюдать)
• Использовать только заголовки уровня ##
• Не использовать # или ###
• Использовать только маркированные списки через -
• Не использовать нумерованные списки
• Для каждого биомаркера использовать вложенный список:
  - **Название биомаркера**
  затем подпункты с двумя пробелами и -
• Названия биомаркеров и названия подпунктов выделять жирным
• Не использовать таблицы
• Не использовать ссылки
• Не использовать курсив
• Не использовать цитаты
• Не использовать кодовые блоки
• Эмодзи допускаются только в заголовках
• Отчёт должен быть единообразным по стилю и форматированию

Структура раздела отчёта

🧬 Роль системы организма
Коротко объясните:
• за что отвечает эта система
• как она влияет на энергию, восстановление и метаболизм
• почему её состояние важно для долгосрочного здоровья

🔬 Интерпретация биомаркеров
Для каждого биомаркера используйте формат:
• Название биомаркера
• Что это
• Зачем нужен
• Интерпретация результата
• Связь с энергетическим обменом
• Связь с другими показателями

Если имеется отклонение:
• объясните клиническое значение отклонения
• опишите влияние на энергетический обмен
• укажите возможные причины
• предложите направления коррекции

🧠 Ключевые инсайты организма
Выделите 3–5 самых интересных выводов из данных.
Это должны быть наблюдения о физиологии организма, а не просто описание анализов.
Инсайты должны основываться на сочетании нескольких маркеров.

🛡 Главные сильные стороны организма
Опишите 2–4 сильные стороны системы.
Это показатели, которые находятся в оптимальном диапазоне и поддерживают здоровье.

⚠️ Ранние сигналы риска
Опишите показатели, которые:
• находятся на границе нормы
• могут стать проблемой в будущем
• требуют наблюдения
Это должны быть ранние сигналы, а не диагнозы.

⏳ Факторы, которые могут ускорять старение системы
Выделите 2–4 фактора, которые потенциально могут влиять на долгосрочное здоровье:
• хроническое воспаление
• дефицит нутриентов
• гормональные изменения
• метаболические нарушения
• окислительный стресс

🔍 Особенности физиологии
Опишите 1–3 интересные особенности организма, которые выделяются в данных.
Этот раздел делает отчёт персонализированным.

🔧 Что больше всего улучшит состояние системы
Выделите 3 действия с наибольшим эффектом:
• питание
• физическая активность
• сон
• управление стрессом
• нутрицевтики
• повторные анализы
Рекомендации должны быть конкретными и реалистичными.

📊 Самые важные маркеры для отслеживания
Выделите 3–5 показателей, которые лучше всего отражают состояние системы.
Кратко объясните, почему именно их важно контролировать.

📈 Динамика показателей
Если есть предыдущие анализы:
• сравните прошлые и текущие значения
• укажите направление изменений
• объясните возможные причины
Если прошлых данных нет — пропустите раздел.

Анализ взаимосвязей
Важно: не анализируйте показатели изолированно.
Ищите паттерны:
• гормональные оси
• метаболические связи
• воспаление
• митохондриальную функцию
• окислительный стресс

КОНТЕКСТ ПАЦИЕНТА:
{userContext}

БИОМАРКЕРЫ КАТЕГОРИИ "{category}":
{biomarkers}

ИСТОРИЧЕСКИЕ ТРЕНДЫ:
{trends}

ПРЕДЫДУЩИЕ РЕКОМЕНДАЦИИ:
{recommendations}

Цель текста
Текст должен выглядеть как раздел отчёта частной клиники функциональной медицины.
Он должен:
• объяснять состояние организма
• показывать взаимосвязи анализов
• давать полезные инсайты
• помогать понять направления улучшения здоровья.`;

interface PromptDemoTabProps {
  biomarkers: BiomarkerData[];
  categories: string[];
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  userPrompt: string;
  setUserPrompt: (v: string) => void;
}

function PromptDemoTab({ biomarkers, categories, systemPrompt, setSystemPrompt, userPrompt, setUserPrompt }: PromptDemoTabProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from("ai_prompt_settings")
        .update({ prompt_text: systemPrompt })
        .eq("key", "category_energy_system");
      const { error: e2 } = await supabase
        .from("ai_prompt_settings")
        .update({ prompt_text: userPrompt })
        .eq("key", "category_energy_user");
      if (e1 || e2) throw e1 || e2;
      toast.success("Промпты сохранены в БД");
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  // Build example data for each placeholder
  const exampleCategory = categories[0] || "Энергия и восстановление";
  const catBiomarkers = biomarkers.filter(b => b.category === exampleCategory);
  
  // {biomarkers} — same format as production: value, 7-segment ranges, 4-tier status
  const biomarkersPreview = catBiomarkers.map(b => {
    const statusEmoji = b.status === 'optimal' ? '🟢 ОПТИМАЛЬНО' 
      : b.status === 'acceptable' ? '🟡 ДОПУСТИМО' 
      : b.status === 'risk' ? '🟠 РИСК' 
      : '🔴 КРИТИЧНО';
    return `${b.name} (${b.code}):\n  Значение: ${b.value} ${b.unit}\n  🟢 Оптимально: ${b.rangeDisplay} ${b.unit}\n  Статус: ${statusEmoji}`;
  }).join("\n\n");

  // {userContext} — example format matching production
  const userContextPreview = `ДАННЫЕ ПАЦИЕНТА:
Имя: Сергей Чагин
Возраст: 26 лет
Пол: male
Рост: 183 см
Вес: 76 кг
BMI: 22.7 (норма)

МЕДИЦИНСКИЙ АНАМНЕЗ:
Не указан

ТЕКУЩИЕ ЖАЛОБЫ И СИМПТОМЫ:
Не указаны

ТЕКУЩИЕ СИМПТОМЫ (из дневника):
Нет зафиксированных симптомов

СОБЛЮДЕНИЕ ПРЕДЫДУЩИХ НАЗНАЧЕНИЙ:
Нет данных о соблюдении`;

  // {trends} — example
  const trendsPreview = "Нет предыдущих анализов для сравнения";

  // {recommendations} — example
  const recommendationsPreview = "Нет предыдущих рекомендаций";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Демо-промпт</h3>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Сохранение..." : "Сохранить в БД"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ℹ️ О демо-промпте</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Это промпты для раздела «Энергия и восстановление», загруженные из БД. Изменения сохраняются кнопкой «Сохранить в БД».</p>
          <p>Плейсхолдеры, как в боевой функции:</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {["{userContext}", "{category}", "{biomarkers}", "{trends}", "{recommendations}"].map(ph => (
              <code key={ph} className="bg-muted px-1.5 py-0.5 rounded text-xs">{ph}</code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Системный промпт */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">system</Badge>
            <CardTitle className="text-base">Системный промпт</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Основной промпт */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">user</Badge>
            <CardTitle className="text-base">Основной промпт</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="min-h-[600px] font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Превью подставляемых данных */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 Превью данных для подстановки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{"{userContext}"}</Label>
            <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
              {userContextPreview}
            </pre>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{"{category}"}</Label>
            <div className="bg-muted/50 rounded-md p-3 text-sm font-mono">{exampleCategory}</div>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{"{biomarkers}"} — {catBiomarkers.length} маркеров, формат как в боевой функции (7-сегментные нормы + 4-tier статус)</Label>
            <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
              {biomarkersPreview || "Нет данных для этой категории"}
            </pre>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{"{trends}"}</Label>
            <div className="bg-muted/50 rounded-md p-3 text-sm font-mono text-muted-foreground">
              {trendsPreview}
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{"{recommendations}"}</Label>
            <div className="bg-muted/50 rounded-md p-3 text-sm font-mono text-muted-foreground">
              {recommendationsPreview}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
