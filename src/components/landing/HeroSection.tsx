import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";

// Real biomarker names from the database, with realistic sample values
const biomarkerCards: { label: string; value: string; unit: string; top?: string; left?: string; right?: string; bottom?: string; speed: number }[] = [
  // Left side — organic scattered positions
  { label: "Глюкоза", value: "4.8", unit: "ммоль/л", top: "12%", left: "2%", speed: 0.12 },
  { label: "Инсулин", value: "7.2", unit: "мкМЕ/мл", top: "26%", left: "5%", speed: 0.06 },
  { label: "Витамин B12", value: "485", unit: "пг/мл", top: "40%", left: "1%", speed: 0.15 },
  { label: "Гемоглобин", value: "142", unit: "г/л", top: "55%", left: "4%", speed: 0.09 },
  { label: "Кортизол", value: "412", unit: "нмоль/л", top: "70%", left: "2%", speed: 0.18 },
  { label: "Фолиевая кислота", value: "12.5", unit: "нг/мл", top: "84%", left: "5%", speed: 0.07 },
  // Right side — organic scattered positions
  { label: "Ферритин", value: "142", unit: "нг/мл", top: "10%", right: "3%", speed: 0.1 },
  { label: "Тиреотропный гормон", value: "2.1", unit: "мМЕ/л", top: "24%", right: "1%", speed: 0.16 },
  { label: "Общий холестерин", value: "4.9", unit: "ммоль/л", top: "38%", right: "5%", speed: 0.08 },
  { label: "Витамин D", value: "52", unit: "нг/мл", top: "52%", right: "2%", speed: 0.14 },
  { label: "Тестостерон общий", value: "18.5", unit: "нмоль/л", top: "66%", right: "4%", speed: 0.05 },
  { label: "Интерлейкин-6", value: "1.8", unit: "пг/мл", top: "80%", right: "1%", speed: 0.11 },
  // Top area
  { label: "Лейкоциты", value: "5.8", unit: "×10⁹/л", top: "4%", left: "20%", speed: 0.2 },
  { label: "Триглицериды", value: "0.9", unit: "ммоль/л", top: "6%", right: "18%", speed: 0.1 },
  // Bottom area
  { label: "Калий", value: "4.3", unit: "ммоль/л", bottom: "6%", left: "18%", speed: 0.08 },
  { label: "Железо сывороточное", value: "18.2", unit: "мкмоль/л", bottom: "8%", right: "14%", speed: 0.14 },
  { label: "Магний", value: "0.91", unit: "ммоль/л", bottom: "14%", left: "7%", speed: 0.19 },
  { label: "Селен", value: "95", unit: "мкг/л", bottom: "16%", right: "6%", speed: 0.07 },
];

export function HeroSection() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const isDark = theme === "dark";

  // Calculate section height for fade-out
  const sectionHeight = sectionRef.current?.offsetHeight ?? 800;
  const scrollProgress = Math.min(scrollY / sectionHeight, 1);

  return (
    <section ref={sectionRef} className="relative flex items-center justify-center overflow-hidden bg-background">
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

      {/* Scroll-parallax biomarker labels — desktop only */}
      {!isMobile && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {biomarkerCards.map((card, i) => {
            const ty = scrollY * card.speed;
            const opacity = Math.max(0, 0.45 - scrollProgress * 0.8);
            return (
              <div
                key={i}
                className="absolute will-change-transform"
                style={{
                  top: card.top,
                  left: card.left,
                  right: card.right,
                  bottom: card.bottom,
                  opacity,
                  transform: `translateY(${-ty}px)`,
                }}
              >
                <div className="px-2.5 py-1.5 rounded-lg bg-card/20 border border-border/10 backdrop-blur-[2px]">
                  <div className="text-[11px] font-medium text-foreground/50 leading-none">{card.label}</div>
                  <div className="text-[10px] text-muted-foreground/40 leading-none mt-1">{card.value} {card.unit}</div>
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