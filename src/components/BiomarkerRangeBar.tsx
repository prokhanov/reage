import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge, getBiomarkerStatus } from "@/lib/biomarkerNorms";

interface BiomarkerRangeBarProps {
  biomarker: any;
  value: number;
  age: number | null;
  gender: string | null;
  unit?: string;
  showLabels?: boolean;
  fillHeight?: boolean;
  hideMarker?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  critical: 'hsl(var(--status-critical))',
  risk: 'hsl(var(--status-risk))',
  acceptable: 'hsl(var(--status-acceptable))',
  optimal: 'hsl(var(--status-optimal))',
};

function getZoneColor(
  v: number,
  normMin: number | null,
  normMax: number | null,
  optMin: number | null,
  optMax: number | null,
  critMin: number | null,
  critMax: number | null,
): string {
  // Critical
  if ((critMin !== null && v < critMin) || (critMax !== null && v > critMax)) {
    return STATUS_COLORS.critical;
  }

  // Check optimal BEFORE normal for open-ended ranges
  if (optMin !== null || optMax !== null) {
    const inOptimal =
      (optMin === null || v >= optMin) && (optMax === null || v <= optMax);
    if (inOptimal) {
      return STATUS_COLORS.optimal;
    }
  }

  // Outside normal = risk
  if ((normMin !== null && v < normMin) || (normMax !== null && v > normMax)) {
    return STATUS_COLORS.risk;
  }

  // Inside normal but outside optimal = acceptable
  if (optMin !== null || optMax !== null) {
    return STATUS_COLORS.acceptable;
  }

  // No optimal defined — normal = optimal
  return STATUS_COLORS.optimal;
}

export function BiomarkerRangeBar({ biomarker, value, age, gender, showLabels = false, fillHeight = false, hideMarker = false }: BiomarkerRangeBarProps) {
  const g = (gender === 'male' || gender === 'female') ? gender : 'male';
  const a = age ?? 40;

  const normal = getNormalRangeForAge(biomarker, a, g);
  const optimal = getOptimalRangeForAge(biomarker, a, g);
  const critical = getCriticalRangeForAge(biomarker, a, g);

  if (normal.min === null && normal.max === null) return null;

  const normMin = normal.min;
  const normMax = normal.max;
  const optMin = optimal.min;
  const optMax = optimal.max;
  const critMin = critical.min;
  const critMax = critical.max;

  // Collect all boundary points
  const pointSet = new Set<number>();
  [value, normMin, normMax, optMin, optMax, critMin, critMax].forEach(v => {
    if (v !== null) pointSet.add(v);
  });

  const allPoints = Array.from(pointSet);
  const dataMin = Math.min(...allPoints);
  const dataMax = Math.max(...allPoints);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;

  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;

  const toPercent = (v: number) => ((v - scaleMin) / scaleRange) * 100;

  // Build sorted boundary points including scale edges
  const boundaries = new Set<number>();
  boundaries.add(scaleMin);
  boundaries.add(scaleMax);
  if (critMin !== null) boundaries.add(critMin);
  if (normMin !== null) boundaries.add(normMin);
  if (optMin !== null) boundaries.add(optMin);
  if (optMax !== null) boundaries.add(optMax);
  if (normMax !== null) boundaries.add(normMax);
  if (critMax !== null) boundaries.add(critMax);

  const sortedBounds = Array.from(boundaries).sort((a, b) => a - b);

  // Build segments — color determined by midpoint
  const segments: { width: number; color: string }[] = [];
  const labelPoints: { pos: number; value: number }[] = [];

  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const start = sortedBounds[i];
    const end = sortedBounds[i + 1];
    const mid = (start + end) / 2;
    const width = toPercent(end) - toPercent(start);
    if (width > 0.1) {
      segments.push({
        width,
        color: getZoneColor(mid, normMin, normMax, optMin, optMax, critMin, critMax),
      });
    }
  }

  // Label points (all internal boundaries, not scale edges)
  if (showLabels) {
    for (const b of sortedBounds) {
      if (b !== scaleMin && b !== scaleMax) {
        labelPoints.push({
          pos: Math.max(2, Math.min(98, toPercent(b))),
          value: b,
        });
      }
    }
  }

  const markerPos = Math.max(1, Math.min(99, toPercent(value)));

  const barClass = fillHeight ? 'h-full' : 'h-3';

  return (
    <div className={fillHeight ? 'h-full' : 'space-y-0.5'}>
      <div className={`relative ${barClass} flex ${fillHeight ? '' : 'rounded-full'} overflow-hidden`}>
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
        {!hideMarker && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background shadow-lg z-10 ${fillHeight ? 'w-4 h-4' : 'w-3 h-3'}`}
            style={{
              left: `${markerPos}%`,
              backgroundColor: 'hsl(var(--foreground))',
            }}
          />
        )}
      </div>
      {showLabels && !fillHeight && labelPoints.length > 0 && (
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
