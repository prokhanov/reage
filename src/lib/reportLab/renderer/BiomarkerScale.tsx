import type { ReportBiomarker } from "../types";
import { resolveRange, resolveStatus } from "../parser";

interface Props {
  biomarker: ReportBiomarker;
  gender: "male" | "female" | "other" | null;
  age?: number | null;
}

/**
 * SVG-шкала биомаркера. Векторная, print-friendly, без внешних библиотек.
 * Отрисовывает 5 сегментов (крит-низ, суб-низ, оптимум, суб-верх, крит-верх)
 * с чёрной риской текущего значения.
 */
export function BiomarkerScale({ biomarker, gender, age = null }: Props) {
  const range = resolveRange(biomarker, gender, age);
  const status = resolveStatus(biomarker, gender, age);

  // Нужно получить домен: минимальную/максимальную точки шкалы.
  const stops: number[] = [];
  if (range.criticalMin !== null) stops.push(range.criticalMin);
  if (range.warningMin !== null) stops.push(range.warningMin);
  if (range.optimalMin !== null) stops.push(range.optimalMin);
  if (range.optimalMax !== null) stops.push(range.optimalMax);
  if (range.warningMax !== null) stops.push(range.warningMax);
  if (range.criticalMax !== null) stops.push(range.criticalMax);
  stops.push(biomarker.value);

  if (stops.length < 2) {
    return (
      <div style={{ fontSize: "9pt", color: "var(--ink-muted)" }}>
        Референсные значения не заданы
      </div>
    );
  }

  const rawMin = Math.min(...stops);
  const rawMax = Math.max(...stops);
  const pad = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.1 || 1;
  const domainMin = rawMin - pad;
  const domainMax = rawMax + pad;
  const span = domainMax - domainMin || 1;

  const width = 480;
  const height = 44;
  const barY = 16;
  const barH = 10;

  const toX = (v: number) =>
    ((v - domainMin) / span) * width;

  // Сегменты: снизу вверх (критический-низ, предупреждение-низ, суб-опт-низ,
  // оптимум, суб-опт-верх, предупреждение-верх, критический-верх).
  interface Seg { from: number; to: number; color: string }
  const segs: Seg[] = [];
  const push = (from: number | null, to: number | null, color: string) => {
    if (from === null || to === null) return;
    if (to <= from) return;
    segs.push({ from, to, color });
  };

  // Критическая нижняя зона: от края шкалы до criticalMin. Если criticalMin
  // не задан, но задан warningMin — считаем всё, что ниже warning'а, красным.
  const critLowStart = domainMin;
  const critLowEnd = range.criticalMin ?? range.warningMin;
  push(critLowStart, critLowEnd, "#a53a2a");

  // Оранжевая нижняя зона: между criticalMin и warningMin.
  push(range.criticalMin, range.warningMin, "#c67432");

  // Жёлтая нижняя зона: между warningMin и optimalMin.
  push(range.warningMin, range.optimalMin, "#d0a437");

  // Зелёный оптимум.
  push(range.optimalMin, range.optimalMax, "#4a7c59");

  // Жёлтая верхняя.
  push(range.optimalMax, range.warningMax, "#d0a437");

  // Оранжевая верхняя.
  push(range.warningMax, range.criticalMax, "#c67432");

  // Критическая верхняя.
  const critHighStart = range.criticalMax ?? range.warningMax;
  push(critHighStart, domainMax, "#a53a2a");

  const valueX = toX(biomarker.value);
  const unit = biomarker.unit_override || biomarker.unit || "";

  // Подписи слева/справа — по «настоящим» медицинским границам, а не по
  // padded-домену. Так пользователь видит реальные критические/warning-точки.
  const leftLabel =
    range.criticalMin ?? range.warningMin ?? range.optimalMin ?? domainMin;
  const rightLabel =
    range.criticalMax ?? range.warningMax ?? range.optimalMax ?? domainMax;

  const fmt = (n: number | null) => {
    if (n === null) return "";
    if (Math.abs(n) >= 100) return n.toFixed(0);
    if (Math.abs(n) >= 10) return n.toFixed(1);
    return n.toFixed(2).replace(/\.?0+$/, "");
  };


  return (
    <svg
      className="rl-bio-scale"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "44px", display: "block" }}
    >
      {/* Фон-шкала (нейтральный) */}
      <rect x={0} y={barY} width={width} height={barH} rx={2} fill="#efece5" />
      {/* Сегменты */}
      {segs.map((s, i) => {
        const x = toX(s.from);
        const w = toX(s.to) - x;
        return (
          <rect
            key={i}
            x={x}
            y={barY}
            width={Math.max(0, w)}
            height={barH}
            fill={s.color}
            opacity={0.85}
          />
        );
      })}
      {/* Тики нормы */}
      {[range.optimalMin, range.optimalMax]
        .filter((v): v is number => v !== null)
        .map((v, i) => (
          <line
            key={`opt-${i}`}
            x1={toX(v)}
            x2={toX(v)}
            y1={barY - 2}
            y2={barY + barH + 2}
            stroke="#16181d"
            strokeWidth={0.5}
            opacity={0.4}
          />
        ))}
      {/* Метка текущего значения */}
      <g>
        <line
          x1={valueX}
          x2={valueX}
          y1={barY - 6}
          y2={barY + barH + 6}
          stroke="#16181d"
          strokeWidth={2}
        />
        <polygon
          points={`${valueX - 4},${barY - 6} ${valueX + 4},${barY - 6} ${valueX},${barY - 1}`}
          fill="#16181d"
        />
      </g>
      {/* Подписи диапазона — по «настоящим» медицинским границам. */}
      <text x={0} y={height - 2} fontSize="8" fill="#7a7f8f" fontFamily="Inter">
        {fmt(leftLabel)} {unit}
      </text>
      <text
        x={width}
        y={height - 2}
        fontSize="8"
        fill="#7a7f8f"
        fontFamily="Inter"
        textAnchor="end"
      >
        {fmt(rightLabel)} {unit}
      </text>
      {/* Подпись значения */}
      <text
        x={valueX}
        y={barY - 8}
        fontSize="9"
        fontWeight="600"
        fill="#16181d"
        fontFamily="Inter"
        textAnchor="middle"
      >
        {fmt(biomarker.value)}
      </text>
      <title>{`${biomarker.name}: ${status}`}</title>
    </svg>
  );
}
