import { useEffect, useState, useRef, useCallback, ReactNode } from "react";
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
import heroMan from "@/assets/landing-v2/hero-man-v2.png";

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
    <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 max-w-xl lg:max-w-none">
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

/* ===================== LAYOUT DATA ===================== */

type WidgetId = "bioAge" | "biomarkers" | "recommendations" | "systems";
type WidgetPos = { top: number; left: number; width: number; rotate: number };
type Layout = Record<WidgetId, WidgetPos>;
type Breakpoint = "mobile" | "tablet" | "desktop";

const ARTBOARDS: Record<Breakpoint, { width: number; height: number; scale: number; man: { left: number; top?: number; bottom?: number; width: number; height: number; objectPosition: string } }> = {
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

const DEFAULT_LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    bioAge:         { top: 141, left: -6,  width: 170, rotate: -2 },
    biomarkers:     { top: 104, left: 190, width: 172, rotate: 2 },
    recommendations:{ top: 261, left: -30, width: 165, rotate: -1 },
    systems:        { top: 266, left: 140, width: 190, rotate: 1 },
  },
  tablet: {
    bioAge:         { top: 139, left: 4,   width: 208, rotate: -2 },
    biomarkers:     { top: 129, left: 350, width: 220, rotate: 2 },
    recommendations:{ top: 329, left: 334, width: 232, rotate: -1 },
    systems:        { top: 330, left: 27,  width: 240, rotate: 1 },
  },
  desktop: {
    bioAge:         { top: 299, left: 58,  width: 216, rotate: -2 },
    biomarkers:     { top: 200, left: 324, width: 236, rotate: 2 },
    recommendations:{ top: 402, left: 305, width: 244, rotate: -2 },
    systems:        { top: 463, left: 32,  width: 252, rotate: 1 },
  },
};

const WIDGET_LABELS: Record<WidgetId, string> = {
  bioAge: "Биовозраст",
  biomarkers: "Биомаркеры",
  recommendations: "Назначения",
  systems: "Системы",
};

const STORAGE_KEY = "heroLayoutV2";

function renderWidget(id: WidgetId) {
  switch (id) {
    case "bioAge": return <CompactBioAgeWidget />;
    case "biomarkers": return <CompactBiomarkersWidget />;
    case "recommendations": return <RecommendationsWidget />;
    case "systems": return <CompactSystemsWidget />;
  }
}

/* ===================== HOOKS ===================== */

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

function useEditMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOn(new URLSearchParams(window.location.search).get("layoutEdit") === "1");
  }, []);
  return on;
}

function loadStoredLayouts(): Partial<Record<Breakpoint, Layout>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/* ===================== EDIT-MODE ARTBOARD ===================== */

function DraggableWidget({
  id,
  pos,
  artboard,
  onChange,
  selected,
  onSelect,
}: {
  id: WidgetId;
  pos: WidgetPos;
  artboard: { width: number; height: number };
  onChange: (p: WidgetPos) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: pos.left, startTop: pos.top };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newLeft = Math.round(dragRef.current.startLeft + dx);
    const newTop = Math.round(dragRef.current.startTop + dy);
    onChange({ ...pos, left: newLeft, top: newTop });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      ref={ref}
      className="absolute touch-none cursor-move"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        transform: `rotate(${pos.rotate}deg)`,
        zIndex: selected ? 50 : 30,
        outline: selected ? "2px dashed hsl(var(--primary))" : "1px dashed hsl(var(--primary) / 0.5)",
        outlineOffset: 2,
        borderRadius: 18,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onSelect}
    >
      <div className="pointer-events-none select-none">{renderWidget(id)}</div>
      <div className="absolute -top-5 left-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
        {WIDGET_LABELS[id]}
      </div>
    </div>
  );
}

