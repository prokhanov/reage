import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface ActionMapItem {
  prescription_name: string;
  systems: string[];
  biomarker_codes: string[];
  expected_effect: string;
  effect_eta: string;
}

interface Props {
  actions: ActionMapItem[];
  systems: string[];
}

const PALETTE = [
  { dark: "#a78bfa", light: "#7c3aed" }, // violet
  { dark: "#60a5fa", light: "#2563eb" }, // blue
  { dark: "#34d399", light: "#059669" }, // emerald
  { dark: "#fbbf24", light: "#d97706" }, // amber
  { dark: "#f472b6", light: "#db2777" }, // pink
  { dark: "#22d3ee", light: "#0891b2" }, // cyan
  { dark: "#fb7185", light: "#e11d48" }, // rose
  { dark: "#c084fc", light: "#9333ea" }, // purple
];

function getInitials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  const w = t.split(/\s+/);
  return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase() || t.slice(0, 2).toUpperCase();
}

export function ActionMap({ actions }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hovered, setHovered] = useState<string | null>(null);

  const items = actions.slice(0, 8);
  const W = 520;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 60;

  const nodes = useMemo(() => {
    const n = items.length || 1;
    return items.map((a, i) => {
      // Distribute around full circle, starting at top
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        action: a,
        x: cx + Math.cos(angle) * R,
        y: cy + Math.sin(angle) * R,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, [items, cx, cy, R]);

  const hoveredAction = items.find((a) => a.prescription_name === hovered);

  return (
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.04] bg-white/60 backdrop-blur-2xl dark:shadow-2xl shadow-xl shadow-slate-200/50">
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full dark:bg-violet-500/15 bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full dark:bg-fuchsia-500/15 bg-pink-200/30 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900">
              Активная карта действий
            </h3>
            <p className="text-xs dark:text-white/55 text-slate-500 mt-1">
              {items.length === 0
                ? "Нет активных назначений"
                : `${items.length} назначений · наведите на узел`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full dark:bg-white/5 bg-white/70 border dark:border-white/10 border-slate-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono dark:text-white/70 text-slate-600">LIVE</span>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Pill className="h-10 w-10 dark:text-white/30 text-slate-300" />
            <p className="text-xs dark:text-white/40 text-slate-400">Назначений пока нет</p>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 380 }}>
              <defs>
                {nodes.map((n, i) => {
                  const c = isDark ? n.color.dark : n.color.light;
                  return (
                    <linearGradient key={`grad-${i}`} id={`line-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={isDark ? "#8b5cf6" : "#6366f1"} stopOpacity={isDark ? 0.7 : 0.5} />
                      <stop offset="100%" stopColor={c} stopOpacity={isDark ? 0.85 : 0.75} />
                    </linearGradient>
                  );
                })}
                <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={isDark ? "#a78bfa" : "#818cf8"} stopOpacity={1} />
                  <stop offset="60%" stopColor={isDark ? "#6366f1" : "#6366f1"} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={isDark ? "#4338ca" : "#4f46e5"} stopOpacity={0.7} />
                </radialGradient>
                <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Concentric orbit rings */}
              {[R * 0.45, R * 0.75, R].map((r, i) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.12)"}
                  strokeWidth={1}
                  strokeDasharray={i === 2 ? "2 4" : "1 3"}
                />
              ))}

              {/* Connection lines from center to each node */}
              {nodes.map((n, i) => {
                const isActive = hovered === n.action.prescription_name;
                const isDimmed = hovered && !isActive;
                const c = isDark ? n.color.dark : n.color.light;
                // Curved path using quadratic bezier with slight offset
                const mx = (cx + n.x) / 2 + (n.y - cy) * 0.08;
                const my = (cy + n.y) / 2 - (n.x - cx) * 0.08;
                const path = `M ${cx} ${cy} Q ${mx} ${my} ${n.x} ${n.y}`;

                return (
                  <g key={`line-${i}`} style={{ opacity: isDimmed ? 0.15 : 1, transition: "opacity 0.25s" }}>
                    <path
                      d={path}
                      fill="none"
                      stroke={`url(#line-grad-${i})`}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeLinecap="round"
                      style={{ transition: "all 0.25s" }}
                    />
                    {/* Animated pulse dot along line */}
                    {isActive && (
                      <circle r={3} fill={c}>
                        <animateMotion dur="1.4s" repeatCount="indefinite" path={path} />
                      </circle>
                    )}
                    {/* Arrow head */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={isActive ? 4 : 2.5}
                      fill={c}
                      style={{ transition: "r 0.25s" }}
                    />
                  </g>
                );
              })}

              {/* Central core node */}
              <g filter="url(#soft-glow)">
                <circle cx={cx} cy={cy} r={36} fill="url(#core-grad)" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={36}
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)"}
                  strokeWidth={1.5}
                />
              </g>
              <foreignObject x={cx - 30} y={cy - 30} width={60} height={60}>
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <Activity className="h-5 w-5 mb-0.5" strokeWidth={2.2} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Health</span>
                </div>
              </foreignObject>

              {/* Prescription nodes */}
              {nodes.map((n, i) => {
                const isActive = hovered === n.action.prescription_name;
                const isDimmed = hovered && !isActive;
                const c = isDark ? n.color.dark : n.color.light;
                const r = isActive ? 26 : 22;

                return (
                  <g
                    key={`node-${i}`}
                    style={{
                      opacity: isDimmed ? 0.35 : 1,
                      transition: "opacity 0.25s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHovered(n.action.prescription_name)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Halo */}
                    {isActive && (
                      <circle cx={n.x} cy={n.y} r={r + 8} fill={c} opacity={isDark ? 0.2 : 0.15}>
                        <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={isDark ? `${c}30` : `${c}20`}
                      stroke={c}
                      strokeWidth={isActive ? 2 : 1.5}
                      style={{ transition: "all 0.25s" }}
                    />
                    <text
                      x={n.x}
                      y={n.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill={isDark ? "#fff" : c}
                      style={{ pointerEvents: "none" }}
                    >
                      {getInitials(n.action.prescription_name)}
                    </text>
                    {/* Label below the node */}
                    <text
                      x={n.x}
                      y={n.y + r + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fill={isDark ? "rgba(255,255,255,0.7)" : "#475569"}
                      style={{ pointerEvents: "none" }}
                    >
                      {n.action.prescription_name.length > 14
                        ? n.action.prescription_name.slice(0, 13) + "…"
                        : n.action.prescription_name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Detail panel */}
            <div className="mt-3 min-h-[78px]">
              {hoveredAction ? (
                <div className="p-3 rounded-xl dark:bg-white/5 bg-white/80 backdrop-blur border dark:border-white/15 border-slate-200 dark:shadow-lg shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                      {hoveredAction.prescription_name}
                    </div>
                    <span className="text-[10px] dark:text-white/55 text-slate-500 whitespace-nowrap font-mono">
                      ETA {hoveredAction.effect_eta}
                    </span>
                  </div>
                  <p className="text-xs dark:text-white/80 text-slate-700 leading-relaxed">
                    {hoveredAction.expected_effect}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hoveredAction.biomarker_codes.slice(0, 6).map((code) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono dark:bg-white/10 bg-indigo-50 dark:text-white/85 text-indigo-700 border dark:border-white/10 border-indigo-100"
                      >
                        {code}
                      </span>
                    ))}
                    {hoveredAction.systems.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded-md text-[10px] dark:bg-violet-500/15 bg-violet-50 dark:text-violet-200 text-violet-700 border dark:border-violet-400/20 border-violet-100"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed dark:border-white/10 border-slate-200 text-center">
                  <p className="text-[11px] dark:text-white/45 text-slate-400">
                    Каждый узел — назначение, влияющее на ваше здоровье. Наведите для деталей.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
