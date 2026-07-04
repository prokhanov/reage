import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Moon, Sun, Check, RefreshCw, Link, HeartPulse, ScanLine } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";
import heroMan from "@/assets/landing-v2/hero-couple-v4.png";

const glass =
  "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]";

function HealthDynamicsWidget() {
  const items = [
    "Биологический возраст",
    "Риски и предрасположенности",
    "Ключевые системы организма",
    "Тренды и изменения",
    "Персональные рекомендации",
  ];

  const points = [20, 45, 38, 52, 48, 68, 62, 78];
  const width = 200;
  const height = 52;
  const padX = 8;
  const padY = 6;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const x = (i: number) => padX + (i / (points.length - 1)) * chartW;
  const y = (v: number) => padY + chartH - ((v - min) / range) * chartH;

  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");

  const area = `${path} L ${x(points.length - 1)} ${height} L ${padX} ${height} Z`;

  return (
    <div className={`${glass} p-3 sm:p-4`}>
      <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug mb-2">
        Ваше здоровье
        <br />
        в динамике
      </h3>
      <ul className="space-y-1.5 mb-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 shrink-0">
              <Check className="w-2.5 h-2.5 text-primary" />
            </span>
            <span className="text-[11px] sm:text-xs text-foreground/85 leading-snug">
              {item}
            </span>
          </li>
        ))}
      </ul>
      <div className="w-full h-[52px] sm:h-[60px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="healthLineArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#healthLineArea)" />
          <path
            d={path}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((v, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r="2.5"
              fill="hsl(var(--primary))"
              className="opacity-80"
            />
          ))}
        </svg>
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
          <div
            key={s.label}
            className="flex flex-col items-center lg:items-start gap-1 flex-shrink-0"
          >
            <Icon className="w-3 h-3 text-primary shrink-0 lg:hidden mb-0.5" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                {s.value}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Icon className="w-3 h-3 text-primary shrink-0 hidden lg:block" />
              <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== LAYOUT DATA ===================== */

type WidgetId = "healthDynamics";
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
    man: { left: 30, bottom: 0, width: 300, height: 354, objectPosition: "50% 100%" },
  },
  tablet: {
    width: 560,
    height: 500,
    scale: 1,
    man: { left: 90, bottom: 0, width: 400, height: 471, objectPosition: "50% 100%" },
  },
  desktop: {
    width: 560,
    height: 640,
    scale: 1,
    man: { left: 30, bottom: 0, width: 520, height: 613, objectPosition: "50% 100%" },
  },
};

const LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    healthDynamics: { top: 125, left: 273, width: 170, rotate: 0 },
  },
  tablet: {
    healthDynamics: { top: 145, left: 460, width: 220, rotate: 0 },
  },
  desktop: {
    healthDynamics: { top: 180, left: 477, width: 255, rotate: 0 },
  },
};

function renderWidget(id: WidgetId) {
  switch (id) {
    case "healthDynamics":
      return <HealthDynamicsWidget />;
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
    healthDynamics: 30,
  };
  const delayMap: Record<WidgetId, string> = {
    healthDynamics: "0.55s",
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
        <>
          <div className="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-40 flex items-center justify-between gap-2 pointer-events-none">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-lg shrink-0"
              aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-foreground" />
              )}
            </button>

            <div className="pointer-events-auto h-10 inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] sm:text-sm font-medium text-primary whitespace-nowrap">
                Москва и Санкт-Петербург
              </span>
            </div>

            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="pointer-events-auto h-10 inline-flex items-center gap-1.5 px-3 sm:px-4 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-neon-primary shadow-lg hover:scale-[1.03] transition-all duration-300 shrink-0"
            >
              Начать мониторинг
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          </div>
        </>
      )}

      <div className="relative z-10 container mx-auto px-4 md:px-4 lg:px-10 xl:px-16 pt-16 pb-8 md:pt-16 md:pb-8 lg:pt-16 lg:pb-10">
        <div className="flex flex-col items-center gap-2 md:gap-0 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:items-center">
          <div className="order-1 flex flex-col items-center lg:items-start gap-3 md:gap-3 lg:gap-6 max-w-xl w-full text-center lg:text-left">
            <ThemedLogo className="h-12 sm:h-16 lg:h-32 w-auto animate-hue-shift mx-auto lg:mx-0" />
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.1] tracking-tight animate-fade-in text-center lg:text-left"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="text-foreground">Ваше здоровье</span>
              <br />
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                в цифрах, динамике и рекомендациях
              </span>
            </h1>
            <p
              className="text-sm sm:text-base md:text-lg lg:text-lg/relaxed text-muted-foreground leading-snug sm:leading-relaxed animate-fade-in text-center lg:text-left"
              style={{ animationDelay: "0.2s" }}
            >
              Регулярно берём анализы и составляем отчёт по состоянию вашего здоровья — с оценкой рисков и
              понятными следующими шагами.
            </p>

            <ul
              className="flex flex-wrap lg:flex-nowrap justify-center lg:justify-between gap-3 lg:gap-4 w-full animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              {[
                {
                  icon: ScanLine,
                  text: "Глубокая оценка ключевых процессов организма",
                },
                {
                  icon: RefreshCw,
                  text: "Регулярный мониторинг и динамика",
                },
                {
                  icon: Link,
                  text: "Персональные рекомендации и план действий",
                },
                {
                  icon: HeartPulse,
                  text: "Поддержка врача на каждом этапе",
                },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 sm:gap-3 max-w-[48%] lg:max-w-[25%]">
                  <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/15 shrink-0">
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </span>
                  <span className="text-[11px] sm:text-xs lg:text-sm text-foreground/80 leading-snug text-left">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

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
                Посмотреть демо-аккаунт
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
                Посмотреть демо-аккаунт
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
