import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { ExampleReportEmailForm } from "./ExampleReportEmailForm";
import card1 from "@/assets/report-card-1.png";
import card2 from "@/assets/report-card-2.png";
import card3 from "@/assets/report-card-3.png";
import card4 from "@/assets/report-card-4.png";

/* ===================== DATA ===================== */

type ElementId = "stat" | "card1" | "card2" | "card3" | "card4";
type Pos = { top: number; left: number; width: number; rotate: number };
type Layout = Record<ElementId, Pos>;
type StoredLayout = Partial<Record<ElementId, Partial<Pos>>>;
type Breakpoint = "mobile" | "tablet" | "desktop";

const CARDS = {
  card1: { num: "01", title: "Общее резюме", img: card1 },
  card2: { num: "02", title: "Разбор по системам организма", img: card2 },
  card3: { num: "03", title: "Биомаркеры с расшифровкой", img: card3 },
  card4: { num: "04", title: "Персональные назначения", img: card4 },
} as const;

const LABELS: Record<ElementId, string> = {
  stat: "50+ страниц",
  card1: "Карточка 01",
  card2: "Карточка 02",
  card3: "Карточка 03",
  card4: "Карточка 04",
};

const ARTBOARDS: Record<Breakpoint, { width: number; height: number; scale: number }> = {
  mobile: { width: 340, height: 780, scale: 0.95 },
  tablet: { width: 720, height: 660, scale: 1 },
  desktop: { width: 1100, height: 720, scale: 1 },
};

export const REPORT_COLLAGE_DEFAULT_LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    stat:  { top: 663, left: -5,  width: 300, rotate: 0 },
    card1: { top: -67, left: -11, width: 319, rotate: -3 },
    card2: { top: 60,  left: 27,  width: 280, rotate: 2 },
    card3: { top: 261, left: -19, width: 328, rotate: -2 },
    card4: { top: 459, left: -12, width: 362, rotate: 3 },
  },
  tablet: {
    stat:  { top: 354, left: 398, width: 328, rotate: 0 },
    card1: { top: -45, left: 353, width: 428, rotate: -3 },
    card2: { top: -12, left: -11, width: 354, rotate: 2 },
    card3: { top: 122, left: 362, width: 379, rotate: -2 },
    card4: { top: 244, left: -6,  width: 376, rotate: 3 },
  },
  desktop: {
    stat:  { top: 495, left: 122, width: 381, rotate: 0 },
    card1: { top: 3,   left: 89,  width: 500, rotate: -3 },
    card2: { top: 5,   left: 591, width: 500, rotate: 2 },
    card3: { top: 202, left: 98,  width: 500, rotate: -2 },
    card4: { top: 355, left: 598, width: 500, rotate: 3 },

  },
};

export const REPORT_COLLAGE_STORAGE_KEY = "reportCollageLayoutV2";

/* ===================== RENDERERS ===================== */

