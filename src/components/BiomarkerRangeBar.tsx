import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "@/lib/biomarkerNorms";

interface BiomarkerRangeBarProps {
  biomarker: any;
  value: number;
  age: number | null;
  gender: string | null;
  unit?: string;
}

interface Segment {
  width: number; // percentage
  color: string; // CSS variable
  label: string;
}

export function BiomarkerRangeBar({ biomarker, value, age, gender }: BiomarkerRangeBarProps) {
  const g = (gender === 'male' || gender === 'female') ? gender : 'male';
  const a = age ?? 40;

  const normal = getNormalRangeForAge(biomarker, a, g);
  const optimal = getOptimalRangeForAge(biomarker, a, g);
  const critical = getCriticalRangeForAge(biomarker, a, g);

  // We need at least normal range to render
  if (normal.min === null && normal.max === null) return null;

  // Determine actual boundaries for the 7 zones
  const optMin = optimal.min ?? normal.min;
  const optMax = optimal.max ?? normal.max;
  const normMin = normal.min;
  const normMax = normal.max;
  const critMin = critical.min;
  const critMax = critical.max;

  // Calculate the full scale range
  // We extend beyond critical by ~10% for visual padding
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

  // Build segments from left to right
  // Boundaries (sorted): scaleMin, critMin, normMin, optMin, optMax, normMax, critMax, scaleMax
  const boundaries: { pos: number; color: string }[] = [];

  boundaries.push({ pos: scaleMin, color: 'hsl(var(--status-critical))' }); // 🔴 low critical

  if (critMin !== null && critMin > scaleMin) {
    boundaries.push({ pos: critMin, color: 'hsl(var(--status-risk))' }); // 🟠 low risk
  }

  if (normMin !== null) {
    const effectiveNormMin = normMin;
    if (effectiveNormMin > (critMin ?? scaleMin)) {
      boundaries.push({ pos: effectiveNormMin, color: 'hsl(var(--status-acceptable))' }); // 🟡 low acceptable
    }
  }

  if (optMin !== null && optMin !== normMin) {
    boundaries.push({ pos: optMin, color: 'hsl(var(--status-optimal))' }); // 🟢 optimal
  } else if (normMin !== null) {
    boundaries.push({ pos: normMin, color: 'hsl(var(--status-optimal))' }); // 🟢 optimal (no separate optimal)
  }

  if (optMax !== null && optMax !== normMax) {
    boundaries.push({ pos: optMax, color: 'hsl(var(--status-acceptable))' }); // 🟡 high acceptable
  }

  if (normMax !== null) {
    boundaries.push({ pos: normMax, color: 'hsl(var(--status-risk))' }); // 🟠 high risk
  }

  if (critMax !== null && critMax < scaleMax) {
    boundaries.push({ pos: critMax, color: 'hsl(var(--status-critical))' }); // 🔴 high critical
  }

  boundaries.push({ pos: scaleMax, color: '' }); // end

  // Build segment array
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

  // Value marker position
  const markerPos = Math.max(1, Math.min(99, toPercent(value)));

  return (
    <div className="space-y-1">
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
    </div>
  );
}
