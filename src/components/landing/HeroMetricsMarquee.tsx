import { Heart, TrendingDown, Activity, Sun, Droplets, AlertTriangle, ListChecks, ShieldCheck } from "lucide-react";

const widgets = [
  // 1. Биовозраст — mini circular gauge
  {
    id: "bio-age",
    render: () => (
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" opacity="0.3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={`${0.91 * 94.25} ${94.25}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">32</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">Биовозраст</div>
          <div className="text-[10px] text-status-good font-medium">−3 от паспортного</div>
        </div>
      </div>
    ),
  },
  // 2. Темп старения
  {
    id: "aging-rate",
    render: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-status-good/15 flex items-center justify-center flex-shrink-0">
          <TrendingDown className="w-4 h-4 text-status-good" />
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">Темп старения</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-status-good">0.85x</span>
            <span className="text-[10px] text-muted-foreground">замедлен</span>
          </div>
        </div>
      </div>
    ),
  },
  // 3. Индекс здоровья — progress bar
  {
    id: "health-index",
    render: () => (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">Индекс здоровья</span>
          <span className="text-xs font-bold text-status-good">87%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full bg-status-good" style={{ width: "87%" }} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">Отлично</div>
      </div>
    ),
  },
  // 4. Витамин D — scale with zones
  {
    id: "vitamin-d",
    render: () => (
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sun className="w-3.5 h-3.5 text-status-warning" />
          <span className="text-xs font-semibold text-foreground">Витамин D</span>
        </div>
        <BiomarkerScale position={72} status="optimal" />
        <div className="text-[10px] text-status-good mt-1 font-medium">Оптимум</div>
      </div>
    ),
  },
  // 5. Ферритин
  {
    id: "ferritin",
    render: () => (
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Droplets className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Ферритин</span>
        </div>
        <BiomarkerScale position={55} status="normal" />
        <div className="text-[10px] text-foreground/60 mt-1 font-medium">Норма</div>
      </div>
    ),
  },
  // 6. Гомоцистеин — deviation
  {
    id: "homocysteine",
    render: () => (
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          <span className="text-xs font-semibold text-foreground">Гомоцистеин</span>
        </div>
        <BiomarkerScale position={88} status="deviation" />
        <div className="text-[10px] text-status-warning mt-1 font-medium">Отклонение</div>
      </div>
    ),
  },
  // 7. Рекомендации
  {
    id: "recommendations",
    render: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
          <ListChecks className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">Рекомендации</div>
          <div className="text-sm font-bold text-accent">12 <span className="text-[10px] font-normal text-muted-foreground">персональных</span></div>
        </div>
      </div>
    ),
  },
  // 8. Системы
  {
    id: "systems",
    render: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">Системы</div>
          <div className="flex items-center gap-1 mt-1">
            {[true, true, true, true, false].map((ok, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${ok ? "bg-status-good" : "bg-status-warning"}`} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">4/5</span>
          </div>
        </div>
      </div>
    ),
  },
];

function BiomarkerScale({ position, status }: { position: number; status: "optimal" | "normal" | "deviation" }) {
  const colors = {
    optimal: "bg-status-good",
    normal: "bg-primary",
    deviation: "bg-status-warning",
  };
  return (
    <div className="relative w-full h-1.5 rounded-full overflow-hidden flex">
      <div className="h-full bg-status-danger/30" style={{ width: "20%" }} />
      <div className="h-full bg-status-warning/30" style={{ width: "15%" }} />
      <div className="h-full bg-status-good/40" style={{ width: "30%" }} />
      <div className="h-full bg-status-warning/30" style={{ width: "15%" }} />
      <div className="h-full bg-status-danger/30" style={{ width: "20%" }} />
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background ${colors[status]}`}
        style={{ left: `${position}%`, transform: `translate(-50%, -50%)` }}
      />
    </div>
  );
}

export function HeroMetricsMarquee() {
  const tripled = [...widgets, ...widgets, ...widgets];
  return (
    <div className="relative w-full overflow-hidden mb-8">
      {/* Edge masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="flex gap-3 hero-marquee-track">
        {tripled.map((w, i) => (
          <div
            key={`${w.id}-${i}`}
            className="flex-shrink-0 w-[160px] px-3 py-2.5 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
          >
            {w.render()}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes hero-marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .hero-marquee-track {
          animation: hero-marquee-scroll 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
