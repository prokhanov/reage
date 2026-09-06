interface BiologicalAgeCircleProps {
  biologicalAge: number | null;
  chronologicalAge: number | null;
}

/**
 * Calm, editorial ring: hairline track + single status arc.
 * No gradients, particles or glow — status is carried by semantic tokens only.
 */
export function BiologicalAgeCircle({
  biologicalAge,
  chronologicalAge,
}: BiologicalAgeCircleProps) {
  const ageDifference =
    biologicalAge !== null && chronologicalAge !== null
      ? chronologicalAge - biologicalAge
      : null;

  const statusClass =
    ageDifference === null
      ? "text-muted-foreground"
      : ageDifference > 0
        ? "text-success"
        : ageDifference === 0
          ? "text-info"
          : ageDifference > -5
            ? "text-warning"
            : "text-destructive";

  const size = 320;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  // Arc length reflects magnitude of the deviation, capped at 10 years.
  const magnitude = ageDifference === null ? 0.18 : Math.min(Math.abs(ageDifference), 10) / 10;
  const arc = Math.max(circumference * 0.06, circumference * magnitude);

  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth={1}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${statusClass} stroke-current`}
          strokeWidth={3}
          strokeLinecap="butt"
          strokeDasharray={`${arc} ${circumference - arc}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
        <div className="text-7xl font-display font-normal text-foreground leading-none tracking-tight">
          {biologicalAge !== null ? biologicalAge.toFixed(1) : "—"}
        </div>
      </div>
    </div>
  );
}
