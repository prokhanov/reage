import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { MarkdownContent } from "@/components/MarkdownContent";
import { supabase } from "@/integrations/supabase/client";
import { getBiomarkerStatus, getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "@/lib/biomarkerNorms";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Save, Download } from "lucide-react";
import { toast } from "sonner";
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts;

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
  // Also capture optional leading list markers (- , * , • ) before the header
  const codePattern = biomarkerCodes.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^[ \\t]*[-*•]\\s+)?(\\*\\*[^*]+\\((?:${codePattern})\\)\\*\\*:?)`, 'gm');

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
    // Extract code from the header
    const codeMatch = match[1].match(/\(([A-Za-z0-9\-\/+]+)\)/);
    const code = codeMatch ? codeMatch[1] : undefined;

    // Remove header (and list marker) from content — card already shows the name
    const headerEnd = matchStart + match[0].length;
    const contentAfterHeader = text.slice(headerEnd, sectionEnd).trim();

    parts.push({ type: "biomarker", content: contentAfterHeader, code });
    lastIndex = sectionEnd;
  });

  // Remaining text after last biomarker
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", content: remaining });
  }

  return parts;
}

// ═══ PDF EXPORT HELPERS ═══

const STATUS_HEX: Record<string, string> = {
  critical: '#EF4444',
  risk: '#F59E0B',
  acceptable: '#EAB308',
  optimal: '#22C55E',
};

function getZoneColorHex(
  v: number,
  normMin: number | null, normMax: number | null,
  optMin: number | null, optMax: number | null,
  critMin: number | null, critMax: number | null,
): string {
  if ((critMin !== null && v < critMin) || (critMax !== null && v > critMax)) return STATUS_HEX.critical;
  if (optMin !== null || optMax !== null) {
    const inOpt = (optMin === null || v >= optMin) && (optMax === null || v <= optMax);
    if (inOpt) return STATUS_HEX.optimal;
  }
  if ((normMin !== null && v < normMin) || (normMax !== null && v > normMax)) return STATUS_HEX.risk;
  if (optMin !== null || optMax !== null) return STATUS_HEX.acceptable;
  return STATUS_HEX.optimal;
}

function buildRangeBarCanvas(bm: BiomarkerData, barWidth: number, barHeight: number): any {
  const b = bm.biomarker;
  const g = 'male';
  const a = 26;
  const normal = getNormalRangeForAge(b, a, g);
  const optimal = getOptimalRangeForAge(b, a, g);
  const critical = getCriticalRangeForAge(b, a, g);

  if (normal.min === null && normal.max === null) return null;

  const normMin = normal.min, normMax = normal.max;
  const optMin = optimal.min, optMax = optimal.max;
  const critMin = critical.min, critMax = critical.max;

  const pointSet = new Set<number>();
  [bm.value, normMin, normMax, optMin, optMax, critMin, critMax].forEach(v => { if (v !== null) pointSet.add(v); });
  const allPoints = Array.from(pointSet);
  const dataMin = Math.min(...allPoints);
  const dataMax = Math.max(...allPoints);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;
  const toX = (v: number) => ((v - scaleMin) / scaleRange) * barWidth;

  const boundaries = new Set<number>();
  boundaries.add(scaleMin); boundaries.add(scaleMax);
  if (critMin !== null) boundaries.add(critMin);
  if (normMin !== null) boundaries.add(normMin);
  if (optMin !== null) boundaries.add(optMin);
  if (optMax !== null) boundaries.add(optMax);
  if (normMax !== null) boundaries.add(normMax);
  if (critMax !== null) boundaries.add(critMax);

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const canvasItems: any[] = [];

  // Draw segments
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i], end = sorted[i + 1];
    const mid = (start + end) / 2;
    const x = toX(start);
    const w = toX(end) - x;
    if (w > 0.5) {
      canvasItems.push({
        type: 'rect', x, y: 0, w, h: barHeight,
        color: getZoneColorHex(mid, normMin, normMax, optMin, optMax, critMin, critMax),
        r: i === 0 ? 4 : (i === sorted.length - 2 ? 4 : 0),
      });
    }
  }

  // Value marker
  const mx = Math.max(3, Math.min(barWidth - 3, toX(bm.value)));
  canvasItems.push({
    type: 'ellipse', x: mx, y: barHeight / 2, r1: 5, r2: 5,
    color: '#1F2937',
  });
  canvasItems.push({
    type: 'ellipse', x: mx, y: barHeight / 2, r1: 3, r2: 3,
    color: '#FFFFFF',
  });

  return {
    canvas: canvasItems,
    width: barWidth,
    height: barHeight + 2,
    margin: [0, 2, 0, 4],
  };
}

function parseInlineMarkdownPdf(text: string): any[] {
  const parts: any[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

function parseMarkdownToPdfContent(markdown: string): any[] {
  const content: any[] = [];
  const cleaned = cleanMarkdownArtifacts(markdown);
  const lines = cleaned.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { content.push({ text: ' ', margin: [0, 3, 0, 0] }); continue; }
    if (trimmed.match(/^[-*_]{3,}$/)) { content.push({ text: ' ', margin: [0, 6, 0, 6] }); continue; }
    if (trimmed.match(/^[*•]+\s*$/)) continue;

    if (trimmed.startsWith('### ')) {
      content.push({ text: parseInlineMarkdownPdf(trimmed.replace('### ', '')), style: 'h3', margin: [0, 6, 0, 3] });
    } else if (trimmed.startsWith('## ')) {
      content.push({ text: parseInlineMarkdownPdf(trimmed.replace('## ', '')), style: 'h2', margin: [0, 10, 0, 5] });
    } else if (trimmed.startsWith('# ')) {
      content.push({ text: parseInlineMarkdownPdf(trimmed.replace('# ', '')), style: 'h1', margin: [0, 12, 0, 6] });
    } else if (trimmed.match(/^[-*]\s+\S/)) {
      content.push({ text: [{ text: '• ' }, ...parseInlineMarkdownPdf(trimmed.replace(/^[-*]\s+/, ''))], style: 'listItem', margin: [15, 0, 0, 4] });
    } else if (trimmed.match(/^\d+\\?\.\s+/)) {
      const m = trimmed.match(/^(\d+)\\?\.\s+(.*)$/);
      if (m) content.push({ text: [{ text: `${m[1]}. ` }, ...parseInlineMarkdownPdf(m[2])], style: 'listItem', margin: [15, 0, 0, 4] });
    } else {
      content.push({ text: parseInlineMarkdownPdf(trimmed), style: 'paragraph', margin: [0, 0, 0, 8] });
    }
  }
  return content;
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
  const [demoGeneratedAt, setDemoGeneratedAt] = useState<string | null>(null);

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

      // — Title —
      pdfContent.push({ text: 'Персональный отчёт', style: 'title', alignment: 'center', margin: [0, 0, 0, 5] });
      pdfContent.push({ text: `Сергей Чагин · ${analysis.date} · ${totalMarkers} маркеров`, alignment: 'center', fontSize: 10, color: '#888', margin: [0, 0, 0, 25] });

      // — Summary cards as table —
      pdfContent.push({
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { text: [{ text: 'Биологический возраст\n', fontSize: 8, color: '#888' }, { text: `${biological_age}`, fontSize: 22, bold: true }, { text: `\n${ageDiff > 0 ? `−${ageDiff.toFixed(1)}` : `+${Math.abs(ageDiff).toFixed(1)}`} лет`, fontSize: 9, color: ageDiff > 0 ? STATUS_HEX.optimal : STATUS_HEX.critical }], alignment: 'center', margin: [0, 8, 0, 8] },
            { text: [{ text: 'Индекс здоровья\n', fontSize: 8, color: '#888' }, { text: `${health_index}`, fontSize: 22, bold: true }, { text: '/100', fontSize: 12, color: '#888' }], alignment: 'center', margin: [0, 8, 0, 8] },
            { text: [{ text: 'Всего маркеров\n', fontSize: 8, color: '#888' }, { text: `${totalMarkers}`, fontSize: 22, bold: true }, { text: '\nсдано', fontSize: 9, color: '#888' }], alignment: 'center', margin: [0, 8, 0, 8] },
            { text: [{ text: 'Требуют внимания\n', fontSize: 8, color: '#888' }, { text: `${trafficLight.critical.length + trafficLight.risk.length}`, fontSize: 22, bold: true, color: STATUS_HEX.critical }, { text: `\n🔴 ${trafficLight.critical.length}  🟠 ${trafficLight.risk.length}`, fontSize: 9 }], alignment: 'center', margin: [0, 8, 0, 8] },
          ]]
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E5E7EB', vLineColor: () => '#E5E7EB' },
        margin: [0, 0, 0, 15],
      });

      // — Status bar —
      const statusBarSegments: any[] = [];
      const totalW = barWidth;
      const segmentData = [
        { count: trafficLight.optimal.length, color: STATUS_HEX.optimal },
        { count: trafficLight.acceptable.length, color: STATUS_HEX.acceptable },
        { count: trafficLight.risk.length, color: STATUS_HEX.risk },
        { count: trafficLight.critical.length, color: STATUS_HEX.critical },
      ];
      let xOff = 0;
      segmentData.forEach(s => {
        const w = (s.count / totalMarkers) * totalW;
        if (w > 0) {
          statusBarSegments.push({ type: 'rect', x: xOff, y: 0, w, h: 8, color: s.color, r: 0 });
          xOff += w;
        }
      });
      pdfContent.push({ canvas: statusBarSegments, width: totalW, height: 10, margin: [0, 0, 0, 5] });
      // Legend row with colored dots (no emojis — pdfmake font doesn't support them)
      pdfContent.push({
        columns: [
          { canvas: [{ type: 'ellipse', x: 5, y: 5, r1: 4, r2: 4, color: STATUS_HEX.optimal }], width: 12, height: 12 },
          { text: `Оптимально (${trafficLight.optimal.length})`, fontSize: 8, color: '#888', width: 'auto', margin: [0, 1, 12, 0] },
          { canvas: [{ type: 'ellipse', x: 5, y: 5, r1: 4, r2: 4, color: STATUS_HEX.acceptable }], width: 12, height: 12 },
          { text: `Допустимо (${trafficLight.acceptable.length})`, fontSize: 8, color: '#888', width: 'auto', margin: [0, 1, 12, 0] },
          { canvas: [{ type: 'ellipse', x: 5, y: 5, r1: 4, r2: 4, color: STATUS_HEX.risk }], width: 12, height: 12 },
          { text: `Риск (${trafficLight.risk.length})`, fontSize: 8, color: '#888', width: 'auto', margin: [0, 1, 12, 0] },
          { canvas: [{ type: 'ellipse', x: 5, y: 5, r1: 4, r2: 4, color: STATUS_HEX.critical }], width: 12, height: 12 },
          { text: `Критично (${trafficLight.critical.length})`, fontSize: 8, color: '#888', width: 'auto', margin: [0, 1, 0, 0] },
          { text: '', width: '*' },
        ],
        columnGap: 2,
        margin: [0, 0, 0, 15],
      });

      // — General summary —
      if (recommendations["Общее резюме"] && recommendations["Общее резюме"] !== "Не удалось сгенерировать общее резюме") {
        pdfContent.push({ text: 'Общее резюме', style: 'sectionHeader', margin: [0, 5, 0, 10] });
        pdfContent.push(...parseMarkdownToPdfContent(recommendations["Общее резюме"]));
      }

      // — Category scores table —
      if (categoryScores.length > 0) {
        pdfContent.push({ text: 'Баланс систем организма', style: 'sectionHeader', margin: [0, 15, 0, 10] });
        const scoreRows = categoryScores.sort((a, b) => a.score - b.score).map(item => {
          const scoreColor = item.score >= 85 ? STATUS_HEX.optimal : item.score >= 70 ? STATUS_HEX.acceptable : item.score >= 50 ? STATUS_HEX.risk : STATUS_HEX.critical;
          const progressBar: any[] = [];
          const pw = 200;
          progressBar.push({ type: 'rect', x: 0, y: 0, w: pw, h: 8, color: '#E5E7EB', r: 4 });
          progressBar.push({ type: 'rect', x: 0, y: 0, w: (item.score / 100) * pw, h: 8, color: scoreColor, r: 4 });
          return [
            { text: item.system, fontSize: 10, margin: [0, 2, 0, 0] },
            { canvas: progressBar, width: pw, height: 10, margin: [0, 2, 0, 0] },
            { text: `${item.score}`, fontSize: 12, bold: true, color: scoreColor, alignment: 'right', margin: [0, 0, 0, 0] },
          ];
        });
        pdfContent.push({
          table: { widths: [120, '*', 40], body: scoreRows },
          layout: 'noBorders',
          margin: [0, 0, 0, 15],
        });
        const avg = Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length);
        const avgColor = avg >= 85 ? STATUS_HEX.optimal : avg >= 70 ? STATUS_HEX.acceptable : avg >= 50 ? STATUS_HEX.risk : STATUS_HEX.critical;
        pdfContent.push({
          columns: [
            { text: 'Средняя оценка', fontSize: 11, bold: true, width: '*' },
            { text: `${avg}`, fontSize: 14, bold: true, color: avgColor, alignment: 'right', width: 50 },
          ],
          margin: [0, 0, 0, 20],
        });
      }

      // — Interleaved report —
      const reportText = generatedContent || recommendations[categories[0]];
      if (reportText && categories[0]) {
        pdfContent.push({ text: '', pageBreak: 'after' });
        pdfContent.push({ text: `Детальный анализ: ${categories[0]}`, style: 'sectionHeader', margin: [0, 0, 0, 15] });

        const catBio = biomarkers.filter(b => b.category === categories[0]);
        const codes = catBio.map(b => b.code);
        const chunks = splitTextByBiomarkers(reportText, codes);

        chunks.forEach(chunk => {
          if (chunk.type === 'text') {
            pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
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
              const bar = buildRangeBarCanvas(bm, barWidth, barHeight);
              if (bar) pdfContent.push(bar);
            }
            // Biomarker description text
            if (chunk.content) {
              pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
            }
          }
        });
      }

      // — Traffic light priorities —
      pdfContent.push({ text: '', pageBreak: 'after' });
      pdfContent.push({ text: 'Приоритеты', style: 'sectionHeader', margin: [0, 0, 0, 10] });
      ([
        { key: 'critical' as const, emoji: '🔴', label: 'Критично' },
        { key: 'risk' as const, emoji: '🟠', label: 'Риск' },
        { key: 'acceptable' as const, emoji: '🟡', label: 'Допустимо' },
        { key: 'optimal' as const, emoji: '🟢', label: 'Оптимально' },
      ]).forEach(({ key, emoji, label }) => {
        const items = trafficLight[key];
        if (items.length === 0) return;
        pdfContent.push({ text: `${emoji} ${label} (${items.length})`, fontSize: 12, bold: true, color: STATUS_HEX[key], margin: [0, 8, 0, 4] });
        const itemTexts = items.map(m => `${m.name}  ${m.value} ${m.unit}`).join('  ·  ');
        pdfContent.push({ text: itemTexts, fontSize: 10, color: '#555', margin: [10, 0, 0, 6] });
      });

      const docDefinition: any = {
        content: pdfContent,
        styles: {
          title: { fontSize: 20, bold: true },
          sectionHeader: { fontSize: 15, bold: true, decoration: 'underline' },
          h1: { fontSize: 14, bold: true },
          h2: { fontSize: 13, bold: true },
          h3: { fontSize: 12, bold: true },
          paragraph: { fontSize: 10.5, lineHeight: 1.5, alignment: 'justify' },
          listItem: { fontSize: 10.5, lineHeight: 1.4 },
        },
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
}

function PromptDemoTab({ biomarkers, categories, systemPrompt, setSystemPrompt, userPrompt, setUserPrompt }: PromptDemoTabProps) {
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
