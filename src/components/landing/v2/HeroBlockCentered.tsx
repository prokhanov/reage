import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MapPin,
  Sparkles,
  TrendingDown,
  Activity,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import heroMan from "@/assets/landing-v2/hero-man-v2.png";

const glass =
  "rounded-2xl border border-border/50 bg-card/70 backdrop-blur-xl shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.5)]";

/* ── Floating widgets ── */

function BioAgeFloat() {
  return (
    <div className={`${glass} p-4 w-[230px]`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Биовозраст
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--status-optimal))] bg-[hsl(var(--status-optimal)/0.12)] px-1.5 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3" /> −3.8
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-foreground leading-none">
          34.2
        </span>
        <span className="text-[11px] text-muted-foreground pb-1">года</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Хронологический</span>
        <span className="font-medium text-foreground">38 лет</span>
      </div>
      <svg viewBox="0 0 120 24" className="w-full h-5 mt-1.5 overflow-visible">
        <polyline
          points="0,18 24,16 48,19 72,12 96,10 120,6"
          fill="none"
          stroke="hsl(var(--status-optimal))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="120" cy="6" r="2.5" fill="hsl(var(--status-optimal))" />
      </svg>
    </div>
  );
}

function BiomarkersFloat() {
  const items = [
    { name: "Витамин D", value: "62", unit: "нг/мл", token: "--status-optimal" },
    { name: "Омега-3", value: "8.4", unit: "%", token: "--status-optimal" },
    { name: "Ферритин", value: "38", unit: "мкг/л", token: "--status-acceptable" },
    { name: "HbA1c", value: "5.8", unit: "%", token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-4 w-[240px]`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Биомаркеры
        </span>
        <span className="text-[10px] text-muted-foreground">15 мая</span>
      </div>
      <div className="space-y-1.5">
        {items.map((b) => (
          <div key={b.name} className="flex items-center justify-between">
            <span className="text-[11px] text-foreground/90">{b.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                {b.value}
                <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">
                  {b.unit}
                </span>
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(var(${b.token}))` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIChip() {
  return (
    <div className={`${glass} p-2.5 pr-3.5 inline-flex items-center gap-2.5`}>
      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold text-foreground">AI-ассистент</span>
        <span className="text-[10px] text-muted-foreground">персональные назначения</span>
      </div>
    </div>
  );
}

/* ── Bottom stat row ── */

function StatRow() {
  const stats = [
    { icon: ShieldCheck, label: "систем здоровья", value: "5" },
    { icon: Activity, label: "биомаркеров", value: "30+" },
    { icon: FlaskConical, label: "анализов в год", value: "4" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-center text-center gap-1">
            <div className="flex items-center gap-1.5 text-primary">
              <Icon className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {s.value}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hero ── */

export function HeroBlockCentered() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] animate-[hero-glow-pulse_10s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 50% 55%, hsl(220 85% 50% / 0.3) 0%, hsl(190 90% 50% / 0.18) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-6 pb-10 md:pt-8 md:pb-14">
        {/* Logo */}
        <div className="flex justify-center lg:justify-start mb-6 md:mb-8">
          <ThemedLogo className="h-10 md:h-12 w-auto animate-hue-shift" />
        </div>

        {/* Two-column hero */}
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-6 items-center">
          {/* LEFT: copy */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 md:gap-5 max-w-xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">
                Москва и Санкт-Петербург
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.04] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-foreground">Ваше здоровье в цифрах,</span>
              <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
                динамике и рекомендациях
              </span>
            </h1>

            <p
              className="text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Регулярно берём анализы и предоставляем отчёт по системам организма — с динамикой
              показателей, оценкой рисков и понятными следующими шагами.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-in mt-1"
              style={{ animationDelay: "0.3s" }}
            >
              <Button
                size="lg"
                onClick={requestRegister}
                className="text-base px-7 py-5 shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Начать мониторинг
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-base px-7 py-5 border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:text-foreground transition-all duration-300"
              >
                Войти в аккаунт
              </Button>
            </div>

            {/* Stat row under copy */}
            <div className="w-full mt-6 md:mt-8 animate-fade-in" style={{ animationDelay: "0.55s" }}>
              <StatRow />
            </div>
          </div>

          {/* RIGHT: person + overlapping widgets */}
          <div
            className="relative w-full max-w-[520px] mx-auto lg:mx-0 lg:ml-auto animate-fade-in"
            style={{ animationDelay: "0.35s" }}
          >
            {/* halo */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] blur-3xl pointer-events-none -z-10"
              style={{
                background:
                  "radial-gradient(ellipse 55% 55% at 50% 50%, hsl(190 90% 50% / 0.5), hsl(220 85% 50% / 0.22) 50%, transparent 75%)",
              }}
            />

            <div className="relative aspect-[3/4]">
              <img
                src={heroMan}
                alt="Здоровый и довольный пациент ReAge"
                className="absolute inset-0 w-full h-full object-contain object-bottom drop-shadow-[0_30px_60px_hsl(var(--primary)/0.4)]"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />

              {/* Floating widgets overlapping the person — desktop & tablet */}
              <div className="hidden sm:block">
                <div
                  className="absolute -left-4 lg:-left-10 top-[12%] animate-fade-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <BioAgeFloat />
                </div>
                <div
                  className="absolute -right-4 lg:-right-8 top-[38%] animate-fade-in"
                  style={{ animationDelay: "0.6s" }}
                >
                  <BiomarkersFloat />
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-[6%] animate-fade-in"
                  style={{ animationDelay: "0.7s" }}
                >
                  <AIChip />
                </div>
              </div>
            </div>

            {/* Mobile widgets row */}
            <div className="sm:hidden mt-5 grid grid-cols-1 gap-3 [&>*]:!w-full">
              <BioAgeFloat />
              <BiomarkersFloat />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

