import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";

// ─── Mock биомаркер: ТТГ-подобный ──────────────────────────────────────────
const biomarker = {
  range_mode: "general",
  normal_min: 0.4,
  normal_max: 4.0,
  optimal_min: 0.7,
  optimal_max: 1.2,
  critical_min: 0.1,
  critical_max: 10,
  unit: "мМЕ/л",
};
const unit = biomarker.unit;

const SCENARIOS: { label: string; value: number; status: "optimal" | "acceptable" | "risk" | "critical"; statusLabel: string; emoji: string }[] = [
  { label: "оптимум",   value: 1.0, status: "optimal",    statusLabel: "Оптимум",    emoji: "🟢" },
  { label: "допустимо", value: 2.5, status: "acceptable", statusLabel: "Допустимо",  emoji: "🟡" },
  { label: "риск",      value: 5.0, status: "risk",       statusLabel: "Риск",       emoji: "🟠" },
  { label: "дефицит",   value: 0.3, status: "critical",   statusLabel: "Критично",   emoji: "🔴" },
];

function calcPositions(value: number) {
  const points = [value, biomarker.normal_min, biomarker.normal_max, biomarker.optimal_min, biomarker.optimal_max, biomarker.critical_min, biomarker.critical_max];
  const dataMin = Math.min(...points);
  const dataMax = Math.max(...points);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;
  return { valuePos: ((value - scaleMin) / scaleRange) * 100 };
}

/** Стрелка-указатель — вариант S (9×6px) */
function ArrowS({ pos }: { pos: number }) {
  return (
    <div className="relative" style={{ height: "6px" }}>
      <svg
        className="absolute -translate-x-1/2 text-foreground"
        style={{ left: `${pos}%`, bottom: "-1px" }}
        width={9}
        height={6}
        viewBox="0 0 9 6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M4.5 6 L0 0 L9 0 Z" />
      </svg>
    </div>
  );
}

/** Шкала со стрелкой S — переиспользуем во всех контекстах */
function ScaleWithArrow({ value }: { value: number }) {
  const { valuePos } = calcPositions(value);
  return (
    <>
      <ArrowS pos={valuePos} />
      <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" hideMarker />
    </>
  );
}

const STATUS_COLORS: Record<string, string> = {
  optimal: "text-[hsl(var(--status-optimal))]",
  acceptable: "text-[hsl(var(--status-acceptable))]",
  risk: "text-[hsl(var(--status-risk))]",
  critical: "text-[hsl(var(--status-critical))]",
};
const STATUS_BG: Record<string, string> = {
  optimal: "border-[hsl(var(--status-optimal))]/30 bg-[hsl(var(--status-optimal))]/5",
  acceptable: "border-[hsl(var(--status-acceptable))]/30 bg-[hsl(var(--status-acceptable))]/5",
  risk: "border-[hsl(var(--status-risk))]/30 bg-[hsl(var(--status-risk))]/5",
  critical: "border-[hsl(var(--status-critical))]/30 bg-[hsl(var(--status-critical))]/5",
};

// ─── Контекст 1: карточка биомаркера в отчёте (как в snapshotRenderer) ────
function ReportCard({ s }: { s: typeof SCENARIOS[number] }) {
  return (
    <div className={`rounded-xl border shadow-sm p-4 space-y-3 ${STATUS_BG[s.status]}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">ТТГ — Тиреотропный гормон</span>
          <span className="text-xs text-muted-foreground">(TSH)</span>
        </div>
        <ScaleWithArrow value={s.value} />
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold tracking-tight ${STATUS_COLORS[s.status]}`}>
              {s.value.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${STATUS_COLORS[s.status]}`}>●</span>
            <span className={`text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.statusLabel}</span>
          </div>
        </div>
      </div>
      <div className="pt-1 border-t border-border/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Комментарий ИИ: показатель {s.statusLabel.toLowerCase()}, рекомендуем контроль через 3 месяца.
        </p>
      </div>
    </div>
  );
}