function StatElement({ width }: { width: number }) {
  const titleSize = Math.max(24, Math.min(38, width * 0.09));
  return (
    <div className="text-left">
      <div
        className="whitespace-nowrap font-black bg-gradient-hero bg-clip-text text-transparent leading-none"
        style={{ fontSize: titleSize }}
      >
        50+ страниц
      </div>
      <ul className="mt-3 space-y-0 md:space-y-1 text-sm md:text-[15px] leading-tight md:leading-normal text-muted-foreground">

        {[
          "Подробная расшифровка анализов",
          "Взаимосвязи показателей",
          "Инсайты о состоянии организма",
          "Биологический возраст",
          "Ранние сигналы риска",
          "Персональные рекомендации врача",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardElement({ id }: { id: "card1" | "card2" | "card3" | "card4" }) {
  const c = CARDS[id];
  return (
    <div>
      <div className="mb-1 md:mb-2.5">
        <h3 className="text-sm md:text-base font-semibold text-foreground">{c.title}</h3>
      </div>
      <div className="rounded-2xl bg-card border border-border/60 shadow-xl shadow-primary/10 overflow-hidden">
        <img src={c.img} alt={c.title} loading="lazy" className="w-full h-auto block" />
      </div>
    </div>
  );
}

function renderElement(id: ElementId, width: number) {
  if (id === "stat") return <StatElement width={width} />;
  return <CardElement id={id} />;
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
    const u = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  return bp;
}

function useEditMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () =>
      setOn(new URLSearchParams(window.location.search).get("layoutEdit") === "1");
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return on;
}

function normalizeLayout(bp: Breakpoint, stored?: StoredLayout): Layout {
  const base = REPORT_COLLAGE_DEFAULT_LAYOUTS[bp];
  return (Object.keys(base) as ElementId[]).reduce((acc, id) => {
    acc[id] = { ...base[id], ...(stored?.[id] ?? {}) };
    return acc;
  }, {} as Layout);
}

function loadStored(): Partial<Record<Breakpoint, StoredLayout>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(REPORT_COLLAGE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/* ===================== EDIT MODE ===================== */

function DraggableElement({
  id,
  pos,
  onChange,
  selected,
  onSelect,
}: {
  id: ElementId;
  pos: Pos;
  onChange: (p: Pos) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const dragRef = useRef<{ sx: number; sy: number; sl: number; st: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sw: number } | null>(null);
  const rotateRef = useRef<{ cx: number; cy: number; startAngle: number; startRotate: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, sl: pos.left, st: pos.top };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    onChange({ ...pos, left: Math.round(dragRef.current.sl + dx), top: Math.round(dragRef.current.st + dy) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { sx: e.clientX, sw: pos.width };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.sx;
    onChange({ ...pos, width: Math.max(80, Math.round(resizeRef.current.sw + dx)) });
  };
  const onResizeUp = (e: React.PointerEvent) => {
    resizeRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onRotateDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    rotateRef.current = { cx, cy, startAngle, startRotate: pos.rotate };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onRotateMove = (e: React.PointerEvent) => {
    if (!rotateRef.current) return;
    const angle = Math.atan2(e.clientY - rotateRef.current.cy, e.clientX - rotateRef.current.cx) * (180 / Math.PI);
    const next = rotateRef.current.startRotate + angle - rotateRef.current.startAngle;
    onChange({ ...pos, rotate: Math.round(next) });
  };
  const onRotateUp = (e: React.PointerEvent) => {
    rotateRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
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
      <div className="pointer-events-none select-none">{renderElement(id, pos.width)}</div>
      <div className="absolute -top-5 left-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
        {LABELS[id]} · {pos.rotate}°
      </div>
      <div
        onPointerDown={onRotateDown}
        onPointerMove={onRotateMove}
        onPointerUp={onRotateUp}
        className="absolute -top-9 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-accent border-2 border-background cursor-grab touch-none"
        title="Повернуть"
      />
      {/* resize handle */}
      <div
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-primary border-2 border-background cursor-se-resize touch-none"
        title="Изменить ширину"
      />
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
  selected: ElementId | null;
  setSelected: (id: ElementId | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const copyAll = async () => {
    const all = loadStored();
    all[bp] = layout;
    const full = (Object.keys(REPORT_COLLAGE_DEFAULT_LAYOUTS) as Breakpoint[]).reduce((acc, key) => {
      acc[key] = key === bp ? layout : normalizeLayout(key, all[key]);
      return acc;
    }, {} as Record<Breakpoint, Layout>);
    const text = JSON.stringify(full, null, 2);
    const ok = await copyToClipboard(text);
    if (ok) {
      window.prompt("Координаты скопированы. Если буфер недоступен — скопируйте отсюда:", text);
    } else {
      window.prompt("Скопируйте координаты вручную:", text);
    }
  };

  const update = (id: ElementId, f: keyof Pos, v: number) => {
    setLayout({ ...layout, [id]: { ...layout[id], [f]: v } });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed left-2 right-2 md:right-auto md:w-[340px] rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-2xl text-xs pointer-events-auto"
      style={{ top: "max(8px, env(safe-area-inset-top))", zIndex: 2147483647 }}
    >
      <div className="flex items-center justify-between p-2 gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 items-center gap-1.5 font-bold hover:opacity-70"
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          <span className="inline-block w-3 text-center">{collapsed ? "▸" : "▾"}</span>
          <span className="truncate">Collage · {bp}</span>
        </button>
        <div className="flex gap-1">
          <button type="button" onClick={copyAll} className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold">
            Copy
          </button>
          <button type="button" onClick={resetLayout} className="px-2 py-1 bg-muted rounded text-[11px]">
            Reset
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-3 pb-3 max-h-[70vh] overflow-auto">
          <div className="space-y-2">
            {(Object.keys(layout) as ElementId[]).map((id) => {
              const p = layout[id];
              const isSel = selected === id;
              return (
                <div
                  key={id}
                  className={`rounded border p-2 ${isSel ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelected(id)}
                >
                  <div className="font-semibold mb-1">{LABELS[id]}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["top", "left", "width", "rotate"] as (keyof Pos)[]).map((f) => (
                      <label key={f} className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase">{f}</span>
                        <input
                          type="number"
                          value={p[f]}
                          onChange={(e) => update(id, f, Number(e.target.value))}
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
            Тяните карточки мышью. Правый нижний угол — ширина. Верхняя точка — поворот. «Copy» копирует JSON.
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}


function EditArtboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  const [layout, setLayout] = useState<Layout>(() => normalizeLayout(bp, loadStored()[bp]));
  const [selected, setSelected] = useState<ElementId | null>(null);

  useEffect(() => {
    setLayout(normalizeLayout(bp, loadStored()[bp]));
  }, [bp]);

  const persist = useCallback((l: Layout) => {
    setLayout(l);
    const all = loadStored();
    all[bp] = l;
    localStorage.setItem(REPORT_COLLAGE_STORAGE_KEY, JSON.stringify(all));
  }, [bp]);

  const resetLayout = () => {
    const all = loadStored();
    delete all[bp];
    localStorage.setItem(REPORT_COLLAGE_STORAGE_KEY, JSON.stringify(all));
    setLayout(REPORT_COLLAGE_DEFAULT_LAYOUTS[bp]);
  };

  return (
    <>
      <div className="mx-auto" style={{ width: ab.width * ab.scale, height: ab.height * ab.scale }}>
        <div
          className="relative origin-top-left"
          style={{
            width: ab.width,
            height: ab.height,
            transform: `scale(${ab.scale})`,
            outline: "1px dashed hsl(var(--primary) / 0.4)",
          }}
        >
          {(Object.keys(layout) as ElementId[]).map((id) => (
            <DraggableElement
              key={id}
              id={id}
              pos={layout[id]}
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

/* ===================== STATIC VIEW ===================== */

function StaticArtboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  const layout = normalizeLayout(bp, loadStored()[bp]);

  return (
    <div className="mx-auto" style={{ width: ab.width * ab.scale, height: ab.height * ab.scale }}>
      <div
        className="relative origin-top-left"
        style={{ width: ab.width, height: ab.height, transform: `scale(${ab.scale})` }}
      >
        {(Object.keys(layout) as ElementId[]).map((id, i) => {
          const p = layout[id];
          return (
            <div
              key={id}
              className="absolute"
              style={{
                top: p.top,
                left: p.left,
                width: p.width,
                transform: `rotate(${p.rotate}deg)`,
                zIndex: id === "stat" ? 20 : 30,
              }}
            >
              <div className="animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                {renderElement(id, p.width)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== MAIN ===================== */

export function ReportCollageBlock({ editMode }: { editMode?: boolean } = {}) {
  const bp = useBreakpoint();
  const urlEdit = useEditMode();
  const isEdit = editMode ?? urlEdit;
  const ArtboardComp = isEdit ? EditArtboard : StaticArtboard;

  return (
    <section className="relative pt-8 md:pt-12 pb-8 md:pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Ваш персональный отчёт </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              на понятном языке
            </span>
          </h2>
        </div>

        <ArtboardComp bp={bp} />

        <div className="mt-10 md:mt-14 flex justify-center animate-fade-in">
          <Button
            asChild
            size="lg"
            className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
          >
            <Link to="/example-report">
              Посмотреть пример отчёта
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
