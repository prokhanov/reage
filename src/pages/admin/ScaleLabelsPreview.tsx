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

// сценарии для эмуляции
const SCENARIOS: { label: string; value: number }[] = [
  { label: "оптимум", value: 1.0 },
  { label: "допустимо", value: 2.5 },
  { label: "риск", value: 5.0 },
  { label: "дефицит", value: 0.3 },
];

// helper для расчёта позиций оптимума на шкале (повторяет логику BiomarkerRangeBar)
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
  return { left: toPercent(optMin), right: toPercent(optMax), valuePos: toPercent(value) };
}

/**
 * Подпись «ваш показатель» с настоящей стрелкой,
 * указывающей на маркер пациента.
 */
function ValueMarkerLabel({ pos }: { pos: number }) {
  // сдвигаем подпись, но стрелка всё равно встаёт точно над маркером
  const labelLeft = Math.max(10, Math.min(90, pos));
  return (
    <div className="relative h-7 mb-0.5">
      <div className="absolute flex flex-col items-center -translate-x-1/2" style={{ left: `${labelLeft}%` }}>
        <span className="font-sans text-[11px] font-medium tracking-tight text-foreground/80 whitespace-nowrap leading-none">
          ваш показатель
        </span>
      </div>
      {/* стрелка точно над маркером значения */}
      <svg
        className="absolute top-3.5 -translate-x-1/2 text-foreground"
        style={{ left: `${pos}%` }}
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="currentColor"
        aria-hidden
      >
        <path d="M5 10 L0 0 L10 0 Z" />
      </svg>
    </div>
  );
}

function ScenarioRow({ value, variant }: { value: number; variant: 3 | 5 }) {
  const { left, right, valuePos } = calcPositions(value);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-sm text-muted-foreground">ТТГ — Тиреотропный гормон</div>
        <div className="font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {value.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </div>
      </div>

      <ValueMarkerLabel pos={valuePos} />
      <BiomarkerRangeBar biomarker={biomarker} value={value} age={40} gender="male" />

      {variant === 3 && (
        <div className="relative h-6 mt-2">
          <div
            className="absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium font-sans tabular-nums whitespace-nowrap"
            style={{
              left: `${(left + right) / 2}%`,
              backgroundColor: "hsl(var(--status-optimal) / 0.15)",
              color: "hsl(var(--status-optimal))",
              border: "1px solid hsl(var(--status-optimal) / 0.4)",
            }}
          >
            оптимум {optMin}–{optMax}
          </div>
        </div>
      )}

      {variant === 5 && (
        <div className="text-[11px] font-sans text-muted-foreground mt-2 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
          Оптимальный диапазон:{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {optMin} – {optMax} {unit}
          </span>
        </div>
      )}
    </div>
  );
}

function VariantBlock({ title, description, variant }: { title: string; description: string; variant: 3 | 5 }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <div key={s.label} className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
                сценарий: {s.label}
              </div>
              <ScenarioRow value={s.value} variant={variant} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScaleLabelsPreview() {
  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Превью: подписи диапазона и маркера</h1>
        <p className="text-muted-foreground mt-1">
          На примере ТТГ. Оптимум {optMin}–{optMax} {unit}. Стрелка «ваш показатель» точно указывает на значение пациента.
        </p>
      </div>

      <VariantBlock
        variant={3}
        title="Дизайн A. Pill-бейдж под зелёной зоной"
        description="Зелёная таблетка с диапазоном размещена ровно под оптимумом, стрелка указывает на пациента."
      />

      <VariantBlock
        variant={5}
        title="Дизайн B. Подпись отдельной строкой"
        description="Минимум визуальной нагрузки — диапазон вынесен текстом со зелёным маркером."
      />
    </div>
  );
}
