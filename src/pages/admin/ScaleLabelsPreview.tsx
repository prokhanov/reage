import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
const optMin = biomarker.optimal_min;
const optMax = biomarker.optimal_max;

const SCENARIOS: { label: string; value: number }[] = [
  { label: "оптимум",   value: 1.0 },
  { label: "допустимо", value: 2.5 },
  { label: "риск",      value: 5.0 },
  { label: "дефицит",   value: 0.3 },
];

function calcPositions(value: number) {
  const points = [value, biomarker.normal_min, biomarker.normal_max, optMin, optMax, biomarker.critical_min, biomarker.critical_max];
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

/** Базовая «единица дизайна» — заголовок + значение + стрелка + шкала + подпись диапазона.
 *  Используется во ВСЕХ контекстах, чтобы превью было полностью консистентным. */
function ScaleUnit({ value, compact = false }: { value: number; compact?: boolean }) {
  const { valuePos } = calcPositions(value);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground truncate`}>
          ТТГ — Тиреотропный гормон
        </div>
        <div className={`${compact ? "text-xs" : "text-sm"} whitespace-nowrap`}>
          <span className="text-muted-foreground">Ваш показатель — </span>
          <span className="font-mono font-semibold tabular-nums tracking-tight text-foreground">
            {value.toFixed(1)}
          </span>{" "}
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <ArrowS pos={valuePos} />
      <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" hideMarker />
      <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
        Оптимальный диапазон:{" "}
        <span className="font-mono font-medium text-foreground tabular-nums">
          {optMin} – {optMax} {unit}
        </span>
      </div>
    </>
  );
}

// ─── Контекст 1: базовое превью (как сейчас) ──────────────────────────────
function PreviewScenario({ value }: { value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <ScaleUnit value={value} />
    </div>
  );
}

// ─── Контекст 2: карточка биомаркера в веб-отчёте ─────────────────────────
function ReportCard({ value }: { value: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 shadow-sm p-4">
      <ScaleUnit value={value} />
    </div>
  );
}

// ─── Контекст 3: строка таблицы в личном кабинете / админке ───────────────
function PatientTableRow({ value }: { value: number }) {
  return (
    <TableRow>
      <TableCell className="min-w-[420px] py-4">
        <ScaleUnit value={value} compact />
      </TableCell>
    </TableRow>
  );
}

// ─── Контекст 4: ввод в Analysis Wizard (админка) ─────────────────────────
function WizardRow({ value }: { value: number }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-center py-3 border-b border-border/40">
      <input
        type="text"
        readOnly
        value={value.toFixed(1)}
        className="w-full px-3 py-2 text-sm font-mono text-center rounded-md border border-input bg-background"
      />
      <ScaleUnit value={value} compact />
    </div>
  );
}

// ─── Контекст 5: имитация PDF ─────────────────────────────────────────────
function PdfRow({ value }: { value: number }) {
  return (
    <div className="border-b border-gray-200 pb-3 last:border-0">
      <ScaleUnit value={value} compact />
    </div>
  );
}

export default function ScaleLabelsPreview() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Превью: стрелка-указатель (вариант S, 9×6px) во всех контекстах
        </h1>
        <p className="text-muted-foreground mt-1">
          Все контексты используют один и тот же блок: «Ваш показатель», стрелка, цветная шкала и «Оптимальный диапазон». Боевой код не тронут.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">0. Базовое превью</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => <PreviewScenario key={s.label} value={s.value} />)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Веб-отчёт — карточка биомаркера</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => <ReportCard key={s.label} value={s.value} />)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Личный кабинет / админка → Биомаркеры (строки таблицы)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Биомаркер</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCENARIOS.map((s) => <PatientTableRow key={s.label} value={s.value} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Админка → Analysis Wizard (ввод значений)</CardTitle>
        </CardHeader>
        <CardContent>
          {SCENARIOS.map((s) => <WizardRow key={s.label} value={s.value} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. PDF-отчёт — компактная карточка</CardTitle>
          <p className="text-sm text-muted-foreground">
            В PDF стрелка отрисуется векторно через pdfmake (точно тех же пропорций)
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-white text-black rounded-lg p-6 max-w-[520px] mx-auto space-y-4 border shadow-sm">
            <div className="text-center text-xs text-gray-500 uppercase tracking-wider">PDF preview</div>
            {SCENARIOS.map((s) => <PdfRow key={s.label} value={s.value} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
