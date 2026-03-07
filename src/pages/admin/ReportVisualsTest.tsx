import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { MarkdownContent } from "@/components/MarkdownContent";
import { supabase } from "@/integrations/supabase/client";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import {
  PdfBiomarkerData,
  STATUS_HEX,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
  splitTextByBiomarkers,
  PDF_STYLES,
} from "@/lib/pdfExportHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Save, Download, Pencil, Eye } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from "next-themes";
import { toast } from "sonner";
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts;

const CHAGIN_USER_ID = "d950e0d2-7379-4bc0-8294-fee699f3146d";

// BiomarkerData type alias — use PdfBiomarkerData from shared helpers
type BiomarkerData = PdfBiomarkerData;

interface CategoryScore {
  system: string;
  score: number;
  fullMark: number;
  impact: string;
  key_markers: string[];
}

// Local PDF helpers removed — now using shared pdfExportHelpers

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

  // Editable biomarkers text override
  const [biomarkersOverride, setBiomarkersOverride] = useState<string | null>(null);

  // Generated content for demo category
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [demoGeneratedAt, setDemoGeneratedAt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { theme } = useTheme();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    supabase
      .from("ai_prompt_settings")
      .select("updated_at")
      .eq("key", "demo_report_result")
      .single()
      .then(({ data }) => {
        if (data?.updated_at) setDemoGeneratedAt(data.updated_at);
      });
  }, []);


  const loadData = async () => {
    try {
      // Load demo prompts from DB (separate from production prompts)
      const { data: promptsData } = await supabase
        .from("ai_prompt_settings")
        .select("key, prompt_text")
        .in("key", ["demo_report_system", "demo_report_user", "demo_report_result"]);

      if (promptsData) {
        const systemRow = promptsData.find(p => p.key === "demo_report_system");
        const userRow = promptsData.find(p => p.key === "demo_report_user");
        const resultRow = promptsData.find(p => p.key === "demo_report_result");
        if (systemRow) setSystemPrompt(systemRow.prompt_text);
        if (userRow) setUserPrompt(userRow.prompt_text);
        if (resultRow && resultRow.prompt_text) setGeneratedContent(resultRow.prompt_text);
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
    
    const defaultBiomarkersText = catBio.map(b => {
      const statusEmoji = b.status === 'optimal' ? '🟢 ОПТИМАЛЬНО' 
        : b.status === 'acceptable' ? '🟡 ДОПУСТИМО' 
        : b.status === 'risk' ? '🟠 РИСК' 
        : '🔴 КРИТИЧНО';
      return `${b.name} (${b.code}):\n  Значение: ${b.value} ${b.unit}\n  🟢 Оптимально: ${b.rangeDisplay} ${b.unit}\n  Статус: ${statusEmoji}`;
    }).join("\n\n");

    const biomarkersText = biomarkersOverride !== null ? biomarkersOverride : defaultBiomarkersText;

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
    try {
      const substitutedPrompt = buildSubstitutedPrompt();
      const { data, error } = await supabase.functions.invoke("test-prompt", {
        body: { systemPrompt, userPrompt: substitutedPrompt },
      });
      if (error) throw error;
      if (data?.content) {
        setGeneratedContent(data.content);
        // Save generated result to DB
        await supabase
          .from("ai_prompt_settings")
          .update({ prompt_text: data.content })
          .eq("key", "demo_report_result");
        setDemoGeneratedAt(new Date().toISOString());
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

  // ═══ PDF EXPORT ═══
  const handleExportPdf = () => {
    try {
      const pdfContent: any[] = [];
      const barWidth = 515; // A4 width minus margins
      const barHeight = 10;

      // — Interleaved report (only system analysis) —
      const reportText = generatedContent || recommendations[categories[0]];
      if (reportText && categories[0]) {
        pdfContent.push({ text: `Детальный анализ: ${categories[0]}`, style: 'sectionHeader', margin: [0, 0, 0, 15] });

        const catBio = biomarkers.filter(b => b.category === categories[0]);
        const codes = catBio.map(b => b.code);
        const chunks = splitTextByBiomarkers(reportText, codes);

        let isFirstTextChunk = true;
        chunks.forEach(chunk => {
          if (chunk.type === 'text') {
            if (isFirstTextChunk) {
              isFirstTextChunk = false;
              // Extract only the "Краткое резюме" block for the bordered box
              const summaryMatch = chunk.content.match(/##\s*Краткое резюме\s*\n([\s\S]*?)(?=\n##|\n🧬|\n🔬|$)/);
              if (summaryMatch) {
                const summaryParsed = parseMarkdownToPdfContent(summaryMatch[1].trim());
                pdfContent.push({
                  table: { widths: ['*'], body: [[ { stack: summaryParsed, margin: [8, 8, 8, 8] } ]] },
                  layout: {
                    hLineWidth: () => 0.8,
                    vLineWidth: () => 0.8,
                    hLineColor: () => '#C4B5FD',
                    vLineColor: () => '#C4B5FD',
                    fillColor: () => '#F5F3FF',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                  },
                  margin: [0, 0, 0, 12],
                });
                const restContent = chunk.content
                  .replace(/##\s*Краткое резюме\s*\n[\s\S]*?(?=\n##|\n🧬|\n🔬|$)/, '')
                  .trim();
                if (restContent) {
                  pdfContent.push(...parseMarkdownToPdfContent(restContent));
                }
              } else {
                pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
              }
            } else {
              pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
            }
          } else {
            const bm = chunk.code ? catBio.find(b => b.code === chunk.code) : null;
            if (bm) {
              const statusLabel = bm.statusLabel;
              
              // Biomarker header with colored dot instead of emoji
              pdfContent.push({
                columns: [
                  { canvas: [{ type: 'ellipse', x: 5, y: 6, r1: 4, r2: 4, color: STATUS_HEX[bm.status] || '#888' }], width: 14, height: 14 },
                  { text: [{ text: bm.name, bold: true, fontSize: 11 }, { text: ` (${bm.code})`, fontSize: 9, color: '#888' }], width: '*', margin: [0, 1, 0, 0] },
                  { text: [{ text: `${bm.value} ${bm.unit} `, bold: true, fontSize: 11, color: STATUS_HEX[bm.status] || '#333' }, { text: statusLabel, fontSize: 9, color: STATUS_HEX[bm.status] || '#888' }], alignment: 'right', width: 'auto', margin: [0, 1, 0, 0] },
                ],
                columnGap: 4,
                margin: [0, 10, 0, 3],
              });
              // Range bar canvas
              const bar = buildRangeBarCanvas(bm, barWidth, barHeight, 26, 'male');
              if (bar) pdfContent.push(bar);
            }
            // Biomarker description text
            if (chunk.content) {
              pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
            }
          }
        });
      }


      const docDefinition: any = {
        content: pdfContent,
        styles: PDF_STYLES,
        pageSize: 'A4',
        pageMargins: [40, 50, 40, 50],
        footer: (page: number) => ({ text: page.toString(), alignment: 'center', fontSize: 9, margin: [0, 15, 0, 0] }),
        info: { title: `Отчёт ${analysis.date}`, author: 'ReAge' },
      };

      pdfMake.createPdf(docDefinition).download(`Отчёт_${analysis.date}.pdf`);
      toast.success('PDF загружен');
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(`Ошибка экспорта: ${err.message}`);
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
      <div className="space-y-12">
        {chunks.map((chunk, idx) => {
          if (chunk.type === "text") {
            // Extract "Краткое резюме" block if present in first chunk
            if (idx === 0) {
              const summaryMatch = chunk.content.match(/(?:#{2,4}\s*Краткое резюме|\*\*Краткое резюме\*\*)\s*:?\s*\n([\s\S]*?)(?=\n#{2,4}\s|\n🧬|\n🔬|\n\*\*[А-ЯЁA-Z]|$)/);
              if (summaryMatch) {
                const summaryContent = summaryMatch[1].trim();
                const restContent = chunk.content
                  .replace(/(?:#{2,4}\s*Краткое резюме|\*\*Краткое резюме\*\*)\s*:?\s*\n[\s\S]*?(?=\n#{2,4}\s|\n🧬|\n🔬|\n\*\*[А-ЯЁA-Z]|$)/, '')
                  .trim();
                return (
                  <div key={idx}>
                    <div className="rounded-xl border border-primary/15 bg-primary/5 p-5 mb-6">
                      <MarkdownContent content={summaryContent} />
                    </div>
                    {restContent && <MarkdownContent content={restContent} />}
                  </div>
                );
              }
            }
            return (
              <div key={idx}>
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
              <MarkdownContent content={chunk.content} />
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
        {lastGeneratedAt && (
          <p className="text-xs text-muted-foreground">
            Последняя генерация: {new Date(lastGeneratedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
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
              <div className="flex items-center gap-3">
                {demoGeneratedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(demoGeneratedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
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
                {generatedContent && (
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                  >
                    {isEditing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    {isEditing ? "Превью" : "Редактировать"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Тестовая категория: <strong>{categories[0] || "—"}</strong> · Используется демо-промпт из вкладки «Демо-промпт»
            </p>
            {isEditing && generatedContent ? (
              <div data-color-mode={theme === 'dark' ? 'dark' : 'light'} className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <MDEditor
                    value={generatedContent}
                    onChange={(val) => setGeneratedContent(val || "")}
                    height={600}
                    preview="edit"
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-auto border rounded-md p-6 bg-background" style={{ maxHeight: 600 }}>
                  <MDEditor.Markdown
                    source={generatedContent.replace(/\n{3,}/g, (match) => {
                      const extra = match.split('\n').length - 2;
                      return '\n\n' + '\u00A0\n\n'.repeat(Math.max(extra - 1, 1));
                    })}
                    components={{
                      p: ({ children }) => {
                        const text = typeof children === 'string' ? children.trim() : '';
                        if (text === '\u00A0' || text === '') {
                          return <div style={{ height: '1em' }} />;
                        }
                        return <p>{children}</p>;
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
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
            )}
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
            biomarkersOverride={biomarkersOverride}
            setBiomarkersOverride={setBiomarkersOverride}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Демо-промпт таб — системный + основной промпт для тестирования
   ═══════════════════════════════════════════════════════════════ */

const DEMO_SYSTEM_PROMPT = `Вы — врач функциональной медицины с глубокой экспертизой в энергетическом метаболизме, гормональной регуляции и митохондриальной функции. Пишете раздел медицинского отчёта — спокойно, экспертно, без шаблонов. Каждый текст уникален и основан на конкретных данных пациента.`;

const DEMO_USER_PROMPT = `Напиши один раздел отчёта ReAge для категории "{category}" на русском языке.

СТИЛЬ И ПОДХОД

Текст должен читаться как раздел отчёта частной клиники функциональной медицины. Не сухой перечень анализов, а осмысленный рассказ о том, как работает конкретная система организма — с опорой на реальные данные.

Пиши простым, уверенным, спокойным языком. Если используется медицинский термин — сразу поясняй его. Не ставь диагнозы, не назначай лекарства, не пугай. При подозрении на проблему — мягко рекомендуй консультацию специалиста.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА
- Никогда не упоминай, что ты ИИ, алгоритм, модель или чат-бот.
- Не обращайся к пациенту по имени. Не используй «Вы», «Ваш», «тебе», «у вас».
- Используй нейтральные формулировки: «наблюдается», «отмечается», «имеются признаки», «рекомендуется».
- Не используй тревожные слова: «срочно», «опасно», «критично», «катастрофа».
- Не прощайся и не пиши завершающих фраз — после этого текста идёт следующий блок.

СТРУКТУРА ТЕКСТА

Начни с короткого введения (2–3 предложения): за что отвечает эта система, почему её состояние важно для здоровья и качества жизни.

Затем — разбор каждого биомаркера. Каждый биомаркер оформляй как заголовок ## Название (КОД), после которого идёт один связный абзац-рассказ. В этом абзаце органично раскрой: что это за показатель, какую роль он играет, как интерпретировать текущий результат и какие связи с другими маркерами заслуживают внимания. Не разбивай описание на фиксированные подпункты вроде «Что это», «Зачем нужен», «Интерпретация» — вместо этого пиши плавно и логично, как будто объясняешь коллеге. Связи между маркерами упоминай только когда они клинически значимы для конкретного пациента.

После разбора биомаркеров — общая картина системы. Здесь объедини наблюдения: сильные стороны (показатели в оптимуме), ранние сигналы (значения на границе нормы), ключевые взаимосвязи между маркерами. Пиши связным текстом, а не списками. Выдели 2–3 конкретных действия, которые больше всего улучшат состояние этой системы.

Если есть исторические данные — кратко отметь динамику и возможные причины изменений.

ФОРМАТИРОВАНИЕ (строго)
- Заголовки только уровня ## (не # и не ###)
- Для биомаркеров формат: ## Название (КОД)
- Нумерованные списки запрещены
- Маркированные списки допускаются минимально, только для перечисления 3+ конкретных пунктов (например, рекомендаций)
- Таблицы, ссылки, курсив, цитаты, кодовые блоки запрещены
- Жирный текст — только для акцентов внутри абзацев
- Эмодзи допускаются только в заголовках разделов (не биомаркеров)
- Основной объём текста — связные абзацы, а не списки

КОНТЕКСТ ПАЦИЕНТА:
{userContext}

БИОМАРКЕРЫ КАТЕГОРИИ "{category}":
{biomarkers}

ИСТОРИЧЕСКИЕ ТРЕНДЫ:
{trends}

ПРЕДЫДУЩИЕ РЕКОМЕНДАЦИИ:
{recommendations}`;

interface PromptDemoTabProps {
  biomarkers: BiomarkerData[];
  categories: string[];
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  userPrompt: string;
  setUserPrompt: (v: string) => void;
  biomarkersOverride: string | null;
  setBiomarkersOverride: (v: string | null) => void;
}

function PromptDemoTab({ biomarkers, categories, systemPrompt, setSystemPrompt, userPrompt, setUserPrompt, biomarkersOverride, setBiomarkersOverride }: PromptDemoTabProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from("ai_prompt_settings")
        .update({ prompt_text: systemPrompt })
        .eq("key", "demo_report_system");
      const { error: e2 } = await supabase
        .from("ai_prompt_settings")
        .update({ prompt_text: userPrompt })
        .eq("key", "demo_report_user");
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
          <p>Это <strong>демо-промпты</strong>, отдельные от боевых. Хранятся в БД под ключами <code>demo_report_system</code> / <code>demo_report_user</code>. Изменения сохраняются кнопкой «Сохранить в БД» и не затрагивают боевые промпты.</p>
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
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">{"{biomarkers}"} — {catBiomarkers.length} маркеров, формат как в боевой функции (7-сегментные нормы + 4-tier статус)</Label>
              {biomarkersOverride !== null && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setBiomarkersOverride(null)}>
                  Сбросить
                </Button>
              )}
            </div>
            <Textarea
              value={biomarkersOverride !== null ? biomarkersOverride : (biomarkersPreview || "Нет данных для этой категории")}
              onChange={(e) => setBiomarkersOverride(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
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
