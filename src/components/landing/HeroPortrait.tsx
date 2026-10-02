import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Activity, FlaskConical, Heart, Droplets, CalendarCheck, Check } from "lucide-react";
import heroManAvif from "@/assets/landing-v2/hero-couple-v9.webp?format=avif&quality=68&url";
import heroMan from "@/assets/landing-v2/hero-couple-v9.webp?url";
import { SmartPicture } from "@/components/landing/SmartPicture";

const glass =
  "hero-glass-card rounded-2xl";

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
    <div className={`${glass} p-3.5`}>
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
        <span className="text-[10px] text-muted-foreground">Реальный</span>
        <span className="text-[10px] font-medium text-foreground">38 лет</span>
      </div>
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

// Раскладка карточек для тестовой главной /main: выше по фото, группа центрирована.
const LAYOUTS_MAIN_NEW: Partial<Record<Breakpoint, Partial<Layout>>> = {
  desktop: {
    bioAge:         { top: 170, left: 92,  width: 216, rotate: -2 },
    biomarkers:     { top: 164, left: 316, width: 236, rotate: 2 },
    recommendations:{ top: 322, left: 312, width: 244, rotate: -2 },
    systems:        { top: 328, left: 48,  width: 252, rotate: 1 },
  },
};

// Артборд для /main: выше — люди подняты, низ блока обрезан по краю фото.
const ARTBOARDS_MAIN_NEW: Partial<Record<Breakpoint, Partial<(typeof ARTBOARDS)[Breakpoint]>>> = {
  desktop: {
    height: 780,
    man: { left: 0, bottom: 0, width: 560, height: 780, objectPosition: "50% 100%" },
  },
};

const LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    bioAge:         { top: 138, left: -15, width: 170, rotate: -2 },
    biomarkers:     { top: 139, left: 184, width: 172, rotate: 2 },
    recommendations:{ top: 261, left: -30, width: 165, rotate: -1 },
    systems:        { top: 296, left: 146, width: 175, rotate: 1 },
  },
  tablet: {
    bioAge:         { top: 184, left: 39,  width: 208, rotate: -2 },
    biomarkers:     { top: 162, left: 326, width: 220, rotate: 2 },
    recommendations:{ top: 331, left: 286, width: 232, rotate: -1 },
    systems:        { top: 332, left: 54,  width: 240, rotate: 1 },
  },
  desktop: {
    bioAge:         { top: 309, left: 59,  width: 216, rotate: -2 },
    biomarkers:     { top: 303, left: 311, width: 236, rotate: 2 },
    recommendations:{ top: 457, left: 300, width: 244, rotate: -2 },
    systems:        { top: 463, left: 32,  width: 252, rotate: 1 },
  },
};

function renderWidget(id: WidgetId) {
  switch (id) {
    case "bioAge": return <CompactBioAgeWidget />;
    case "biomarkers": return <CompactBiomarkersWidget />;
    case "recommendations": return <RecommendationsWidget />;
    case "systems": return <CompactSystemsWidget />;
  }
}

