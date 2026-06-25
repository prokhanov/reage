import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Activity,
  FlaskConical,
  Heart,
  Droplets,
} from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import heroMan from "@/assets/landing-v2/hero-man-v2.png";

const glass =
  "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]";

/* Compact Systems — narrower, "Сердце" first, overall rating */
function CompactSystemsWidget() {
  const systems = [
    { label: "Сердце", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  const overall = Math.round(
    systems.reduce((a, s) => a + s.value, 0) / systems.length
  );
  return (
    <div className={`${glass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Системы здоровья
        </span>
        <span className="text-[11px] font-semibold text-primary">
          {overall}%
        </span>
      </div>
      <div className="space-y-1.5">
        {systems.map((s) => {
          const Icon = s.icon;
          const color = `hsl(var(${s.token}))`;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              <span className="text-[11px] text-foreground/90 flex-1 truncate">
                {s.label}
              </span>
              <div className="flex items-center gap-1.5 w-28">
                <span className="text-[10px] font-semibold tabular-nums text-foreground w-6 text-left">
                  {s.value}%
                </span>
                <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.value}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Compact Biomarkers — 3 items, 2 lines per marker */
function CompactBiomarkersWidget() {
  const items = [
    { name: "Витамин D", value: "62", unit: "нг/мл", status: "Оптимум", token: "--status-optimal" },
    { name: "Ферритин", value: "38", unit: "мкг/л", status: "Допустимо", token: "--status-acceptable" },
    { name: "HbA1c", value: "5.8", unit: "%", status: "Риск", token: "--status-risk" },
  ];
  return (
    <div className={`${glass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Ключевые биомаркеры
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((b) => (
          <div key={b.name} className="py-1 first:pt-0 last:pb-0">
            <div className="text-[11px] text-foreground/90 leading-tight">
              {b.name}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {b.value}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  {b.unit}
                </span>
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
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

/* Recommendations — tied to health systems, no AI icon */
function RecommendationsWidget() {
  const items = [
    "Витамин D3 5000 МЕ — утром с жирной пищей",
    "Омега-3 (EPA/DHA) 2 г/сут — 12 недель",
    "Контроль ферритина и HbA1c через 3 мес",
  ];
  return (
    <div className={`${glass} p-3`}>
      <div className="mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Персональные назначения
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[11px] text-foreground/85 leading-snug"
          >
            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompactBioAgeWidget() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          Биологический возраст
        </span>
        <span className="inline-flex items-center text-[10px] font-semibold text-[hsl(var(--status-optimal))] bg-[hsl(var(--status-optimal)/0.12)] px-2 py-0.5 rounded-full">
          −3.8
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl sm:text-[2.65rem] font-bold tracking-tight text-foreground leading-none">
          34.2
        </span>
        <span className="text-xs text-muted-foreground pb-1">года</span>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Хронологический</span>
        <span className="text-[10px] font-medium text-foreground">38 лет</span>
      </div>
    </div>
  );
}

function StatRow() {
  const stats = [
    { icon: ShieldCheck, label: "систем здоровья", value: "5" },
    { icon: Activity, label: "биомаркеров", value: "30+" },
    { icon: FlaskConical, label: "анализов в год", value: "4" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-md">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-start gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                {s.value}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Icon className="w-3 h-3 text-primary" />
              <span className="text-[11px] sm:text-xs leading-tight">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeroBlockPortrait() {
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
              "radial-gradient(ellipse 55% 50% at 70% 50%, hsl(220 85% 50% / 0.28) 0%, hsl(190 90% 50% / 0.15) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-8 pb-10 md:pt-10 md:pb-14">
        {/* Top-right location badge — desktop only */}
        <div className="hidden lg:flex absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 xl:right-10 items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in z-20">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">
            Москва и Санкт-Петербург
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-6 items-center">
          {/* LEFT: copy */}
          <div className="flex flex-col items-start gap-4 md:gap-5 max-w-xl">
            {/* Logo */}
            <ThemedLogo className="h-20 md:h-24 w-auto animate-hue-shift" />

            {/* Mobile badge below logo */}
            <div className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">
                Москва и Санкт-Петербург
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.05] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-foreground">Ваше здоровье в цифрах,</span>
              <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
                динамике и рекомендациях
              </span>
            </h1>

            <p
              className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Регулярно берём анализы и предоставляем отчёт по системам организма — с динамикой
              показателей, оценкой рисков и понятными следующими шагами.
            </p>

            <div className="w-full animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <StatRow />
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                size="lg"
                onClick={requestRegister}
                className="text-sm sm:text-base px-6 sm:px-7 py-5 shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Начать мониторинг
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-sm sm:text-base px-6 sm:px-7 py-5 border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:text-foreground transition-all duration-300"
              >
                Войти в аккаунт
              </Button>
            </div>
          </div>

          {/* RIGHT: STATIC artboards per breakpoint — like a fixed photo composition */}
          <div className="relative w-full flex justify-center lg:justify-end">
            {/* ===== MOBILE artboard: 340x680, shown < sm ===== */}
            <div className="sm:hidden relative" style={{ width: 340, height: 680 }}>
              <img
                src={heroMan}
                alt="Пациент изучает свой персональный отчёт ReAge"
                className="absolute animate-fade-in pointer-events-none object-contain object-bottom"
                style={{ right: -40, bottom: 0, width: 360, height: 560, animationDelay: "0.2s" }}
              />
              <div className="absolute animate-fade-in -rotate-2 z-20"
                style={{ top: 0, left: 0, width: 200, animationDelay: "0.35s" }}>
                <CompactBioAgeWidget />
              </div>
              <div className="absolute animate-fade-in rotate-2 z-30"
                style={{ top: 130, right: 0, width: 210, animationDelay: "0.5s" }}>
                <CompactBiomarkersWidget />
              </div>
              <div className="absolute animate-fade-in -rotate-1 z-30"
                style={{ top: 330, left: 0, width: 220, animationDelay: "0.8s" }}>
                <RecommendationsWidget />
              </div>
              <div className="absolute animate-fade-in rotate-1 z-30"
                style={{ bottom: 0, right: -10, width: 240, animationDelay: "0.65s" }}>
                <CompactSystemsWidget />
              </div>
            </div>

            {/* ===== TABLET artboard: 640x600, shown sm..lg ===== */}
            <div className="hidden sm:block lg:hidden relative" style={{ width: 640, height: 600 }}>
              <img
                src={heroMan}
                alt="Пациент изучает свой персональный отчёт ReAge"
                className="absolute animate-fade-in pointer-events-none object-contain object-bottom"
                style={{ right: 80, bottom: 0, width: 480, height: 600, animationDelay: "0.2s" }}
              />
              <div className="absolute animate-fade-in -rotate-2 z-20"
                style={{ top: 40, left: 0, width: 216, animationDelay: "0.35s" }}>
                <CompactBioAgeWidget />
              </div>
              <div className="absolute animate-fade-in rotate-2 z-30"
                style={{ top: 30, right: 0, width: 232, animationDelay: "0.5s" }}>
                <CompactBiomarkersWidget />
              </div>
              <div className="absolute animate-fade-in -rotate-1 z-30"
                style={{ top: 280, right: 0, width: 244, animationDelay: "0.8s" }}>
                <RecommendationsWidget />
              </div>
              <div className="absolute animate-fade-in rotate-1 z-30"
                style={{ bottom: 16, left: 0, width: 252, animationDelay: "0.65s" }}>
                <CompactSystemsWidget />
              </div>
            </div>

            {/* ===== DESKTOP artboard: 560x640, shown lg+ ===== */}
            <div className="hidden lg:block relative" style={{ width: 560, height: 640 }}>
              <img
                src={heroMan}
                alt="Пациент изучает свой персональный отчёт ReAge"
                className="absolute animate-fade-in pointer-events-none object-contain object-bottom"
                style={{ left: 80, bottom: 0, width: 480, height: 640, animationDelay: "0.2s" }}
              />
              <div className="absolute animate-fade-in -rotate-2 z-20"
                style={{ top: 230, left: -20, width: 216, animationDelay: "0.35s" }}>
                <CompactBioAgeWidget />
              </div>
              <div className="absolute animate-fade-in rotate-2 z-30"
                style={{ top: 200, right: 0, width: 236, animationDelay: "0.5s" }}>
                <CompactBiomarkersWidget />
              </div>
              <div className="absolute animate-fade-in -rotate-2 z-30"
                style={{ top: 378, right: 0, width: 244, animationDelay: "0.8s" }}>
                <RecommendationsWidget />
              </div>
              <div className="absolute animate-fade-in rotate-1 z-30"
                style={{ bottom: 20, left: -10, width: 252, animationDelay: "0.65s" }}>
                <CompactSystemsWidget />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
