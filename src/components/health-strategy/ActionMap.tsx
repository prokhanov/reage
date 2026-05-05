import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getBiomarkerCategoryIcon } from "@/lib/categoryIcons";
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

export function ActionMap({ actions, systems }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!actions || actions.length === 0) {
    return (
      <Card className="bg-card/60 backdrop-blur-xl border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Карта активных действий</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">Нет активных назначений</p>
        </CardContent>
      </Card>
    );
  }

  const hoveredAction = actions.find((a) => a.prescription_name === hovered);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Карта активных действий</CardTitle>
        <p className="text-xs text-muted-foreground">Наведите на назначение, чтобы увидеть связи</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {actions.map((a) => {
              const isActive = hovered === a.prescription_name;
              const isDimmed = hovered && !isActive;
              return (
                <Tooltip key={a.prescription_name}>
                  <TooltipTrigger asChild>
                    <button
                      onMouseEnter={() => setHovered(a.prescription_name)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(a.prescription_name)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-center",
                        isActive
                          ? "border-primary bg-primary/10 scale-105 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                          : isDimmed
                          ? "border-border/30 bg-muted/20 opacity-40"
                          : "border-border/40 bg-muted/30 hover:border-primary/50",
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-foreground/70",
                      )}>
                        <Pill className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium leading-tight line-clamp-2 break-words">
                        {a.prescription_name}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium mb-1">{a.prescription_name}</p>
                    <p className="text-xs">{a.expected_effect}</p>
                    <p className="text-xs text-muted-foreground mt-1">Эффект через {a.effect_eta}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Connected systems and biomarkers */}
        <div className="pt-3 border-t border-border/40">
          <div className="text-[11px] text-muted-foreground mb-2">Системы организма</div>
          <div className="flex flex-wrap gap-1.5">
            {systems.map((sys) => {
              const Icon = getBiomarkerCategoryIcon(sys);
              const isLinked = hoveredAction?.systems?.includes(sys);
              return (
                <div
                  key={sys}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-all",
                    isLinked
                      ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                      : hovered
                      ? "border-border/30 opacity-40"
                      : "border-border/50 bg-muted/30",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {sys}
                </div>
              );
            })}
          </div>

          {hoveredAction && hoveredAction.biomarker_codes.length > 0 && (
            <>
              <div className="text-[11px] text-muted-foreground mt-3 mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Целевые биомаркеры
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hoveredAction.biomarker_codes.map((code) => (
                  <span key={code} className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[11px] font-mono border border-accent/30">
                    {code}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
