import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";

// Mock биомаркер: ТТГ-подобный
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

type ArrowSize = { w: number; h: number };

/** Стрелка с настраиваемым размером — касается верхней кромки шкалы */
function ValueArrow({ pos, size }: { pos: number; size: ArrowSize }) {
  return (
    <div className="relative" style={{ height: `${size.h}px` }}>
      <svg
        className="absolute -translate-x-1/2 text-foreground"
        style={{ left: `${pos}%`, bottom: '-1px' }}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        fill="currentColor"
        aria-hidden
      >
        <path d={`M${size.w / 2} ${size.h} L0 0 L${size.w} 0 Z`} />
      </svg>
    </div>
  );
}

function ScenarioRow({ value, arrowSize }: { value: number; arrowSize: ArrowSize }) {
  const { valuePos } = calcPositions(value);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-sm text-muted-foreground truncate">ТТГ — Тиреотропный гормон</div>
        <div className="text-sm whitespace-nowrap">
          <span className="text-muted-foreground">Ваш показатель — </span>
          <span className="font-mono font-semibold tabular-nums tracking-tight text-foreground">
            {value.toFixed(1)}
          </span>{" "}
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>

      <ValueArrow pos={valuePos} size={arrowSize} />
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

const ARROW_VARIANTS: { key: string; title: string; description: string; size: ArrowSize }[] = [
  { key: "S",  title: "Вариант S — компактная",   description: "9×6px (текущая)",         size: { w: 9, h: 6 } },
  { key: "M",  title: "Вариант M — чуть больше",  description: "12×8px",                  size: { w: 12, h: 8 } },
  { key: "L",  title: "Вариант L — средняя",      description: "16×10px",                 size: { w: 16, h: 10 } },
  { key: "XL", title: "Вариант XL — крупная",     description: "20×12px",                 size: { w: 20, h: 12 } },
  { key: "2XL",title: "Вариант 2XL — максимум",   description: "26×16px",                 size: { w: 26, h: 16 } },
];

export default function ScaleLabelsPreview() {
  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Превью: размер стрелки-указателя</h1>
        <p className="text-muted-foreground mt-1">
          Сравнение размеров от компактного до крупного. Выберите оптимальный — внедрим в продакшн.
        </p>
      </div>

      {ARROW_VARIANTS.map((v) => (
        <Card key={v.key}>
          <CardHeader>
            <CardTitle className="text-base">{v.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{v.description}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCENARIOS.map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
                    сценарий: {s.label}
                  </div>
                  <ScenarioRow value={s.value} arrowSize={v.size} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