function EditPanel({
  bp,
  layout,
  setLayout,
  resetLayout,
  selected,
  setSelected,
}: {
  bp: Breakpoint;
  layout: Layout;
  setLayout: (l: Layout) => void;
  resetLayout: () => void;
  selected: WidgetId | null;
  setSelected: (id: WidgetId | null) => void;
}) {
  const copyAll = async () => {
    const all = loadStoredLayouts();
    all[bp] = layout;
    const text = JSON.stringify(all, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert("Скопировано в буфер!\n\n" + text);
    } catch {
      window.prompt("Скопируйте координаты:", text);
    }
  };

  const updateField = (id: WidgetId, field: keyof WidgetPos, v: number) => {
    setLayout({ ...layout, [id]: { ...layout[id], [field]: v } });
  };

  return (
    <div className="fixed top-2 right-2 z-[100] w-[300px] max-h-[90vh] overflow-auto rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">Edit · {bp}</div>
        <div className="flex gap-1">
          <button onClick={copyAll} className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold">
            Copy
          </button>
          <button onClick={resetLayout} className="px-2 py-1 bg-muted rounded text-[11px]">
            Reset
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {(Object.keys(layout) as WidgetId[]).map((id) => {
          const p = layout[id];
          const isSel = selected === id;
          return (
            <div
              key={id}
              className={`rounded border p-2 ${isSel ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => setSelected(id)}
            >
              <div className="font-semibold mb-1">{WIDGET_LABELS[id]}</div>
              <div className="grid grid-cols-4 gap-1">
                {(["top", "left", "width", "rotate"] as (keyof WidgetPos)[]).map((f) => (
                  <label key={f} className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase">{f}</span>
                    <input
                      type="number"
                      value={p[f]}
                      onChange={(e) => updateField(id, f, Number(e.target.value))}
                      className="w-full bg-muted rounded px-1 py-0.5 text-[11px] tabular-nums"
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground leading-snug">
        Тяните карточки мышью или меняйте числа. «Copy» копирует JSON по всем брейкпойнтам, которые вы редактировали.
      </div>
    </div>
  );
}

function EditArtboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  const stored = loadStoredLayouts()[bp];
  const [layout, setLayout] = useState<Layout>(stored ?? DEFAULT_LAYOUTS[bp]);
  const [selected, setSelected] = useState<WidgetId | null>(null);

  useEffect(() => {
    // reset layout if breakpoint changes
    const s = loadStoredLayouts()[bp];
    setLayout(s ?? DEFAULT_LAYOUTS[bp]);
  }, [bp]);

  const persist = useCallback((l: Layout) => {
    setLayout(l);
    const all = loadStoredLayouts();
    all[bp] = l;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [bp]);

  const resetLayout = () => {
    const all = loadStoredLayouts();
    delete all[bp];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setLayout(DEFAULT_LAYOUTS[bp]);
  };

  return (
    <>
      <div
        className="mx-auto"
        style={{ width: ab.width * ab.scale, height: ab.height * ab.scale }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: ab.width,
            height: ab.height,
            transform: `scale(${ab.scale})`,
            outline: "1px dashed hsl(var(--primary) / 0.4)",
          }}
        >
          <img
            src={heroMan}
            alt=""
            className="absolute pointer-events-none object-contain"
            style={{
              left: ab.man.left,
              top: ab.man.top,
              bottom: ab.man.bottom,
              width: ab.man.width,
              height: ab.man.height,
              objectPosition: ab.man.objectPosition,
            }}
          />
          {(Object.keys(layout) as WidgetId[]).map((id) => (
            <DraggableWidget
              key={id}
              id={id}
              pos={layout[id]}
              artboard={{ width: ab.width, height: ab.height }}
              onChange={(p) => persist({ ...layout, [id]: p })}
              selected={selected === id}
              onSelect={() => setSelected(id)}
            />
          ))}
        </div>
      </div>
      <EditPanel
        bp={bp}
        layout={layout}
        setLayout={persist}
        resetLayout={resetLayout}
        selected={selected}
        setSelected={setSelected}
      />
    </>
  );
}

/* ===================== VIEW (static) ARTBOARD ===================== */

function StaticArtboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  // Static view всегда использует захардкоженные дефолты, чтобы не зависеть от localStorage edit-режима
  const layout = DEFAULT_LAYOUTS[bp];

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
          alt="Пациент изучает свой персональный отчёт ReAge"
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
              {/* 3 уровня: position / rotate / animate — иначе keyframe translateY перетирает inline rotate */}
              <div style={{ transform: `rotate(${p.rotate}deg)` }}>
                <div
                  className="animate-fade-in"
                  style={{ animationDelay: delayMap[id] }}
                >
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

export function HeroBlockPortrait({ editMode: editModeProp }: { editMode?: boolean }) {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const bp = useBreakpoint();
  const urlEditMode = useEditMode();
  const editMode = editModeProp ?? urlEditMode;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const ArtboardComp = editMode ? EditArtboard : StaticArtboard;

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
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] h-[250%] animate-[hero-glow-pulse_10s_ease-in-out_infinite]"
          style={glowStyle}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-4 lg:px-10 xl:px-16 pt-6 pb-8 md:pt-6 md:pb-8 lg:pt-8 lg:pb-10">
        <div className="flex absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 xl:right-10 items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in z-30">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] sm:text-sm font-medium text-primary">
            Сервис доступен в Москве и Санкт-Петербурге
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 md:gap-0 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:items-center">
          <div className="order-1 flex flex-col items-start gap-3 md:gap-3 lg:gap-6 max-w-xl w-full">
            <ThemedLogo className="h-16 sm:h-20 w-auto animate-hue-shift" />
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.05] tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-white">Ваше здоровье</span>
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
            <ArtboardComp bp={bp} />
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
