import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, AlertTriangle, TrendingDown } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";

// ─── Mock Data ───────────────────────────────────────────────────────

const mockSummary = {
  biologicalAge: 34.2,
  chronologicalAge: 38,
  healthIndex: 78,
  totalMarkers: 42,
  optimal: 28,
  acceptable: 8,
  risk: 4,
  critical: 2,
};

const mockRadarData = [
  { system: "Энергия", score: 82, fullMark: 100 },
  { system: "Сердце", score: 91, fullMark: 100 },
  { system: "Иммунитет", score: 65, fullMark: 100 },
  { system: "Эндокринная", score: 74, fullMark: 100 },
  { system: "Метаболизм", score: 88, fullMark: 100 },
];

const mockTrafficLight = {
  critical: [
    { name: "Витамин D", code: "VIT_D", value: 12, unit: "нг/мл", range: "30-80" },
    { name: "Ферритин", code: "FERR", value: 8, unit: "нг/мл", range: "30-150" },
  ],
  risk: [
    { name: "Гомоцистеин", code: "HCY", value: 18.5, unit: "мкмоль/л", range: "5-12" },
    { name: "ТТГ", code: "TSH", value: 4.8, unit: "мМЕ/л", range: "0.5-3.0" },
    { name: "Инсулин натощак", code: "INS", value: 19.2, unit: "мкМЕ/мл", range: "3-10" },
    { name: "С-реактивный белок", code: "CRP", value: 4.1, unit: "мг/л", range: "0-1.0" },
  ],
  acceptable: [
    { name: "Глюкоза", code: "GLU", value: 5.6, unit: "ммоль/л", range: "3.9-5.3" },
    { name: "ЛПНП", code: "LDL", value: 3.4, unit: "ммоль/л", range: "1.0-3.0" },
    { name: "Триглицериды", code: "TG", value: 1.9, unit: "ммоль/л", range: "0.5-1.5" },
  ],
  optimal: [
    { name: "Общий белок", code: "TP", value: 72, unit: "г/л", range: "66-83" },
    { name: "ЛПВП", code: "HDL", value: 1.8, unit: "ммоль/л", range: "> 1.5" },
    { name: "Магний", code: "MG", value: 0.92, unit: "ммоль/л", range: "0.85-1.1" },
  ],
};

const mockBiomarkerBars = [
  {
    name: "Витамин D", code: "VIT_D", value: 12, unit: "нг/мл",
    biomarker: { normal_min: 30, normal_max: 80, optimal_min: 50, optimal_max: 80, critical_min: 10, critical_max: 150, range_mode: "universal" },
  },
  {
    name: "Ферритин", code: "FERR", value: 8, unit: "нг/мл",
    biomarker: { normal_min: 30, normal_max: 150, optimal_min: 50, optimal_max: 100, critical_min: 5, critical_max: 300, range_mode: "universal" },
  },
  {
    name: "Гомоцистеин", code: "HCY", value: 18.5, unit: "мкмоль/л",
    biomarker: { normal_min: 5, normal_max: 12, optimal_min: 5, optimal_max: 9, critical_min: null, critical_max: 25, range_mode: "universal" },
  },
  {
    name: "Глюкоза", code: "GLU", value: 5.6, unit: "ммоль/л",
    biomarker: { normal_min: 3.9, normal_max: 6.1, optimal_min: 4.0, optimal_max: 5.3, critical_min: 2.5, critical_max: 7.0, range_mode: "universal" },
  },
  {
    name: "Общий белок", code: "TP", value: 72, unit: "г/л",
    biomarker: { normal_min: 60, normal_max: 83, optimal_min: 66, optimal_max: 78, critical_min: 50, critical_max: 95, range_mode: "universal" },
  },
];

// ─── Helper Functions ────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────

