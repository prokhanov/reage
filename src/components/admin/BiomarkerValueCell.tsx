import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  getBiomarkerStatus,
  getNormalRangeForAge,
  getOptimalRangeForAge,
  getCriticalRangeForAge,
  getStatusHslColor,
  formatNormalRange,
  type BiomarkerStatusInfo,
} from "@/lib/biomarkerNorms";

interface Props {
  value: string;
  onChange: (v: string) => void;
  biomarker: any | null;
  age: number | null;
  gender: "male" | "female" | null;
  hint?: string;
}

function parseNum(s: string): number | null {
  const n = parseFloat((s || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isExtremeDeviation(
  value: number,
  biomarker: any,
  age: number,
  gender: "male" | "female",
): boolean {
  const crit = getCriticalRangeForAge(biomarker, age, gender);
  const norm = getNormalRangeForAge(biomarker, age, gender);
  const refMax = crit.max ?? norm.max;
  const refMin = crit.min ?? norm.min;
  if (refMax != null && refMax > 0 && value > refMax * 3) return true;
  if (refMin != null && refMin > 0 && value < refMin / 3) return true;
  return false;
}

function ScaleBar({
  value,
  biomarker,
  age,
  gender,
  status,
}: {
  value: number;
  biomarker: any;
  age: number;
  gender: "male" | "female";
  status: BiomarkerStatusInfo;
}) {
  const norm = getNormalRangeForAge(biomarker, age, gender);
  const opt = getOptimalRangeForAge(biomarker, age, gender);
  const crit = getCriticalRangeForAge(biomarker, age, gender);

  const pts: number[] = [];
  [crit.min, norm.min, opt.min, opt.max, norm.max, crit.max, value].forEach(v => {
    if (v != null && Number.isFinite(v)) pts.push(v as number);
  });
  if (!pts.length) return null;
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  const span = hi - lo;
  const pct = (v: number) => ((v - lo) / span) * 100;

  const cMin = crit.min ?? lo;
  const nMin = norm.min ?? cMin;
  const oMin = opt.min ?? nMin;
  const oMax = opt.max ?? (norm.max ?? hi);
  const nMax = norm.max ?? oMax;
  const cMax = crit.max ?? hi;

  const segs: { from: number; to: number; color: string }[] = [];
  const push = (from: number, to: number, color: string) => {
    if (to > from) segs.push({ from, to, color });
  };
  push(lo, cMin, "hsl(var(--status-critical))");
  push(cMin, nMin, "hsl(var(--status-risk))");
  push(nMin, oMin, "hsl(var(--status-acceptable))");
  push(oMin, oMax, "hsl(var(--status-optimal))");
  push(oMax, nMax, "hsl(var(--status-acceptable))");
  push(nMax, cMax, "hsl(var(--status-risk))");
  push(cMax, hi, "hsl(var(--status-critical))");

  return (
    <div className="w-64 space-y-2">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-medium truncate">{biomarker.name}</span>
        <span className={`${status.colorClass} font-semibold whitespace-nowrap flex items-center gap-1`}>
          {status.emoji} {status.label}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
        {segs.map((s, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${pct(s.from)}%`,
              width: `${pct(s.to) - pct(s.from)}%`,
              background: s.color,
            }}
          />
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background shadow"
          style={{
            left: `${Math.max(0, Math.min(100, pct(value)))}%`,
            background: getStatusHslColor(status.status),
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <div>Норма: <span className="text-foreground">{formatNormalRange(norm.min, norm.max)} {biomarker.unit}</span></div>
        {(opt.min != null || opt.max != null) && (
          <div>Оптимум: <span className="text-foreground">{formatNormalRange(opt.min, opt.max)}</span></div>
        )}
        {(crit.min != null || crit.max != null) && (
          <div className="col-span-2">Критич.: <span className="text-foreground">{formatNormalRange(crit.min, crit.max)}</span></div>
        )}
        <div className="col-span-2 pt-0.5">Текущее: <span className="text-foreground font-medium">{value} {biomarker.unit}</span></div>
      </div>
    </div>
  );
}

export function BiomarkerValueCell({ value, onChange, biomarker, age, gender, hint }: Props) {
  const num = parseNum(value);
  const hasBio = !!biomarker && (
    biomarker.normal_min != null || biomarker.normal_max != null ||
    biomarker.normal_min_male != null || biomarker.normal_min_female != null ||
    biomarker.age_ranges
  );

  let status: BiomarkerStatusInfo | null = null;
  let extreme = false;
  if (num != null && hasBio) {
    status = getBiomarkerStatus(num, biomarker, age, gender);
    // Only flag extreme deviation when gender is known — otherwise male defaults
    // give false positives for female-specific ranges (e.g. FAI).
    if (gender) {
      extreme = isExtremeDeviation(num, biomarker, age ?? 40, gender);
    }
  }


  const inputEl = (
    <Input
      className={`h-7 text-xs w-24 transition-colors ${status ? `${status.borderClass} ${status.bgClass} ${status.colorClass} font-semibold` : ""}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {status && hasBio && num != null ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block cursor-help">{inputEl}</div>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-3">
                <ScaleBar value={num} biomarker={biomarker} age={age ?? 40} gender={gender ?? "male"} status={status} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          inputEl
        )}
        {extreme && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-status-critical cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Значение сильно выходит за пределы возможного диапазона. Проверьте единицы измерения или возможную ошибку распознавания.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