export function useBreakpoint(): Breakpoint {
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

export function Artboard({ bp, isDark, plain = false, layoutVariant }: { bp: Breakpoint; isDark: boolean; plain?: boolean; layoutVariant?: "mainNew" }) {
  const ab = { ...ARTBOARDS[bp], ...(layoutVariant === "mainNew" ? ARTBOARDS_MAIN_NEW[bp] ?? {} : {}) };
  const layout: Layout = { ...LAYOUTS[bp], ...(layoutVariant === "mainNew" ? LAYOUTS_MAIN_NEW[bp] ?? {} : {}) };

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
        <SmartPicture
          avif={heroManAvif}
          src={heroMan}
          alt="Пара изучает персональный отчёт ReAge на смартфоне"
          width={1600}
          height={1600}
          fetchpriority="high"
          decoding="async"
          className="absolute animate-fade-in pointer-events-none object-contain"
          style={{
            left: ab.man.left,
            top: ab.man.top,
            bottom: ab.man.bottom,
            width: ab.man.width,
            height: ab.man.height,
            objectPosition: ab.man.objectPosition,
            animationDelay: "0.2s",
            ...(plain
              ? {}
              : {
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
                  maskImage: "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
                  transform: "translateY(-24px)",
                }),
          }}
        />
        {(Object.keys(layout) as WidgetId[]).map((id) => {
          const p = layout[id];
          const backdropImageHeight = ab.man.height;
          const backdropImageWidth = backdropImageHeight * (848 / 1264);
          const backdropLeft = ab.man.left + (ab.man.width - backdropImageWidth) / 2;
          const backdropTop = ab.man.top ?? ab.height - ab.man.bottom! - ab.man.height;
          const glassBackdropStyle = {
            "--hero-glass-backdrop-image": `url(${heroMan})`,
            "--hero-glass-backdrop-size": `${backdropImageWidth}px ${backdropImageHeight}px`,
            "--hero-glass-backdrop-position": `${backdropLeft - p.left}px ${backdropTop - p.top - 24}px`,
            "--hero-glass-backdrop-opacity": isDark ? 0.52 : 0.46,
          } as CSSProperties;
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
                <div className="animate-fade-in" style={{ animationDelay: delayMap[id], ...glassBackdropStyle }}>
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

const LEAD_BULLETS = [
  "Регулярно проверяем весь организм",
  "Отслеживаем динамику показателей",
  "Даём понятный план действий",
];

export function HeroPortrait() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const bp = useBreakpoint();

  const isDark = theme === "dark";

  const visual = <Artboard bp={bp} isDark={isDark} />;

  return (
    <section className="relative overflow-hidden border-b hairline bg-background lg:min-h-[640px] xl:min-h-[700px]">
      {/* Визуал: на десктопе — справа абсолютом, на мобильном — под кнопкой (в потоке ниже) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] items-end justify-center lg:flex">
        {visual}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-2 pt-8 sm:px-6 sm:pt-10 lg:pb-20 lg:pt-20">
        <div className="flex flex-col items-center text-center lg:w-[48%] lg:items-start lg:pr-8 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
            <CalendarCheck className="h-4 w-4 text-primary" aria-hidden />
            Сервис мониторинга здоровья
          </span>
          <h1 className="font-display mt-4 text-balance text-[2.1rem] leading-[1.1] text-foreground sm:text-[2.75rem] xl:text-[3.4rem]">
            Ваше здоровье в цифрах, динамике и рекомендациях
          </h1>
          <p className="font-display mt-2 text-balance text-xl leading-snug text-muted-foreground sm:text-2xl xl:text-[1.75rem]">
            Берём на себя контроль вашего здоровья
          </p>
          <ul className="mx-auto mt-4 flex max-w-md flex-col items-center space-y-2 text-base text-muted-foreground sm:mt-5 sm:text-lg lg:mx-0 lg:max-w-none lg:items-stretch">
            {LEAD_BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span className="text-left">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 lg:items-start">
            <p className="text-sm text-muted-foreground sm:text-base">
              100+ биомаркеров · Биологический возраст · Дашборды и тренды
            </p>

            <div className="flex w-full max-w-md flex-col gap-3">
              <Button
                size="lg"
                onClick={() => window.dispatchEvent(new CustomEvent("open-feedback-dialog"))}
                className="h-[52px] w-full gap-2 text-base sm:h-12"
              >
                Записаться на бесплатную консультацию
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/register")}
                className="h-[52px] w-full gap-2 text-base sm:h-12"
              >
                Посмотреть демо-аккаунт
              </Button>
            </div>
          </div>
        </div>

        {/* Визуал на мобильном — после CTA */}
        <div className="relative mt-7 flex justify-center lg:hidden">
          {visual}
        </div>
      </div>
    </section>
  );
}
