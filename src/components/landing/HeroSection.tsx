import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Heart, Droplets, Brain, Shield, TrendingUp, Dna, Zap, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";

const floatingCards = [
  { icon: Heart, value: "62", label: "уд/мин", x: "6%", y: "14%", speed: 0.15, rotate: -6 },
  { icon: Droplets, value: "5.2", label: "ммоль/л", x: "80%", y: "8%", speed: 0.22, rotate: 4 },
  { icon: Brain, value: "98%", label: "когнитив", x: "2%", y: "52%", speed: 0.12, rotate: -3 },
  { icon: Shield, value: "Норма", label: "иммунитет", x: "86%", y: "46%", speed: 0.18, rotate: 5 },
  { icon: TrendingUp, value: "+12%", label: "прогресс", x: "4%", y: "82%", speed: 0.25, rotate: -8 },
  { icon: Dna, value: "32", label: "био-возраст", x: "83%", y: "80%", speed: 0.2, rotate: 7 },
  { icon: Zap, value: "8.4", label: "энергия", x: "76%", y: "28%", speed: 0.16, rotate: -5 },
  { icon: Eye, value: "1.2", label: "D3 мкг/л", x: "12%", y: "34%", speed: 0.19, rotate: 3 },
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

      {/* Parallax floating stat cards */}
      {!isMobile && (
        <div className="absolute inset-0 pointer-events-none z-[1]">
          {floatingCards.map((card, i) => {
            const Icon = card.icon;
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
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card/30 border border-border/20 backdrop-blur-md shadow-lg animate-fade-in"
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground leading-none">{card.value}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{card.label}</div>
                  </div>
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
