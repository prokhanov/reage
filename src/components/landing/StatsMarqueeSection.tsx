import { Activity, TrendingUp, Brain, Heart, Zap, Shield, Clock, Target } from "lucide-react";

const statsWidgets = [
  { icon: <Heart className="w-6 h-6" />, value: "32", label: "Биовозраст", sublabel: "−3 года", color: "text-primary", bg: "from-primary/20 to-primary/5" },
  { icon: <Activity className="w-6 h-6" />, value: "87%", label: "Индекс здоровья", sublabel: "Отлично", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
  { icon: <Brain className="w-6 h-6" />, value: "50+", label: "Биомаркеров", sublabel: "анализируется", color: "text-foreground", bg: "from-muted/50 to-muted/20" },
  { icon: <Zap className="w-6 h-6" />, value: "12", label: "Рекомендаций", sublabel: "персональных", color: "text-accent", bg: "from-accent/20 to-accent/5" },
  { icon: <Shield className="w-6 h-6" />, value: "5", label: "Систем", sublabel: "под контролем", color: "text-primary", bg: "from-primary/20 to-primary/5" },
  { icon: <Clock className="w-6 h-6" />, value: "4×", label: "В год", sublabel: "мониторинг", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
  { icon: <Target className="w-6 h-6" />, value: "98%", label: "Точность", sublabel: "анализа", color: "text-accent", bg: "from-accent/20 to-accent/5" },
  { icon: <TrendingUp className="w-6 h-6" />, value: "+22%", label: "Улучшение", sublabel: "за 6 мес", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
];

function StatCard({ widget, index }: { widget: typeof statsWidgets[0]; index: number }) {
  return (
    <div className="group flex-shrink-0 w-44">
      <div 
        className={`relative bg-gradient-to-br ${widget.bg} backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-lg 
          transition-all duration-500 
          group-hover:scale-110 group-hover:shadow-2xl group-hover:border-primary/50
          group-hover:-translate-y-2`}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-500" />
        
        <div className={`${widget.color} mb-3 relative`}>
          {widget.icon}
        </div>
        
        <div className={`text-3xl font-bold ${widget.color} relative`}>
          {widget.value}
        </div>
        
        <div className="text-sm text-foreground mt-2 font-medium">{widget.label}</div>
        <div className="text-xs text-muted-foreground">{widget.sublabel}</div>
      </div>
    </div>
  );
}

export function StatsMarqueeSection() {
  const doubled = [...statsWidgets, ...statsWidgets];
  return (
    <section className="py-14 md:py-20 overflow-hidden relative">
      <div className="relative">
        <div className="flex stats-marquee-track">
          {doubled.map((widget, i) => (
            <StatCard key={`row1-${i}`} widget={widget} index={i % statsWidgets.length} />
          ))}
        </div>
      </div>

      <style>{`
        .stats-marquee-track {
          width: max-content;
          gap: 1.5rem;
          animation: stats-marquee-scroll 40s linear infinite;
        }
        @keyframes stats-marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
