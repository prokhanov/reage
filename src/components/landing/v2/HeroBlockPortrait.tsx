import { useEffect, useState, useRef, useCallback, ReactNode } from "react";
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

/* ===================== WIDGETS ===================== */

function CompactSystemsWidget() {
  const systems = [
    { label: "Сердце", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  const overall = Math.round(systems.reduce((a, s) => a + s.value, 0) / systems.length);
  return (
    <div className={`${glass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Системы здоровья
        </span>
        <span className="text-[11px] font-semibold text-primary">{overall}%</span>
      </div>
      <div className="space-y-1.5">
        {systems.map((s) => {
          const Icon = s.icon;
          const color = `hsl(var(${s.token}))`;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              <span className="text-[11px] text-foreground/90 flex-1 truncate">{s.label}</span>
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
    man: { left: 140, bottom: 0, width: 280, height: 500, objectPosition: "50% 100%" },
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
    bioAge:         { top: 160, left: -8,  width: 170, rotate: -2 },
    biomarkers:     { top: 160, left: 178, width: 172, rotate: 2 },
    recommendations:{ top: 276, left: -26, width: 165, rotate: -1 },
    systems:        { top: 319, left: 159, width: 175, rotate: 1 },
  },
  tablet: {
    bioAge:         { top: 211, left: 16,  width: 208, rotate: -2 },
    biomarkers:     { top: 145, left: 341, width: 220, rotate: 2 },
    recommendations:{ top: 330, left: 325, width: 232, rotate: -1 },
    systems:        { top: 353, left: 84,  width: 240, rotate: 1 },
  },
  desktop: {
    bioAge:         { top: 306, left: 44,  width: 216, rotate: -2 },
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
  const stored = loadStoredLayouts()[bp];
  const layout = stored ?? DEFAULT_LAYOUTS[bp];

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
          }}
        />
        {(Object.keys(layout) as WidgetId[]).map((id) => {
          const p = layout[id];
          return (
            <div
              key={id}
              className="absolute animate-fade-in"
              style={{
                top: p.top,
                left: p.left,
                width: p.width,
                transform: `rotate(${p.rotate}deg)`,
                zIndex: zMap[id],
                animationDelay: delayMap[id],
              }}
            >
              {renderWidget(id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== MAIN ===================== */

export function HeroBlockPortrait() {
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();
  const bp = useBreakpoint();
  const editMode = useEditMode();

  const ArtboardComp = editMode ? EditArtboard : StaticArtboard;

  return (
    <section className="relative overflow-hidden bg-background">
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
        <div className="flex absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 xl:right-10 items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-fade-in z-30">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] sm:text-sm font-medium text-primary">
            Москва и Санкт-Петербург
          </span>
        </div>

        <div className="flex flex-col items-center gap-5 md:gap-8 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:items-center">
          <div className="order-1 flex flex-col items-start gap-4 md:gap-5 max-w-xl w-full">
            <ThemedLogo className="h-20 md:h-24 w-auto animate-hue-shift" />
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

            <div className="hidden lg:block w-full animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <StatRow />
            </div>
            <div
              className="hidden lg:flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-in"
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

          <div className="order-3 lg:hidden flex flex-col items-start gap-5 w-full max-w-xl">
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
        </div>
      </div>
    </section>
  );
}