// ─── Контекст 2: строка таблицы биомаркеров в личном кабинете ─────────────
function PatientTableRow({ s }: { s: typeof SCENARIOS[number] }) {
  return (
    <TableRow>
      <TableCell className="font-medium">ТТГ <span className="text-xs text-muted-foreground">(TSH)</span></TableCell>
      <TableCell>
        <span className={`text-lg font-bold ${STATUS_COLORS[s.status]}`}>
          {s.value.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
        </span>
      </TableCell>
      <TableCell>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BG[s.status]} ${STATUS_COLORS[s.status]}`}>
          <span>{s.emoji}</span>
          <span>{s.statusLabel}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-[240px]">
        <div className="space-y-1">
          <ScaleWithArrow value={s.value} />
          <span className="text-xs text-muted-foreground">
            {biomarker.normal_min}–{biomarker.normal_max} {unit}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <button className="inline-flex items-center justify-center rounded-full w-7 h-7 bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </button>
      </TableCell>
    </TableRow>
  );
}

// ─── Контекст 3: ввод значения в Analysis Wizard (админка) ────────────────
function WizardRow({ s }: { s: typeof SCENARIOS[number] }) {
  return (
    <div className="grid grid-cols-[1fr_120px_1fr] gap-4 items-center py-3 border-b border-border/40">
      <div>
        <div className="text-sm font-medium">ТТГ — Тиреотропный гормон</div>
        <div className="text-xs text-muted-foreground">TSH · {biomarker.normal_min}–{biomarker.normal_max} {unit}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={s.value.toFixed(1)}
          className="w-20 px-2 py-1.5 text-sm font-mono text-center rounded-md border border-input bg-background"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="space-y-1">
        <ScaleWithArrow value={s.value} />
        <div className={`text-[10px] font-medium ${STATUS_COLORS[s.status]}`}>{s.emoji} {s.statusLabel}</div>
      </div>
    </div>
  );
}

// ─── Контекст 4: сценарий, как в самом превью (контрольный) ───────────────
function PreviewScenario({ s }: { s: typeof SCENARIOS[number] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-sm text-muted-foreground truncate">ТТГ — Тиреотропный гормон</div>
        <div className="text-sm whitespace-nowrap">
          <span className="text-muted-foreground">Ваш показатель — </span>
          <span className="font-mono font-semibold tabular-nums tracking-tight text-foreground">
            {s.value.toFixed(1)}
          </span>{" "}
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <ScaleWithArrow value={s.value} />
      <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
        Оптимальный диапазон:{" "}
        <span className="font-mono font-medium text-foreground tabular-nums">
          {biomarker.optimal_min} – {biomarker.optimal_max} {unit}
        </span>
      </div>
    </div>
  );
}

export default function ScaleLabelsPreview() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Превью: стрелка-указатель (вариант S, 9×6px) во всех контекстах</h1>
        <p className="text-muted-foreground mt-1">
          Симуляция дизайна без изменений в продакшн-компонентах. Боевой <code className="text-xs">BiomarkerRangeBar</code> не тронут.
        </p>
      </div>

      {/* 0. Базовое превью */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">0. Базовое превью (как сейчас на странице)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => (
              <PreviewScenario key={s.label} s={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1. Веб-отчёт */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Веб-отчёт — карточка биомаркера</CardTitle>
          <p className="text-sm text-muted-foreground">Используется в персональном отчёте (snapshotRenderer)</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => (
              <ReportCard key={s.label} s={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Личный кабинет / админка — таблица биомаркеров */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Личный кабинет → Биомаркеры (таблица)</CardTitle>
          <p className="text-sm text-muted-foreground">Также используется в AnalysisDetail у админа</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Маркер</TableHead>
                <TableHead>Значение</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="min-w-[240px]">Шкала</TableHead>
                <TableHead className="text-center">Инфо</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCENARIOS.map((s) => <PatientTableRow key={s.label} s={s} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Админ — Analysis Wizard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Админка → Analysis Wizard (ввод значений)</CardTitle>
          <p className="text-sm text-muted-foreground">Превью статуса при ручном вводе значения биомаркера</p>
        </CardHeader>
        <CardContent>
          {SCENARIOS.map((s) => <WizardRow key={s.label} s={s} />)}
        </CardContent>
      </Card>

      {/* 4. Имитация PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. PDF-отчёт — компактная карточка</CardTitle>
          <p className="text-sm text-muted-foreground">
            В PDF стрелка будет отрисована векторно через pdfmake (точно тех же пропорций)
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-white text-black rounded-lg p-6 max-w-[500px] mx-auto space-y-4 border shadow-sm">
            <div className="text-center text-xs text-gray-500 uppercase tracking-wider">PDF preview</div>
            {SCENARIOS.map((s) => (
              <div key={s.label} className="border-b border-gray-200 pb-3 last:border-0">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-sm font-semibold">ТТГ <span className="text-gray-500 font-normal text-xs">(TSH)</span></div>
                  <div className="text-sm font-mono">
                    <span className="font-bold">{s.value.toFixed(1)}</span>{" "}
                    <span className="text-xs text-gray-500">{unit}</span>
                  </div>
                </div>
                <div className="text-foreground">
                  <ScaleWithArrow value={s.value} />
                </div>
                <div className="text-[10px] text-gray-600 mt-1.5">
                  {s.emoji} {s.statusLabel} · норма {biomarker.normal_min}–{biomarker.normal_max} {unit}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
