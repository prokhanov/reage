import { Activity, TrendingUp, Brain, Heart, Zap, Shield, Clock, Target } from "lucide-react";

const statsWidgets = [
  { icon: <Heart className="w-6 h-6" />, value: "32", label: "Биовозраст", sublabel: "−3 года", color: "text-primary", bg: "from-primary/20 to-primary/5" },
  { icon: <Activity className="w-6 h-6" />, value: "87%", label: "Индекс здоровья", sublabel: "Отлично", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
  { icon: <Brain className="w-6 h-6" />, value: "50+", label: "Биомаркеров", sublabel: "анализируется", color: "text-foreground", bg: "from-muted/50 to-muted/20" },
  { icon: <Zap className="w-6 h-6" />, value: "12", label: "AI-рекомендаций", sublabel: "персональных", color: "text-accent", bg: "from-accent/20 to-accent/5" },
  { icon: <Shield className="w-6 h-6" />, value: "5", label: "Систем", sublabel: "под контролем", color: "text-primary", bg: "from-primary/20 to-primary/5" },
  { icon: <Clock className="w-6 h-6" />, value: "4×", label: "В год", sublabel: "мониторинг", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
  { icon: <Target className="w-6 h-6" />, value: "98%", label: "Точность", sublabel: "AI-анализа", color: "text-accent", bg: "from-accent/20 to-accent/5" },
  { icon: <TrendingUp className="w-6 h-6" />, value: "+22%", label: "Улучшение", sublabel: "за 6 мес", color: "text-status-good", bg: "from-status-good/20 to-status-good/5" },
];

function StatCard({ widget, index }: { widget: typeof statsWidgets[0]; index: number }) {
  return (
    <div
      className="group flex-shrink-0 w-44 perspective-1000"
      style={{
        animation: `float-card 3s ease-in-out infinite`,
        animationDelay: `${index * 0.2}s`,
      }}
    >
      <div 
        className={`relative bg-gradient-to-br ${widget.bg} backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-lg 
          transition-all duration-500 
          group-hover:scale-110 group-hover:shadow-2xl group-hover:border-primary/50
          group-hover:-translate-y-2`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-500" />
        
        <div className={`${widget.color} mb-3 relative`}>
          <div className="absolute inset-0 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500">
            {widget.icon}
          </div>
          {widget.icon}
        </div>
        
        <div className={`text-3xl font-bold ${widget.color} relative`}>
          {widget.value}
        </div>
        
        <div className="text-sm text-foreground mt-2 font-medium">{widget.label}</div>
        <div className="text-xs text-muted-foreground">{widget.sublabel}</div>
        
        <div className="absolute top-2 right-2 w-8 h-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <div className="w-full h-full border-t-2 border-r-2 border-current rounded-tr-lg" />
        </div>
      </div>
    </div>
  );
}

export function StatsMarqueeSection() {
  return (
    <section className="py-14 md:py-20 overflow-hidden relative">
      {/* Animated Stats Marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div className="flex gap-6 mb-6 animate-marquee-right">
          {[...statsWidgets, ...statsWidgets, ...statsWidgets].map((widget, i) => (
            <StatCard key={`row1-${i}`} widget={widget} index={i % statsWidgets.length} />
          ))}
        </div>
        
        <div className="flex gap-6 animate-marquee-left">
          {[...statsWidgets.slice(4), ...statsWidgets.slice(0, 4), ...statsWidgets, ...statsWidgets.slice(4)].map((widget, i) => (
            <StatCard key={`row2-${i}`} widget={widget} index={i % statsWidgets.length} />
          ))}
        </div>
      </div>

      {/* Bottom Status Indicators */}
      <div className="flex justify-center gap-4 mt-12 flex-wrap px-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-status-good animate-pulse" />
          Данные в реальном времени
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          AI-анализ активен
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Персональные рекомендации
        </div>
      </div>

      <style>{`
        @keyframes marquee-right {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(0%); }
        }
        
        @keyframes marquee-left {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.33%); }
        }
        
        @keyframes float-card {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        .animate-marquee-right {
          animation: marquee-right 30s linear infinite;
        }
        
        .animate-marquee-left {
          animation: marquee-left 25s linear infinite;
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
}
