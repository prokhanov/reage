import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Moon,
  Sun,
  MapPin,
  Heart,
  Activity,
  FlaskConical,
  ShieldCheck,
  Droplets,
  Sparkles,
  TrendingDown,
  CalendarDays,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";

/* ──────────────────────── Widgets ──────────────────────── */

const glass =
  "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-transform duration-300";

export function BioAgeWidget() {
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Биологический возраст
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--status-optimal))] bg-[hsl(var(--status-optimal)/0.12)] px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3" /> −3.8
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-none">
          34.2
        </span>
        <span className="text-sm text-muted-foreground pb-2">года</span>
      </div>
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Хронологический</span>
        <span className="text-xs font-medium text-foreground">38 лет</span>
      </div>
      {/* sparkline */}
      <svg viewBox="0 0 120 30" className="w-full h-7 mt-2 overflow-visible">
        <polyline
          points="0,20 24,18 48,22 72,14 96,12 120,8"
          fill="none"
          stroke="hsl(var(--status-optimal))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="120" cy="8" r="3" fill="hsl(var(--status-optimal))" />
      </svg>
    </div>
  );
}

export function SystemsWidget() {
  const systems = [
    { label: "Сердечно-сосудистая", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Системы здоровья
        </span>
        <span className="text-[11px] font-semibold text-primary">5 из 5</span>
      </div>
      <div className="space-y-2.5">
        {systems.map((s) => {
          const Icon = s.icon;
          const color = `hsl(var(${s.token}))`;
          return (
            <div key={s.label} className="flex items-center gap-2.5">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              <span className="text-xs text-foreground/90 flex-1 truncate">{s.label}</span>
              <div className="w-16 sm:w-20 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.value}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-foreground w-8 text-right">
                {s.value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BiomarkersWidget() {
  const items = [
    { name: "Витамин D", value: "62", unit: "нг/мл", status: "Оптимум", token: "--status-optimal" },
    { name: "Омега-3 индекс", value: "8.4", unit: "%", status: "Оптимум", token: "--status-optimal" },
    { name: "Ферритин", value: "38", unit: "мкг/л", status: "Допустимо", token: "--status-acceptable" },
    { name: "HbA1c", value: "5.8", unit: "%", status: "Риск", token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ключевые биомаркеры
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="w-3 h-3" /> 15 мая
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((b) => (
          <div key={b.name} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span className="text-xs sm:text-sm text-foreground/90">{b.name}</span>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                {b.value}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">{b.unit}</span>
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  color: `hsl(var(${b.token}))`,
                  backgroundColor: `hsl(var(${b.token}) / 0.12)`,
                }}
              >
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAssistantWidget() {
  const items = [
    "Витамин D3 5000 МЕ — утром с жирной пищей",
    "Омега-3 (EPA/DHA) 2 г/сут — 12 недель",
    "Контроль ферритина и HbA1c через 3 мес",
  ];
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">AI-ассистент</span>
          <span className="text-[10px] text-muted-foreground">Персональные назначения</span>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-snug">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ──────────────────────── Hero ──────────────────────── */

export function HeroBlock() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = theme === "dark";

  return (
    <section className="relative overflow-hidden bg-background min-h-[100svh] lg:min-h-[760px]">
      {/* Ambient light gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] animate-[hero-glow-pulse_8s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 42% 50%, hsl(220 85% 50% / 0.35) 0%, hsl(190 90% 50% / 0.2) 35%, transparent 65%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-1/2 w-[140%] h-[120%] animate-[hero-glow-drift_12s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 65% 30% at 55% 50%, hsl(175 80% 45% / 0.3) 0%, transparent 65%)",
          }}
        />
      </div>

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
      <div className="relative z-10 container mx-auto px-4 pt-6 pb-12 md:pt-10 md:pb-16">
        {/* Top-right location badge — desktop only */}
        <div className="hidden lg:flex absolute top-4 right-4 lg:right-20 items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in z-20">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">
            Москва и Санкт-Петербург
          </span>
        </div>

        <div className="flex justify-center lg:justify-start mb-6 md:mb-8">
          <ThemedLogo className="h-14 md:h-20 w-auto animate-hue-shift" />
        </div>

        {/* Mobile badge below logo */}
        <div className="lg:hidden flex justify-center mb-5 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Москва и Санкт-Петербург
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT — text */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 md:gap-5">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-foreground">Ваше здоровье в цифрах,</span>
              <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
                динамике и рекомендациях
              </span>
            </h1>

            <p
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              {"Регулярно берём анализы и предоставляем отчёт по системам организма:\u00a0с изменениями показателей, оценкой возможных рисков и понятными следующими шагами"}
            </p>

            <div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center lg:justify-start animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                size="lg"
                onClick={requestRegister}
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Начать мониторинг
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:text-foreground hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300"
              >
                Войти в аккаунт
              </Button>
            </div>
          </div>

          {/* RIGHT — widgets collage */}
          <div className="lg:col-span-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
              <div className="animate-fade-in lg:-translate-y-4" style={{ animationDelay: "0.15s" }}>
                <BioAgeWidget />
              </div>
              <div
                className="animate-fade-in hidden sm:block lg:translate-y-4"
                style={{ animationDelay: "0.25s" }}
              >
                <SystemsWidget />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
                <BiomarkersWidget />
              </div>
              <div
                className="animate-fade-in hidden sm:block lg:translate-y-4"
                style={{ animationDelay: "0.45s" }}
              >
                <AIAssistantWidget />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
