import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";

// Mock биомаркер: ТТГ-подобный — норма 0.4–4.0, оптимум 0.7–1.2, крит 0.1–10
const biomarker = {
  range_mode: "general",
  normal_min: 0.4,
  normal_max: 4.0,
  optimal_min: 0.7,
  optimal_max: 1.2,
  critical_min: 0.1,
  critical_max: 10,
};

const unit = "мМЕ/л";
const optMin = biomarker.optimal_min;
const optMax = biomarker.optimal_max;

const SCENARIOS: { label: string; value: number }[] = [
  { label: "оптимум", value: 1.0 },
  { label: "допустимо", value: 2.5 },
  { label: "риск", value: 5.0 },
  { label: "дефицит", value: 0.3 },
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
  const toPercent = (v: number) => ((v - scaleMin) / scaleRange) * 100;
  return { valuePos: toPercent(value) };
}

/** Только стрелка — касается верхней кромки шкалы */
function ValueArrow({ pos }: { pos: number }) {
  return (
    <div className="relative h-2">
      <svg
        className="absolute bottom-0 -translate-x-1/2 text-foreground"
        style={{ left: `${pos}%` }}
        width="9"
        height="6"
        viewBox="0 0 9 6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M4.5 6 L0 0 L9 0 Z" />
      </svg>
    </div>
  );
}

function ScenarioRow({ value }: { value: number }) {
  const { valuePos } = calcPositions(value);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-muted-foreground truncate">ТТГ — Тиреотропный гормон</div>
        <div className="text-sm whitespace-nowrap">
          <span className="text-muted-foreground">Ваш показатель — </span>
          <span className="font-mono font-semibold tabular-nums tracking-tight text-foreground">
            {value.toFixed(1)}
          </span>{" "}
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>

      <div className="-mb-2">
        <ValueArrow pos={valuePos} />
      </div>
      <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" hideMarker />

      <div className="text-[11px] font-sans text-muted-foreground mt-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
        Оптимальный диапазон:{" "}
        <span className="font-mono font-medium text-foreground tabular-nums">
          {optMin} – {optMax} {unit}
        </span>
      </div>
    </div>
  );
}

export default function ScaleLabelsPreview() {
  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Превью: подписи диапазона и маркера</h1>
        <p className="text-muted-foreground mt-1">
          На примере ТТГ. Оптимум {optMin}–{optMax} {unit}. Стрелка указывает на значение пациента.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Дизайн B. Подпись отдельной строкой</CardTitle>
          <p className="text-sm text-muted-foreground">
            «Ваш показатель» вынесен в заголовок карточки, стрелка касается шкалы.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
                  сценарий: {s.label}
                </div>
                <ScenarioRow value={s.value} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
