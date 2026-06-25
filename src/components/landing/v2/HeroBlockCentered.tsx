import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
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
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import heroMan from "@/assets/landing-v2/hero-man.png";

const glass =
  "rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-transform duration-300";

function BioAgeWidget() {
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Биовозраст
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--status-optimal))] bg-[hsl(var(--status-optimal)/0.12)] px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3" /> −3.8
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-none">
          34.2
        </span>
        <span className="text-xs text-muted-foreground pb-1.5">года</span>
      </div>
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Хронологический</span>
        <span className="text-[11px] font-medium text-foreground">38 лет</span>
      </div>
      <svg viewBox="0 0 120 30" className="w-full h-6 mt-2 overflow-visible">
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

function BiomarkersWidget() {
  const items = [
    { name: "Витамин D", value: "62", unit: "нг/мл", status: "Оптимум", token: "--status-optimal" },
    { name: "Омега-3", value: "8.4", unit: "%", status: "Оптимум", token: "--status-optimal" },
    { name: "Ферритин", value: "38", unit: "мкг/л", status: "Допустимо", token: "--status-acceptable" },
    { name: "HbA1c", value: "5.8", unit: "%", status: "Риск", token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Биомаркеры
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarDays className="w-3 h-3" /> 15 мая
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((b) => (
          <div key={b.name} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
            <span className="text-xs text-foreground/90">{b.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {b.value}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{b.unit}</span>
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `hsl(var(${b.token}))` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemsWidget() {
  const systems = [
    { label: "Сердечно-сосудистая", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Системы здоровья
        </span>
        <span className="text-[10px] font-semibold text-primary">5 из 5</span>
      </div>
      <div className="space-y-2">
        {systems.map((s) => {
          const Icon = s.icon;
          const color = `hsl(var(${s.token}))`;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              <span className="text-[11px] text-foreground/90 flex-1 truncate">{s.label}</span>
              <div className="w-14 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.value}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-foreground w-7 text-right">
                {s.value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIAssistantWidget() {
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
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-foreground/85 leading-snug">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HeroBlockCentered() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] animate-[hero-glow-pulse_8s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 45%, hsl(220 85% 50% / 0.28) 0%, hsl(190 90% 50% / 0.16) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-4 pb-8 md:pt-6 md:pb-10">
        {/* Logo */}
        <div className="flex justify-center mb-4 md:mb-6">
          <ThemedLogo className="h-12 md:h-16 w-auto animate-hue-shift" />
        </div>

        {/* TOP — centered text */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3 md:gap-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Сервис доступен в Москве и Санкт-Петербурге
            </span>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="block text-foreground">Ваше здоровье в цифрах,</span>
            <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
              динамике и рекомендациях
            </span>
          </h1>

          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            {"Регулярно берём анализы и предоставляем отчёт по системам организма:\u00a0с изменениями показателей, оценкой возможных рисков и понятными следующими шагами"}
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center animate-fade-in"
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

        {/* BOTTOM — 3-col: widgets | portrait | widgets */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-end">
          {/* LEFT column */}
          <div className="lg:col-span-3 flex flex-col gap-4 md:gap-5 order-2 lg:order-1">
            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <BioAgeWidget />
            </div>
            <div className="animate-fade-in hidden lg:block" style={{ animationDelay: "0.4s" }}>
              <SystemsWidget />
            </div>
          </div>

          {/* CENTER — portrait */}
          <div className="lg:col-span-6 order-1 lg:order-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative mx-auto max-w-xs sm:max-w-sm lg:max-w-md">
              {/* halo glow */}
              <div
                className="absolute inset-0 -z-10 blur-3xl opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 60% at 50% 45%, hsl(190 90% 50% / 0.35), transparent 70%)",
                }}
              />
              <div className="relative aspect-[4/5]">
                <img
                  src={heroMan}
                  alt="Здоровый и довольный пациент ReAge"
                  className="absolute inset-0 w-full h-full object-contain object-bottom drop-shadow-[0_30px_60px_hsl(var(--primary)/0.35)]"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="lg:col-span-3 flex flex-col gap-4 md:gap-5 order-3">
            <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <BiomarkersWidget />
            </div>
            <div className="animate-fade-in hidden lg:block" style={{ animationDelay: "0.45s" }}>
              <AIAssistantWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
