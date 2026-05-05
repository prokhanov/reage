import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "lucide-react";
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

// Palette of 6 hue pairs (dark neon | light pastel fill)
const PALETTE: Array<{ darkFrom: string; darkTo: string; darkText: string; lightBg: string; lightText: string; lightShadow: string }> = [
  { darkFrom: "#8b5cf6", darkTo: "#6366f1", darkText: "#c4b5fd", lightBg: "#ede9fe", lightText: "#5b21b6", lightShadow: "rgba(139,92,246,0.25)" },
  { darkFrom: "#3b82f6", darkTo: "#06b6d4", darkText: "#7dd3fc", lightBg: "#dbeafe", lightText: "#1e40af", lightShadow: "rgba(59,130,246,0.25)" },
  { darkFrom: "#10b981", darkTo: "#06b6d4", darkText: "#6ee7b7", lightBg: "#d1fae5", lightText: "#065f46", lightShadow: "rgba(16,185,129,0.25)" },
  { darkFrom: "#f59e0b", darkTo: "#ef4444", darkText: "#fcd34d", lightBg: "#fef3c7", lightText: "#92400e", lightShadow: "rgba(245,158,11,0.25)" },
  { darkFrom: "#ec4899", darkTo: "#8b5cf6", darkText: "#f9a8d4", lightBg: "#fce7f3", lightText: "#9d174d", lightShadow: "rgba(236,72,153,0.25)" },
  { darkFrom: "#06b6d4", darkTo: "#8b5cf6", darkText: "#67e8f9", lightBg: "#cffafe", lightText: "#155e75", lightShadow: "rgba(6,182,212,0.25)" },
];

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return trimmed.slice(0, Math.min(3, trimmed.length)).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

export function ActionMap({ actions }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredAction = actions.find((a) => a.prescription_name === hovered);

  return (
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.04] bg-white/60 backdrop-blur-2xl dark:shadow-2xl shadow-xl shadow-slate-200/60">
      <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full dark:bg-fuchsia-500/15 bg-pink-200/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full dark:bg-violet-500/15 bg-indigo-200/30 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900">Активная карта действий</h3>
          <p className="text-xs dark:text-white/55 text-slate-500 mt-1">
            {actions.length === 0 ? "Нет активных назначений" : "Наведите на узел, чтобы увидеть эффект"}
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <Pill className="h-10 w-10 dark:text-white/30 text-slate-300" />
          </div>
        ) : (
          <div className="relative min-h-[180px]">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5 relative">
              {actions.slice(0, 10).map((a, idx) => {
                const isActive = hovered === a.prescription_name;
                const isDimmed = hovered && !isActive;
                const c = PALETTE[idx % PALETTE.length];
                const bg = isDark
                  ? `linear-gradient(135deg, ${c.darkFrom}40 0%, ${c.darkTo}10 100%)`
                  : c.lightBg;
                const border = isDark ? `${c.darkFrom}80` : `${c.lightText}25`;
                const textCol = isDark ? c.darkText : c.lightText;
                const glow = isActive
                  ? isDark
                    ? `0 0 24px ${c.darkFrom}aa, inset 0 0 16px ${c.darkFrom}40`
                    : `0 8px 22px ${c.lightShadow}, inset 0 0 12px ${c.lightShadow}`
                  : isDark
                    ? `inset 0 0 12px ${c.darkFrom}30`
                    : `0 4px 12px ${c.lightShadow}, inset 0 0 8px rgba(255,255,255,0.6)`;

                return (
                  <button
                    key={a.prescription_name + idx}
                    onMouseEnter={() => setHovered(a.prescription_name)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(a.prescription_name)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "group relative flex flex-col items-center gap-1.5 transition-all duration-300",
                      isActive && "scale-110 z-10",
                      isDimmed && "opacity-30",
                    )}
                  >
                    <div
                      className="relative w-14 h-14 flex items-center justify-center transition-all"
                      style={{
                        background: bg,
                        border: `1.5px solid ${border}`,
                        boxShadow: glow,
                        clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                      }}
                    >
                      <span className="relative text-sm font-bold tracking-tight" style={{ color: textCol }}>
                        {getInitials(a.prescription_name)}
                      </span>
                    </div>
                    <span className="text-[10px] leading-tight text-center dark:text-white/75 text-slate-700 line-clamp-2 max-w-[80px]">
                      {a.prescription_name.length > 20 ? a.prescription_name.slice(0, 18) + "…" : a.prescription_name}
                    </span>
                  </button>
                );
              })}
            </div>

            {hoveredAction && (
              <div className="mt-4 p-3 rounded-xl dark:bg-white/5 bg-white/80 backdrop-blur border dark:border-white/15 border-slate-200 dark:shadow-lg shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                  {hoveredAction.prescription_name}
                </div>
                <p className="text-xs dark:text-white/80 text-slate-700 mt-1 leading-relaxed">{hoveredAction.expected_effect}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="flex flex-wrap gap-1">
                    {hoveredAction.biomarker_codes.slice(0, 4).map((code) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono dark:bg-white/10 bg-indigo-50 dark:text-white/80 text-indigo-700 border dark:border-white/10 border-indigo-100"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] dark:text-white/55 text-slate-500 whitespace-nowrap">через {hoveredAction.effect_eta}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