export default function ReportVisualsTest() {
  const { biologicalAge, chronologicalAge, healthIndex, totalMarkers, optimal, acceptable, risk, critical } = mockSummary;
  const ageDiff = chronologicalAge - biologicalAge;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-1 bg-gradient-primary bg-clip-text text-transparent">
          Визуальные элементы отчёта
        </h1>
        <p className="text-muted-foreground text-sm">Тестовая страница с моковыми данными</p>
      </div>

      {/* ═══ 1. СВОДКА-ДАШБОРД ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">1. Сводка-дашборд</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Bio Age */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Биологический возраст</div>
              <div className="text-4xl font-bold text-foreground">{biologicalAge}</div>
              <div className={`text-sm font-medium mt-1 ${ageDiff > 0 ? 'text-status-optimal' : 'text-status-critical'}`}>
                {ageDiff > 0 ? `−${ageDiff.toFixed(1)} лет` : `+${Math.abs(ageDiff).toFixed(1)} лет`}
              </div>
            </CardContent>
          </Card>

          {/* Health Index */}
          <Card className="border-primary/20">
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Индекс здоровья</div>
              <div className="text-4xl font-bold text-foreground">
                {healthIndex}<span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getProgressBg(healthIndex)}`} style={{ width: `${healthIndex}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Markers Count */}
          <Card>
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Всего маркеров</div>
              <div className="text-4xl font-bold text-foreground">{totalMarkers}</div>
              <div className="text-xs text-muted-foreground mt-1">сдано в анализе</div>
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card className={critical > 0 ? "border-status-critical/30 bg-status-critical/5" : "border-status-risk/20"}>
            <CardContent className="p-5 text-center">
              <div className="text-xs text-muted-foreground mb-1">Требуют внимания</div>
              <div className="text-4xl font-bold text-status-critical">{critical + risk}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xs">🔴 {critical}</span>
                <span className="text-xs">🟠 {risk}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown bar */}
        <div className="flex rounded-full overflow-hidden h-3">
          <div className="bg-status-optimal h-full" style={{ width: `${(optimal / totalMarkers) * 100}%` }} title={`Оптимально: ${optimal}`} />
          <div className="bg-status-acceptable h-full" style={{ width: `${(acceptable / totalMarkers) * 100}%` }} title={`Допустимо: ${acceptable}`} />
          <div className="bg-status-risk h-full" style={{ width: `${(risk / totalMarkers) * 100}%` }} title={`Риск: ${risk}`} />
          <div className="bg-status-critical h-full" style={{ width: `${(critical / totalMarkers) * 100}%` }} title={`Критично: ${critical}`} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-optimal inline-block" /> Оптимально ({optimal})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-acceptable inline-block" /> Допустимо ({acceptable})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-risk inline-block" /> Риск ({risk})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-critical inline-block" /> Критично ({critical})</span>
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
                  <RadarChart data={mockRadarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="system"
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickCount={5}
                    />
                    <Radar
                      name="Оценка"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {mockRadarData.map((item) => (
                  <div key={item.system} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.system}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressBg(item.score)}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-8 text-right ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
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
          {/* Critical */}
          {mockTrafficLight.critical.length > 0 && (
            <Card className="border-status-critical/30 bg-status-critical/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🔴</span>
                  <span className="text-status-critical font-semibold">Критично</span>
                  <Badge variant="destructive" className="ml-auto">{mockTrafficLight.critical.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {mockTrafficLight.critical.map((m) => (
                    <div key={m.code} className="flex items-center justify-between p-3 rounded-lg bg-background/60">
                      <div>
                        <span className="font-medium text-sm text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-critical">{m.value} {m.unit}</span>
                        <div className="text-xs text-muted-foreground">норма: {m.range}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk */}
          {mockTrafficLight.risk.length > 0 && (
            <Card className="border-status-risk/30 bg-status-risk/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🟠</span>
                  <span className="text-status-risk font-semibold">Риск</span>
                  <Badge className="ml-auto bg-status-risk/20 text-status-risk border-status-risk/30">{mockTrafficLight.risk.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {mockTrafficLight.risk.map((m) => (
                    <div key={m.code} className="flex items-center justify-between p-3 rounded-lg bg-background/60">
                      <div>
                        <span className="font-medium text-sm text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-risk">{m.value} {m.unit}</span>
                        <div className="text-xs text-muted-foreground">норма: {m.range}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acceptable */}
          {mockTrafficLight.acceptable.length > 0 && (
            <Card className="border-status-acceptable/30 bg-status-acceptable/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🟡</span>
                  <span className="text-status-acceptable font-semibold">Допустимо</span>
                  <Badge className="ml-auto bg-status-acceptable/20 text-status-acceptable border-status-acceptable/30">{mockTrafficLight.acceptable.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {mockTrafficLight.acceptable.map((m) => (
                    <div key={m.code} className="flex items-center justify-between p-3 rounded-lg bg-background/60">
                      <div>
                        <span className="font-medium text-sm text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-acceptable">{m.value} {m.unit}</span>
                        <div className="text-xs text-muted-foreground">норма: {m.range}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimal */}
          {mockTrafficLight.optimal.length > 0 && (
            <Card className="border-status-optimal/30 bg-status-optimal/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🟢</span>
                  <span className="text-status-optimal font-semibold">Оптимально</span>
                  <Badge className="ml-auto bg-status-optimal/20 text-status-optimal border-status-optimal/30">{mockTrafficLight.optimal.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {mockTrafficLight.optimal.map((m) => (
                    <div key={m.code} className="flex items-center justify-between p-3 rounded-lg bg-background/60">
                      <div>
                        <span className="font-medium text-sm text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-optimal">{m.value} {m.unit}</span>
                        <div className="text-xs text-muted-foreground">норма: {m.range}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ═══ 4. ШКАЛЫ БИОМАРКЕРОВ ═══ */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">4. Шкалы биомаркеров</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            {mockBiomarkerBars.map((item) => (
              <div key={item.code} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({item.code})</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{item.value} {item.unit}</span>
                </div>
                <BiomarkerRangeBar
                  biomarker={item.biomarker}
                  value={item.value}
                  age={38}
                  gender="male"
                  showLabels
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
