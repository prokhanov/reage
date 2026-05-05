import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Soft accent colors for hex nodes (HSL semantic tokens preferred)
const NODE_COLORS = [
  "from-primary/40 to-primary/10 border-primary/60 text-primary",
  "from-accent/40 to-accent/10 border-accent/60 text-accent",
  "from-status-optimal/40 to-status-optimal/10 border-status-optimal/60 text-status-optimal",
  "from-status-acceptable/40 to-status-acceptable/10 border-status-acceptable/60 text-status-acceptable",
  "from-status-risk/40 to-status-risk/10 border-status-risk/60 text-status-risk",
  "from-primary/40 to-accent/10 border-primary/60 text-primary",
];

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return trimmed.slice(0, Math.min(3, trimmed.length)).toUpperCase();
  }
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

export function ActionMap({ actions }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredAction = actions.find((a) => a.prescription_name === hovered);

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-2xl shadow-2xl">
      <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold">Активная карта действий</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {actions.length === 0 ? "Нет активных назначений" : "Наведите на узел, чтобы увидеть эффект"}
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <Pill className="h-10 w-10 text-muted-foreground/40" />
          </div>
        ) : (
          <div className="relative min-h-[180px]">
            {/* Connecting lines (decorative) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="connLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5 relative">
              {actions.slice(0, 10).map((a, idx) => {
                const isActive = hovered === a.prescription_name;
                const isDimmed = hovered && !isActive;
                const colorClass = NODE_COLORS[idx % NODE_COLORS.length];
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
                    {/* Hexagon */}
                    <div
                      className={cn(
                        "relative w-14 h-14 flex items-center justify-center transition-all",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:rounded-[12px] before:rotate-45 before:border-2 before:transition-all",
                        colorClass,
                      )}
                      style={{
                        clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                      }}
                    >
                      <div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-br border-2 transition-all",
                          colorClass,
                          isActive && "shadow-[0_0_24px_currentColor]",
                        )}
                        style={{
                          clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                        }}
                      />
                      <span className="relative text-sm font-bold tracking-tight">
                        {getInitials(a.prescription_name)}
                      </span>
                    </div>
                    <span className="text-[10px] leading-tight text-center text-foreground/80 line-clamp-2 max-w-[80px]">
                      {a.prescription_name.length > 20
                        ? a.prescription_name.slice(0, 18) + "…"
                        : a.prescription_name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hover detail card */}
            {hoveredAction && (
              <div className="mt-4 p-3 rounded-xl bg-card/80 backdrop-blur border border-primary/30 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="text-sm font-semibold text-primary">{hoveredAction.prescription_name}</div>
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{hoveredAction.expected_effect}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="flex flex-wrap gap-1">
                    {hoveredAction.biomarker_codes.slice(0, 4).map((code) => (
                      <span key={code} className="px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-mono border border-accent/30">
                        {code}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">через {hoveredAction.effect_eta}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
