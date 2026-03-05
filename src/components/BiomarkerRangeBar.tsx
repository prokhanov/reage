import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "@/lib/biomarkerNorms";

interface BiomarkerRangeBarProps {
  biomarker: any;
  value: number;
  age: number | null;
  gender: string | null;
  unit?: string;
  showLabels?: boolean;
}

interface Segment {
  width: number;
  color: string;
  label: string;
}

export function BiomarkerRangeBar({ biomarker, value, age, gender, showLabels = false }: BiomarkerRangeBarProps) {
  const g = (gender === 'male' || gender === 'female') ? gender : 'male';
  const a = age ?? 40;

  const normal = getNormalRangeForAge(biomarker, a, g);
  const optimal = getOptimalRangeForAge(biomarker, a, g);
  const critical = getCriticalRangeForAge(biomarker, a, g);

  if (normal.min === null && normal.max === null) return null;

  const optMin = optimal.min;
  const optMax = optimal.max;
  const normMin = normal.min;
  const normMax = normal.max;
  const critMin = critical.min;
  const critMax = critical.max;

  const allValues = [value];
  if (optMin !== null) allValues.push(optMin);
  if (optMax !== null) allValues.push(optMax);
  if (normMin !== null) allValues.push(normMin);
  if (normMax !== null) allValues.push(normMax);
  if (critMin !== null) allValues.push(critMin);
  if (critMax !== null) allValues.push(critMax);

  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;

  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;

  const toPercent = (v: number) => ((v - scaleMin) / scaleRange) * 100;

  // Build boundaries from left to right
  const boundaries: { pos: number; color: string; labelValue: number | null }[] = [];

  boundaries.push({ pos: scaleMin, color: 'hsl(var(--status-critical))', labelValue: null });

  if (critMin !== null && critMin > scaleMin) {
    boundaries.push({ pos: critMin, color: 'hsl(var(--status-risk))', labelValue: critMin });
  }

  if (normMin !== null) {
    if (normMin > (critMin ?? scaleMin)) {
      boundaries.push({ pos: normMin, color: 'hsl(var(--status-acceptable))', labelValue: normMin });
    }
  }

  if (optMin !== null && optMin !== normMin) {
    boundaries.push({ pos: optMin, color: 'hsl(var(--status-optimal))', labelValue: optMin });
  } else if (normMin !== null) {
    boundaries.push({ pos: normMin, color: 'hsl(var(--status-optimal))', labelValue: null });
  }

  if (optMax !== null && optMax !== normMax) {
    boundaries.push({ pos: optMax, color: 'hsl(var(--status-acceptable))', labelValue: optMax });
  }

  if (normMax !== null) {
    boundaries.push({ pos: normMax, color: 'hsl(var(--status-risk))', labelValue: normMax });
  }

  if (critMax !== null && critMax < scaleMax) {
    boundaries.push({ pos: critMax, color: 'hsl(var(--status-critical))', labelValue: critMax });
  }

  boundaries.push({ pos: scaleMax, color: '', labelValue: null });

  // Build segments
  const segments: Segment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i].pos;
    const end = boundaries[i + 1].pos;
    const width = toPercent(end) - toPercent(start);
    if (width > 0.1) {
      segments.push({
        width,
        color: boundaries[i].color,
        label: '',
      });
    }
  }

  const markerPos = Math.max(1, Math.min(99, toPercent(value)));

  // Collect boundary labels for display
  const labelPoints = showLabels
    ? boundaries.filter(b => b.labelValue !== null).map(b => ({
        pos: Math.max(2, Math.min(98, toPercent(b.pos))),
        value: b.labelValue!,
      }))
    : [];

  return (
    <div className="space-y-0.5">
      <div className="relative h-3 flex rounded-full overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              width: `${seg.width}%`,
              backgroundColor: seg.color,
            }}
            className="h-full"
          />
        ))}
        {/* Value marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background shadow-lg z-10"
          style={{
            left: `${markerPos}%`,
            backgroundColor: 'hsl(var(--foreground))',
          }}
        />
      </div>
      {showLabels && labelPoints.length > 0 && (
        <div className="relative h-3">
          {labelPoints.map((lp, i) => (
            <span
              key={i}
              className="absolute text-[9px] text-muted-foreground -translate-x-1/2 leading-none"
              style={{ left: `${lp.pos}%` }}
            >
              {lp.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
