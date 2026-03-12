import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";

// Real biomarker names from the database, with realistic sample values
// Real biomarker names, sample values, trend direction, and rotation for organic feel
const biomarkerCards: {label: string;value: string;unit: string;top?: string;left?: string;right?: string;bottom?: string;speed: number;rotate: number;trend: "up" | "down" | "stable";status: "good" | "bad";}[] = [
// Left side
{ label: "Глюкоза", value: "4.8", unit: "ммоль/л", top: "12%", left: "2%", speed: 0.12, rotate: -3, trend: "stable", status: "good" },
{ label: "Инсулин", value: "7.2", unit: "мкМЕ/мл", top: "28%", left: "5%", speed: 0.06, rotate: 4, trend: "down", status: "good" },
{ label: "Витамин B12", value: "485", unit: "пг/мл", top: "42%", left: "1%", speed: 0.15, rotate: -6, trend: "up", status: "good" },
{ label: "Гемоглобин", value: "142", unit: "г/л", top: "57%", left: "4%", speed: 0.09, rotate: 2, trend: "stable", status: "good" },
{ label: "Кортизол", value: "612", unit: "нмоль/л", top: "72%", left: "2%", speed: 0.18, rotate: -5, trend: "up", status: "bad" },
{ label: "Фолиевая кислота", value: "4.1", unit: "нг/мл", top: "86%", left: "5%", speed: 0.07, rotate: 3, trend: "down", status: "bad" },
// Right side
{ label: "Ферритин", value: "142", unit: "нг/мл", top: "10%", right: "3%", speed: 0.1, rotate: 5, trend: "up", status: "good" },
{ label: "Тиреотропный гормон", value: "2.1", unit: "мМЕ/л", top: "26%", right: "1%", speed: 0.16, rotate: -4, trend: "stable", status: "good" },
{ label: "Общий холестерин", value: "6.2", unit: "ммоль/л", top: "40%", right: "5%", speed: 0.08, rotate: 3, trend: "up", status: "bad" },
{ label: "Витамин D", value: "52", unit: "нг/мл", top: "54%", right: "2%", speed: 0.14, rotate: -7, trend: "up", status: "good" },
{ label: "Тестостерон общий", value: "18.5", unit: "нмоль/л", top: "68%", right: "4%", speed: 0.05, rotate: 2, trend: "down", status: "bad" },
{ label: "Интерлейкин-6", value: "1.8", unit: "пг/мл", top: "82%", right: "1%", speed: 0.11, rotate: -3, trend: "stable", status: "good" },
// Top area
{ label: "Лейкоциты", value: "5.8", unit: "×10⁹/л", top: "4%", left: "20%", speed: 0.2, rotate: 6, trend: "stable", status: "good" },
{ label: "Триглицериды", value: "1.9", unit: "ммоль/л", top: "6%", right: "18%", speed: 0.1, rotate: -5, trend: "up", status: "bad" },
// Bottom area
{ label: "Калий", value: "4.3", unit: "ммоль/л", bottom: "6%", left: "18%", speed: 0.08, rotate: 4, trend: "stable", status: "good" },
{ label: "Железо сывороточное", value: "18.2", unit: "мкмоль/л", bottom: "8%", right: "14%", speed: 0.14, rotate: -6, trend: "down", status: "good" },
{ label: "Магний", value: "0.72", unit: "ммоль/л", bottom: "16%", left: "7%", speed: 0.19, rotate: 3, trend: "down", status: "bad" },
{ label: "Селен", value: "95", unit: "мкг/л", bottom: "18%", right: "6%", speed: 0.07, rotate: -4, trend: "up", status: "good" }];


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
            background: 'radial-gradient(ellipse 80% 40% at 42% 50%, hsl(220 85% 50% / 0.35) 0%, hsl(190 90% 50% / 0.2) 35%, transparent 65%)'
          }} />
        
        <div
          className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-1/2 w-[140%] h-[120%] animate-[hero-glow-drift_12s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(ellipse 65% 30% at 55% 50%, hsl(175 80% 45% / 0.3) 0%, transparent 65%)'
          }} />
        
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[80%] animate-[hero-glow-pulse_6s_ease-in-out_infinite_reverse]"
          style={{
            background: 'radial-gradient(ellipse 50% 20% at 48% 50%, hsl(200 90% 65% / 0.2) 0%, transparent 60%)'
          }} />
        
      </div>

      {/* Scroll-parallax biomarker labels — desktop only */}
      {!isMobile &&
      <div className="absolute inset-0 pointer-events-none z-[5]">
          {biomarkerCards.map((card, i) => {
          const ty = scrollY * card.speed;
          const opacity = Math.max(0, 0.5 - scrollProgress * 0.8);
          const isGood = card.status === "good";
          const TrendIcon = card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : Minus;
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
                transform: `translateY(${-ty}px) rotate(${card.rotate}deg)`
              }}>
              
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/30 border border-border/20 backdrop-blur-md">
                  <div className="text-left">
                    <div className="text-xs font-semibold text-foreground/60 leading-none">{card.label}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] font-medium leading-none ${isGood ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {card.value} {card.unit}
                      </span>
                      <TrendIcon className={`w-3 h-3 ${isGood ? "text-emerald-400/60" : "text-red-400/60"}`} />
                    </div>
                  </div>
                </div>
              </div>);

        })}
        </div>
      }

      {/* Logo - top left */}
      <ThemedLogo className="absolute top-4 left-4 md:left-8 z-10 h-16 md:h-20 w-auto animate-hue-shift" />

      {/* Theme Toggle */}
      {mounted &&
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-lg"
        aria-label={isDark ? "Светлая тема" : "Тёмная тема"}>
        
          {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
        </button>
      }

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
            style={{ animationDelay: '0.1s' }}>
            
            <span className="block text-foreground">Ваше здоровье в цифрах,</span>
            <span className="block mt-2 bg-gradient-hero bg-clip-text text-transparent">
              динамике и рекомендациях
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: '0.2s' }}>
            
            Регулярно берём анализы у вас дома и предоставляем комплексный отчёт по системам организма, факторам риска и биологическому возрасту — в динамике и с сопровождением
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
              className="text-lg px-8 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group">
              
              Начать мониторинг
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300">
              
              Войти в аккаунт
            </Button>
          </div>
        </div>
      </div>
    </section>);

}