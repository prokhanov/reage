import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { HeroBullets } from "@/components/landing/HeroMetricsMarquee";



export function HeroSection() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = theme === "dark";

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
      <div className="relative z-10 container mx-auto px-4 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-4 md:gap-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-primary text-center leading-relaxed">
              85+ биомаркеров • Комплексная диагностика • Тренды здоровья • Биологический возраст
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight animate-fade-in"
            style={{ animationDelay: '0.1s' }}>
            
            <span className="block text-foreground">Ваше здоровье в цифрах,</span>
            <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
              динамике и рекомендациях
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-5xl mx-auto leading-relaxed animate-fade-in whitespace-pre-line"
            style={{ animationDelay: '0.2s' }}>
            {"Регулярно берём анализы у вас дома и предоставляем комплексный отчёт\nпо системам организма - с динамикой и рекомендацией врача"}
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