import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Heart, Zap, Shield, Brain, Droplets, Activity } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useCallback } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";

const floatingCards = [
  { icon: Heart, value: "62", label: "уд/мин", top: "18%", left: "5%", depth: 0.03 },
  { icon: Zap, value: "5.2", label: "ммоль/л", top: "8%", right: "4%", depth: 0.05 },
  { icon: Shield, value: "Норма", label: "иммунитет", top: "45%", right: "2%", depth: 0.02 },
  { icon: Activity, value: "+12%", label: "биовозраст", bottom: "12%", left: "3%", depth: 0.04 },
  { icon: Brain, value: "98%", label: "когнитив", top: "50%", left: "1%", depth: 0.035 },
  { icon: Droplets, value: "32", label: "нмоль/л", bottom: "8%", right: "5%", depth: 0.025 },
  { icon: Zap, value: "⚡", label: "энергия", top: "25%", right: "8%", depth: 0.045 },
];

export function HeroSection() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouse({ x, y });
  }, []);
  const isDark = theme === "dark";

  return (
    <section ref={sectionRef} onMouseMove={handleMouseMove} className="relative flex items-center justify-center overflow-hidden bg-background">
      {/* Ambient light gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] animate-[hero-glow-pulse_8s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(ellipse 80% 40% at 42% 50%, hsl(220 85% 50% / 0.35) 0%, hsl(190 90% 50% / 0.2) 35%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-1/2 w-[140%] h-[120%] animate-[hero-glow-drift_12s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(ellipse 65% 30% at 55% 50%, hsl(175 80% 45% / 0.3) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[80%] animate-[hero-glow-pulse_6s_ease-in-out_infinite_reverse]"
          style={{
            background: 'radial-gradient(ellipse 50% 20% at 48% 50%, hsl(200 90% 65% / 0.2) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Parallax biomarker cards — desktop only */}
      {!isMobile && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {floatingCards.map((card, i) => {
            const tx = mouse.x * card.depth * 1000;
            const ty = mouse.y * card.depth * 1000;
            return (
              <div
                key={i}
                className="absolute opacity-60 transition-transform duration-700 ease-out"
                style={{
                  top: card.top,
                  left: card.left,
                  right: card.right,
                  bottom: card.bottom,
                  transform: `translate(${tx}px, ${ty}px)`,
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/30 border border-border/20 backdrop-blur-md">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <card.icon className="w-4 h-4 text-primary/70" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground/70 leading-none">{card.value}</div>
                    <div className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">{card.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logo - top left */}
      <ThemedLogo className="absolute top-4 left-4 md:left-8 z-10 h-16 md:h-20 w-auto animate-hue-shift" />

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
      <div className="relative z-10 container mx-auto px-4 pt-20 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-4 md:gap-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-primary text-center leading-relaxed">
              85 биомаркеров • Анализы не выходя из дома • Результат за 5 дней • Отслеживание трендов
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="block text-foreground">Ваше здоровье в цифрах,</span>
            <span className="block mt-2 bg-gradient-hero bg-clip-text text-transparent">
              динамике и рекомендациях
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Регулярно берём анализы у вас дома и предоставляем самый глубокий отчёт по системам организма, факторам риска и биологическому возрасту — в динамике и с сопровождением.
          </p>

          {/* Value bullets */}
          <div className="animate-fade-in w-full px-2 md:px-0" style={{ animationDelay: '0.3s' }}>
            <HeroBullets />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              className="text-lg px-8 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
            >
              Начать мониторинг
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
            >
              Войти в аккаунт
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}