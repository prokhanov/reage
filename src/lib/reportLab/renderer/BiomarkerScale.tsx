import type { ReportBiomarker } from "../types";
import { resolveRange } from "../parser";

interface Props {
  biomarker: ReportBiomarker;
  gender: "male" | "female" | "other" | null;
  age?: number | null;
}

/**
 * Шкала биомаркера в стиле основного приложения:
 * — pill-скруглённая полоса с 4 полутонами (оптимально / допустимо / риск /
 *   критично), симметрично разложенными по 7 сегментам,
 * — стрелка-указатель на текущее значение,
 * — «Ваш показатель — X unit» сверху и «● Оптимальный диапазон: A – B unit»
 *   снизу.
 *
 * Реализована через HTML+CSS (не SVG), чтобы полностью совпадать с версткой
 * приложения и корректно печататься paged.js.
 */
export function BiomarkerScale({ biomarker, gender, age = null }: Props) {
  const range = resolveRange(biomarker, gender, age);
  const value = biomarker.value;
  const unit = biomarker.unit_override || biomarker.unit || "";

  // Собираем все опорные точки — по ним определяем домен шкалы.
  const stops: number[] = [value];
  const push = (n: number | null) => {
    if (n !== null && n !== undefined) stops.push(n);
  };
  push(range.criticalMin);
  push(range.warningMin);
  push(range.optimalMin);
  push(range.optimalMax);
  push(range.warningMax);
  push(range.criticalMax);

  if (stops.length < 2) {
    return (
      <div className="rl-bio-scale-empty">Референсные значения не заданы</div>
    );
  }

  const dataMin = Math.min(...stops);
  const dataMax = Math.max(...stops);
  const pad = (dataMax - dataMin) * 0.15 || 1;
  const scaleMin = dataMin - pad;
  const scaleMax = dataMax + pad;
  const scaleRange = scaleMax - scaleMin || 1;
  const toPct = (v: number) => ((v - scaleMin) / scaleRange) * 100;

  // Границы сегментов: края шкалы + все опорные точки.
  const bounds = new Set<number>([scaleMin, scaleMax]);
  [
    range.criticalMin,
    range.warningMin,
    range.optimalMin,
    range.optimalMax,
    range.warningMax,
    range.criticalMax,
  ].forEach((v) => {
    if (v !== null && v !== undefined) bounds.add(v);
  });
  const sortedBounds = Array.from(bounds).sort((a, b) => a - b);

  const zoneColor = (v: number): string => {
    const {
      criticalMin,
      warningMin,
      optimalMin,
      optimalMax,
      warningMax,
      criticalMax,
    } = range;
    if (
      (criticalMin !== null && v < criticalMin) ||
      (criticalMax !== null && v > criticalMax)
    )
      return "var(--status-critical)";
    if (
      (warningMin !== null && v < warningMin) ||
      (warningMax !== null && v > warningMax)
    )
      return "var(--status-risk)";
    if (optimalMin !== null || optimalMax !== null) {
      const inOpt =
        (optimalMin === null || v >= optimalMin) &&
        (optimalMax === null || v <= optimalMax);
      return inOpt
        ? "var(--status-optimal)"
        : "var(--status-acceptable)";
    }
    return "var(--status-optimal)";
  };

  const segments: { width: number; color: string }[] = [];
  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const from = sortedBounds[i];
    const to = sortedBounds[i + 1];
    const mid = (from + to) / 2;
    const width = toPct(to) - toPct(from);
    if (width > 0.05) segments.push({ width, color: zoneColor(mid) });
  }

  const markerPos = Math.max(1, Math.min(99, toPct(value)));

  // Текст оптимального диапазона.
  const optMin = range.optimalMin ?? range.warningMin;
  const optMax = range.optimalMax ?? range.warningMax;
  let optText: string | null = null;
  if (optMin !== null && optMax !== null) {
    optText = `${fmt(optMin)} – ${fmt(optMax)} ${unit}`.trim();
  } else if (optMax !== null) {
    optText = `≤ ${fmt(optMax)} ${unit}`.trim();
  } else if (optMin !== null) {
    optText = `≥ ${fmt(optMin)} ${unit}`.trim();
  }

  return (
    <div className="rl-bio-scale">
      <div className="rl-bio-scale-header">
        <span className="rl-bio-scale-label">Ваш показатель —</span>
        <span className="rl-bio-scale-value">{fmt(value)}</span>
        <span className="rl-bio-scale-unit">{unit}</span>
      </div>

      <div className="rl-bio-scale-arrow-row">
        <div
          className="rl-bio-scale-arrow"
          style={{ left: `${markerPos}%` }}
          aria-hidden
        />
      </div>

      <div className="rl-bio-scale-bar">
        {segments.map((s, i) => (
          <div
            key={i}
            className="rl-bio-scale-seg"
            style={{ width: `${s.width}%`, background: s.color }}
          />
        ))}
      </div>

      {optText && (
        <div className="rl-bio-scale-footer">
          <span
            className="rl-bio-scale-dot"
            style={{ background: "var(--status-optimal)" }}
          />
          <span>Оптимальный диапазон:</span>
          <span className="rl-bio-scale-optrange">{optText}</span>
        </div>
      )}
    </div>
  );
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return n
    .toFixed(digits)
    .replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m));
}
