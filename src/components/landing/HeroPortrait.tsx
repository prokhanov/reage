import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Activity,
  FlaskConical,
  Heart,
  Droplets,
  Moon,
  Sun,
} from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import heroCoupleAsset from "@/assets/landing-v2/hero-couple-v2.png.asset.json";

const heroMan = heroCoupleAsset.url;

const glass =
  "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]";

function useIsMobile() {
  const [m, setM] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  useEffect(() => {
    const u = () => setM(window.innerWidth < 640);
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  return m;
}

/* ===================== WIDGETS ===================== */

function CompactSystemsWidget() {
  const systems = [
    { label: "Сердце", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  const isMobile = useIsMobile();
  const overall = Math.round(systems.reduce((a, s) => a + s.value, 0) / systems.length);

  return (
    <div className={`${glass} p-2.5 sm:p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {isMobile ? "СИСТЕМЫ" : "Системы организма"}
        </span>
        <span className="text-[11px] font-semibold text-primary">{overall}%</span>
      </div>
      <div className="space-y-1.5">
        {systems.map((s) => {
          const Icon = s.icon;
          const color = `hsl(var(${s.token}))`;
          return (
            <div key={s.label} className="flex items-start gap-0.5 sm:gap-2">
              <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
              <span className="text-[10px] sm:text-[11px] text-foreground/90 flex-1 min-w-0 leading-tight">
                {s.label}
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 w-14 sm:w-20 lg:w-24 mt-0.5">
                <span className="text-[10px] font-semibold tabular-nums text-foreground w-5 text-left">
                  {s.value}%
                </span>
                <div className="flex-1 h-1 sm:h-1.5 bg-muted/60 rounded-full overflow-hidden">
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

function CompactBiomarkersWidget() {
  const items = [
    { name: "Витамин D", value: "62", unit: "нг/мл", status: "Оптимум", token: "--status-optimal" },
    { name: "Ферритин", value: "38", unit: "мкг/л", status: "Допустимо", token: "--status-acceptable" },
    { name: "HbA1c", value: "5.8", unit: "%", status: "Риск", token: "--status-risk" },
  ];
  const isMobile = useIsMobile();
  return (
    <div className={`${glass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {isMobile ? "БИОМАРКЕРЫ" : "Ключевые биомаркеры"}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((b) => (
          <div key={b.name} className="py-1 first:pt-0 last:pb-0">
            <div className="text-[11px] text-foreground/90 leading-tight">{b.name}</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {b.value}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">{b.unit}</span>
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

function RecommendationsWidget() {
  const items = [
    "Витамин D3 5000 МЕ — утром с жирной пищей",
    "Омега-3 (EPA/DHA) 2 г/сут — 12 недель",
    "Контроль ферритина и HbA1c через 3 мес",
  ];
  const isMobile = useIsMobile();
  return (
    <div className={`${glass} p-3`}>
      <div className="mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {isMobile ? "НАЗНАЧЕНИЯ" : "Персональные назначения"}
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
  const isMobile = useIsMobile();
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {isMobile ? "БИО. ВОЗРАСТ" : "Биологический возраст"}
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
    { icon: ShieldCheck, label: "систем организма", value: "5" },
    { icon: Activity, label: "биомаркеров", value: "100+" },
    { icon: FlaskConical, label: "анализов в год", value: "до 4х" },
  ];
  return (
    <div className="flex justify-between gap-2 sm:gap-6 lg:gap-8 w-full max-w-xl lg:max-w-none">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-start gap-1 flex-shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                {s.value}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Icon className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== LAYOUT DATA ===================== */

type WidgetId = "bioAge" | "biomarkers" | "recommendations" | "systems";
type WidgetPos = { top: number; left: number; width: number; rotate: number };
type Layout = Record<WidgetId, WidgetPos>;
type Breakpoint = "mobile" | "tablet" | "desktop";

const ARTBOARDS: Record<
  Breakpoint,
  {
    width: number;
    height: number;
    scale: number;
    man: {
      left: number;
      top?: number;
      bottom?: number;
      width: number;
      height: number;
      objectPosition: string;
    };
  }
> = {
  mobile: {
    width: 340,
    height: 440,
    scale: 0.82,
    man: { left: 50, top: 0, width: 240, height: 440, objectPosition: "50% 0" },
  },
  tablet: {
    width: 560,
    height: 500,
    scale: 1,
    man: { left: 140, bottom: 0, width: 280, height: 500, objectPosition: "50% 0" },
  },
  desktop: {
    width: 560,
    height: 640,
    scale: 1,
    man: { left: 80, bottom: 0, width: 480, height: 640, objectPosition: "50% 100%" },
  },
};

const LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    bioAge:          { top: 138, left: -15, width: 170, rotate: -2 },
    biomarkers:      { top: 139, left: 184, width: 172, rotate: 2 },
    recommendations: { top: 261, left: -30, width: 165, rotate: -1 },
    systems:         { top: 296, left: 146, width: 175, rotate: 1 },
  },
  tablet: {
    bioAge:          { top: 184, left: 39,  width: 208, rotate: -2 },
    biomarkers:      { top: 162, left: 326, width: 220, rotate: 2 },
    recommendations: { top: 331, left: 286, width: 232, rotate: -1 },
    systems:         { top: 332, left: 54,  width: 240, rotate: 1 },
  },
  desktop: {
    bioAge:          { top: 309, left: 59,  width: 216, rotate: -2 },
    biomarkers:      { top: 265, left: 314, width: 236, rotate: 2 },
    recommendations: { top: 445, left: 301, width: 244, rotate: -2 },
    systems:         { top: 463, left: 32,  width: 252, rotate: 1 },
  },
};

function renderWidget(id: WidgetId) {
  switch (id) {
    case "bioAge":
      return <CompactBioAgeWidget />;
    case "biomarkers":
      return <CompactBiomarkersWidget />;
    case "recommendations":
      return <RecommendationsWidget />;
    case "systems":
      return <CompactSystemsWidget />;
  }
}

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

/* ===================== ARTBOARD ===================== */

function Artboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  const layout = LAYOUTS[bp];

  const zMap: Record<WidgetId, number> = {
    bioAge: 20,
    biomarkers: 30,
    recommendations: 30,
    systems: 30,
  };
  const delayMap: Record<WidgetId, string> = {
    bioAge: "0.35s",
    biomarkers: "0.5s",
    recommendations: "0.8s",
    systems: "0.65s",
  };

  return (
    <div
      className="mx-auto"
      style={{ width: ab.width * ab.scale, height: ab.height * ab.scale }}
    >
      <div
        className="relative origin-top-left"
        style={{ width: ab.width, height: ab.height, transform: `scale(${ab.scale})` }}
      >
        <img
          src={heroMan}
          alt="Пара изучает персональный отчёт ReAge на смартфоне"
          className="absolute animate-fade-in pointer-events-none object-contain"
          style={{
            left: ab.man.left,
            top: ab.man.top,
            bottom: ab.man.bottom,
            width: ab.man.width,
            height: ab.man.height,
            objectPosition: ab.man.objectPosition,
            animationDelay: "0.2s",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
            transform: "translateY(-24px)",
          }}
        />
        {(Object.keys(layout) as WidgetId[]).map((id) => {
          const p = layout[id];
          return (
            <div
              key={id}
              className="absolute"
              style={{
                top: p.top,
                left: p.left,
                width: p.width,
                zIndex: zMap[id],
              }}
            >
              <div style={{ transform: `rotate(${p.rotate}deg)` }}>
                <div className="animate-fade-in" style={{ animationDelay: delayMap[id] }}>
                  {renderWidget(id)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== MAIN ===================== */

export function HeroPortrait() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const bp = useBreakpoint();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const glowStyle = {
    desktop: {
      background:
        "radial-gradient(ellipse 95% 85% at 70% 50%, hsl(210 85% 45% / 0.35) 0%, hsl(190 90% 42% / 0.15) 45%, transparent 85%)",
    },
    tablet: {
      background:
        "radial-gradient(ellipse 110% 95% at 60% 50%, hsl(210 85% 45% / 0.34) 0%, hsl(190 90% 42% / 0.14) 45%, transparent 85%)",
    },
    mobile: {
      background:
        "radial-gradient(ellipse 140% 100% at 50% 40%, hsl(210 85% 45% / 0.32) 0%, hsl(190 90% 42% / 0.12) 50%, transparent 85%)",
    },
  }[bp];

  return (
    <section className="relative overflow-hidden bg-background min-h-[70vh] flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] h-[250%] animate-[hero-glow-pulse_10s_ease-in-out_infinite]"
          style={glowStyle}
        />
      </div>

      {/* плавное затухание hero в фон следующей секции */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 sm:h-48 lg:h-56 z-[5]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.6) 55%, hsl(var(--background)) 100%)",
        }}
      />

      {mounted && (
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="fixed top-2 right-2 z-[100] p-2.5 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-lg"
          aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>
      )}

      <div className="relative z-10 container mx-auto px-4 md:px-4 lg:px-10 xl:px-16 pt-16 pb-8 md:pt-16 md:pb-8 lg:pt-16 lg:pb-10">

        <div className="flex flex-col items-center gap-2 md:gap-0 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:items-center">
          <div className="order-1 flex flex-col items-start gap-3 md:gap-3 lg:gap-6 max-w-xl w-full">
            <div className="flex items-end justify-between gap-3 w-full">
              <ThemedLogo className="h-16 sm:h-20 w-auto animate-hue-shift" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] sm:text-sm font-medium text-primary whitespace-nowrap">
                  Москва и Санкт-Петербург
                </span>
              </div>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.05] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-foreground">Ваше здоровье</span>
              <span className="block mt-0.5 sm:mt-1 lg:mt-2 bg-gradient-hero bg-clip-text text-transparent">
                в цифрах, динамике и рекомендациях
              </span>
            </h1>
            <p
              className="text-sm sm:text-base md:text-lg lg:text-lg/relaxed text-muted-foreground leading-snug sm:leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Регулярно берём анализы и предоставляем отчёт по системам организма — с динамикой
              показателей, оценкой рисков и понятными следующими шагами.
            </p>

            <div className="hidden lg:block w-full pt-1 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <StatRow />
            </div>
            <div
              className="hidden lg:flex flex-col sm:flex-row gap-3 w-full sm:w-auto lg:mt-3 animate-fade-in"
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

          <div className="order-2 relative w-full flex justify-center lg:justify-end">
            <Artboard bp={bp} />
          </div>

          <div className="order-3 lg:hidden flex flex-col items-center gap-5 w-full max-w-xl">
            <div className="w-full flex justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <StatRow />
            </div>
            <div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center animate-fade-in"
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
        </div>
      </div>
    </section>
  );
}
