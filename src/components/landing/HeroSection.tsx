import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Heart, Activity, Brain, Shield, TrendingUp, Dna, AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";

type FloatingCardData = {
  x: string;
  y: string;
  speed: number;
  rotate: number;
  content: React.ReactNode;
};

function MiniBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-1 rounded-full bg-white/10 mt-1.5">
      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

function StatCardContent({ icon: Icon, title, value, sub, barPercent, barColor }: {
  icon: typeof Heart; title: string; value: string; sub?: string;
  barPercent?: number; barColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-400 leading-none">{title}</div>
        <div className="text-sm font-bold text-white leading-tight mt-1">{value}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
        {barPercent !== undefined && barColor && <MiniBar percent={barPercent} color={barColor} />}
      </div>
    </div>
  );
}

const floatingCardsData: FloatingCardData[] = [
  {
    x: "3%", y: "12%", speed: 0.15, rotate: -4,
    content: <StatCardContent icon={ListChecks} title="Рекомендации" value="12 персональных" />,
  },
  {
    x: "82%", y: "6%", speed: 0.22, rotate: 3,
    content: <StatCardContent icon={Shield} title="Системы" value="4/5" sub="●●●●○" />,
  },
  {
    x: "1%", y: "48%", speed: 0.12, rotate: -2,
    content: (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Dna className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 leading-none">Биовозраст</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-white leading-none">32</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">−3 от паспортного</div>
        </div>
      </div>
    ),
  },
  {
    x: "84%", y: "44%", speed: 0.18, rotate: 4,
    content: (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 leading-none">Темп старения</div>
          <div className="text-sm font-bold text-emerald-400 leading-tight mt-1">0.85x</div>
          <div className="text-[10px] text-slate-500 mt-0.5">замедлен</div>
        </div>
      </div>
    ),
  },
  {
    x: "2%", y: "80%", speed: 0.25, rotate: -6,
    content: (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-blue-400" />
        </div>
        <div className="w-24">
          <div className="text-[11px] text-slate-400 leading-none">Индекс здоровья</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-sm font-bold text-white leading-none">87%</span>
          </div>
          <MiniBar percent={87} color="#22c55e" />
          <div className="text-[10px] text-emerald-400 mt-1">Отлично</div>
        </div>
      </div>
    ),
  },
  {
    x: "80%", y: "78%", speed: 0.2, rotate: 5,
    content: <StatCardContent icon={CheckCircle2} title="Витамин D" value="Оптимум" barPercent={75} barColor="#22c55e" />,
  },
  {
    x: "78%", y: "25%", speed: 0.16, rotate: -3,
    content: (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="w-20">
          <div className="text-[11px] text-slate-400 leading-none">Гомоцистеин</div>
          <div className="text-sm font-bold text-amber-400 leading-tight mt-1">Отклонение</div>
          <MiniBar percent={92} color="#f59e0b" />
        </div>
      </div>
    ),
  },
  {
    x: "10%", y: "32%", speed: 0.19, rotate: 2,
    content: <StatCardContent icon={Heart} title="Ферритин" value="Норма" barPercent={55} barColor="#22c55e" />,
  },
];

export function HeroSection() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDark = theme === "dark";

  return (
    <section className="relative flex items-center justify-center overflow-hidden bg-background min-h-[100dvh]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] animate-[hero-glow-pulse_8s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(ellipse 80% 40% at 42% 50%, hsl(220 85% 50% / 0.35) 0%, hsl(190 90% 50% / 0.2) 35%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-1/2 w-[140%] h-[120%] animate-[hero-glow-drift_12s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(ellipse 65% 30% at 55% 50%, hsl(175 80% 45% / 0.3) 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[80%] animate-[hero-glow-pulse_6s_ease-in-out_infinite_reverse]"
          style={{ background: 'radial-gradient(ellipse 50% 20% at 48% 50%, hsl(200 90% 65% / 0.2) 0%, transparent 60%)' }}
        />
      </div>

      {/* Parallax floating stat cards — dark glassmorphic */}
      {!isMobile && (
        <div className="absolute inset-0 pointer-events-none z-[1]">
          {floatingCardsData.map((card, i) => {
            const yOffset = scrollY * card.speed;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: card.x,
                  top: card.y,
                  transform: `translateY(${yOffset}px) rotate(${card.rotate}deg)`,
                  willChange: 'transform',
                }}
              >
                <div
                  className="px-4 py-3.5 rounded-2xl border animate-fade-in opacity-[0.07]"
                  style={{
                    animationDelay: `${0.4 + i * 0.1}s`,
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
                    borderColor: 'rgba(148, 163, 184, 0.15)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  {card.content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logo */}
      <ThemedLogo className="absolute top-4 left-8 z-10 h-20 w-auto animate-hue-shift" />

      {/* Theme Toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-lg"
          aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-8 md:gap-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <span className="text-sm font-medium text-primary">85 биомаркеров • Анализы не выходя из дома • Результат за 5 дней • Отслеживание трендов</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="block text-foreground">Ваше здоровье в цифрах,</span>
            <span className="block mt-2 bg-gradient-hero bg-clip-text text-transparent">
              динамике и рекомендациях
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Регулярно берём анализы у вас дома и предоставляем самый глубокий отчёт по системам организма, факторам риска и биологическому возрасту — в динамике и с сопровождением.
          </p>

          <div className="animate-fade-in w-full px-2 md:px-0" style={{ animationDelay: '0.3s' }}>
            <HeroBullets />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" onClick={() => navigate("/register")} className="text-lg px-8 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group">
              Начать мониторинг
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300">
              Войти в аккаунт
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
