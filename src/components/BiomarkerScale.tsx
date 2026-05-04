import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "@/lib/biomarkerNorms";

interface Props {
  biomarker: any;
  value: number;
  age: number | null;
  gender: string | null;
  unit?: string;
  compact?: boolean;
  showHeader?: boolean; // показатель с подписью "Ваш показатель"
}

function calcValuePos(biomarker: any, value: number, age: number, gender: "male" | "female"): number | null {
  const normal = getNormalRangeForAge(biomarker, age, gender);
  const optimal = getOptimalRangeForAge(biomarker, age, gender);
  const critical = getCriticalRangeForAge(biomarker, age, gender);
  if (normal.min === null && normal.max === null) return null;

  const points = [value, normal.min, normal.max, optimal.min, optimal.max, critical.min, critical.max].filter(
    (v): v is number => v !== null && v !== undefined,
  );
  const dataMin = Math.min(...points);
  const dataMax = Math.max(...points);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;
  const pos = ((value - scaleMin) / scaleRange) * 100;
  return Math.max(1, Math.min(99, pos));
}

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

export function BiomarkerScale({ biomarker, value, age, gender, unit, compact = false, showHeader = false }: Props) {
  const g: "male" | "female" = gender === "female" ? "female" : "male";
  const a = age ?? 40;
  const valuePos = calcValuePos(biomarker, value, a, g);
  if (valuePos === null) return null;

  const optimal = getOptimalRangeForAge(biomarker, a, g);
  const u = unit ?? biomarker.unit ?? "";
  const hasOptimal = optimal.min !== null || optimal.max !== null;
  let optText: string | null = null;
  if (hasOptimal) {
    if (optimal.min !== null && optimal.max !== null) {
      optText = `${optimal.min} – ${optimal.max} ${u}`.trim();
    } else if (optimal.max !== null) {
      optText = `≤ ${optimal.max} ${u}`.trim();
    } else if (optimal.min !== null) {
      optText = `≥ ${optimal.min} ${u}`.trim();
    }
  }

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex items-baseline justify-end gap-1 mb-2">
          <span className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>Ваш показатель —</span>
          <span className={`${compact ? "text-xs" : "text-sm"} font-mono font-semibold tabular-nums tracking-tight text-foreground`}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{u}</span>
        </div>
      )}
      <ArrowS pos={valuePos} />
      <BiomarkerRangeBar biomarker={biomarker} value={value} age={age} gender={gender} hideMarker />
      {optText && (
        <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--status-optimal))" }} />
          Оптимальный диапазон:{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">{optText}</span>
        </div>
      )}
    </div>
  );
}
