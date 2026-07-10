import { useCallback, useEffect, useRef, useState, ReactNode } from "react";
import card1 from "@/assets/report-card-1.png.asset.json";
import card2 from "@/assets/report-card-2.png.asset.json";
import card3 from "@/assets/report-card-3.png.asset.json";
import card4 from "@/assets/report-card-4.png.asset.json";

/* ===================== ITEMS ===================== */

type ItemId = "stat" | "card1" | "card2" | "card3" | "card4";
type ItemPos = { top: number; left: number; width: number; rotate: number };
type Layout = Record<ItemId, ItemPos>;
type Breakpoint = "mobile" | "tablet" | "desktop";

const CARDS: Record<Exclude<ItemId, "stat">, { num: string; title: string; img: string }> = {
  card1: { num: "01", title: "Общее резюме", img: card1.url },
  card2: { num: "02", title: "Разбор по системам организма", img: card2.url },
  card3: { num: "03", title: "Биомаркеры с расшифровкой", img: card3.url },
  card4: { num: "04", title: "Персональные назначения", img: card4.url },
};

const ITEM_LABELS: Record<ItemId, string> = {
  stat: "50+ страниц",
  card1: "Резюме",
  card2: "Системы",
  card3: "Биомаркеры",
  card4: "Назначения",
};

const ARTBOARDS: Record<Breakpoint, { width: number; height: number }> = {
  mobile: { width: 360, height: 900 },
  tablet: { width: 720, height: 720 },
  desktop: { width: 1120, height: 640 },
};

const DEFAULT_LAYOUTS: Record<Breakpoint, Layout> = {
  mobile: {
    stat:  { top: 0,   left: 20,  width: 320, rotate: 0 },
    card1: { top: 180, left: 20,  width: 300, rotate: -2 },
    card2: { top: 360, left: 40,  width: 300, rotate: 1.5 },
    card3: { top: 540, left: 20,  width: 300, rotate: -1.5 },
    card4: { top: 720, left: 40,  width: 300, rotate: 2 },
  },
  tablet: {
    stat:  { top: 40,  left: 30,  width: 260, rotate: 0 },
    card1: { top: 20,  left: 340, width: 340, rotate: -2 },
    card2: { top: 30,  left: 380, width: 320, rotate: 1.5 },
    card3: { top: 380, left: 40,  width: 320, rotate: -1.5 },
    card4: { top: 380, left: 380, width: 320, rotate: 2 },
  },
  desktop: {
    stat:  { top: 180, left: 30,  width: 360, rotate: 0 },
    card1: { top: 20,  left: 430, width: 300, rotate: -2 },
    card2: { top: 30,  left: 780, width: 320, rotate: 1.5 },
    card3: { top: 330, left: 430, width: 300, rotate: -1.5 },
    card4: { top: 320, left: 780, width: 320, rotate: 2 },
  },
};

const STORAGE_KEY = "reportCollageLayoutV1";

/* ===================== VIEWS ===================== */

function StatView() {
  return (
    <div className="text-center lg:text-left select-none">
      <div className="inline-flex items-baseline gap-3">
        <span className="text-[7rem] md:text-[10rem] leading-[0.85] font-black bg-gradient-hero bg-clip-text text-transparent tracking-tighter">
          50+
        </span>
        <span className="text-base md:text-lg font-semibold text-muted-foreground">
          страниц
        </span>
      </div>
      <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xs mx-auto lg:mx-0">
        Выжимки из ключевых разделов — от резюме здоровья до персональных назначений.
      </p>
    </div>
  );
}

function CardView({ id }: { id: Exclude<ItemId, "stat"> }) {
  const c = CARDS[id];
  return (
    <div className="select-none">
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="text-xs font-bold tracking-widest text-primary">{c.num}</span>
        <h3 className="text-sm md:text-base font-semibold text-foreground">{c.title}</h3>
      </div>
      <div className="rounded-2xl bg-card border border-border/60 shadow-xl shadow-primary/10 overflow-hidden">
        <img src={c.img} alt={c.title} loading="lazy" className="w-full h-auto block" draggable={false} />
      </div>
    </div>
  );
}

function renderItem(id: ItemId): ReactNode {
  if (id === "stat") return <StatView />;
  return <CardView id={id} />;
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
    setOn(new URLSearchParams(window.location.search).get("collageEdit") === "1");
  }, []);
  return on;
}

function loadStored(): Partial<Record<Breakpoint, Layout>> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

/* ===================== EDIT MODE ===================== */

function Draggable({
  id, pos, scale, onChange, selected, onSelect,
}: {
  id: ItemId;
  pos: ItemPos;
  scale: number;
  onChange: (p: ItemPos) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.x) / scale;
    const dy = (e.clientY - drag.current.y) / scale;
    onChange({ ...pos, left: Math.round(drag.current.left + dx), top: Math.round(drag.current.top + dy) });
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };
  return (
    <div
      className="absolute touch-none cursor-move"
      style={{
        top: pos.top, left: pos.left, width: pos.width,
        transform: `rotate(${pos.rotate}deg)`,
        zIndex: selected ? 50 : 30,
        outline: selected ? "2px dashed hsl(var(--primary))" : "1px dashed hsl(var(--primary) / 0.4)",
        outlineOffset: 2, borderRadius: 18,
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onClick={onSelect}
    >
      <div className="pointer-events-none">{renderItem(id)}</div>
      <div className="absolute -top-5 left-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
        {ITEM_LABELS[id]}
      </div>
    </div>
  );
}

function EditPanel({
  bp, layout, setLayout, resetLayout, selected, setSelected,
}: {
  bp: Breakpoint; layout: Layout;
  setLayout: (l: Layout) => void; resetLayout: () => void;
  selected: ItemId | null; setSelected: (id: ItemId | null) => void;
}) {
  const copyAll = async () => {
    const all = loadStored();
    all[bp] = layout;
    const text = JSON.stringify(all, null, 2);
    try { await navigator.clipboard.writeText(text); alert("Скопировано!\n\n" + text); }
    catch { window.prompt("Скопируйте:", text); }
  };
  const upd = (id: ItemId, f: keyof ItemPos, v: number) =>
    setLayout({ ...layout, [id]: { ...layout[id], [f]: v } });
  return (
    <div className="fixed top-2 right-2 z-[100] w-[300px] max-h-[90vh] overflow-auto rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">Collage · {bp}</div>
        <div className="flex gap-1">
          <button onClick={copyAll} className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold">Copy</button>
          <button onClick={resetLayout} className="px-2 py-1 bg-muted rounded text-[11px]">Reset</button>
        </div>
      </div>
      <div className="space-y-2">
        {(Object.keys(layout) as ItemId[]).map((id) => {
          const p = layout[id];
          const isSel = selected === id;
          return (
            <div key={id}
              className={`rounded border p-2 ${isSel ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => setSelected(id)}>
              <div className="font-semibold mb-1">{ITEM_LABELS[id]}</div>
              <div className="grid grid-cols-4 gap-1">
                {(["top", "left", "width", "rotate"] as (keyof ItemPos)[]).map((f) => (
                  <label key={f} className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase">{f}</span>
                    <input type="number" value={p[f]}
                      onChange={(e) => upd(id, f, Number(e.target.value))}
                      className="w-full bg-muted rounded px-1 py-0.5 text-[11px] tabular-nums" />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground leading-snug">
        Тяните мышью или меняйте числа. «Copy» копирует JSON по всем брейкпойнтам.
      </div>
    </div>
  );
}

function EditArtboard({ bp }: { bp: Breakpoint }) {
  const ab = ARTBOARDS[bp];
  const [layout, setLayout] = useState<Layout>(loadStored()[bp] ?? DEFAULT_LAYOUTS[bp]);
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLayout(loadStored()[bp] ?? DEFAULT_LAYOUTS[bp]); }, [bp]);

  useEffect(() => {
    const recalc = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      setScale(Math.min(1, w / ab.width));
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [ab.width]);

  const persist = useCallback((l: Layout) => {
    setLayout(l);
    const all = loadStored(); all[bp] = l;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [bp]);

  const reset = () => {
    const all = loadStored(); delete all[bp];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setLayout(DEFAULT_LAYOUTS[bp]);
  };

  return (
    <>
      <div ref={wrapRef} className="w-full" style={{ height: ab.height * scale }}>
        <div
          className="relative border border-dashed border-primary/40 bg-muted/10 origin-top-left"
          style={{ width: ab.width, height: ab.height, transform: `scale(${scale})` }}
        >
          {(Object.keys(layout) as ItemId[]).map((id) => (
            <Draggable key={id} id={id} pos={layout[id]} scale={scale}
              onChange={(p) => persist({ ...layout, [id]: p })}
              selected={selected === id} onSelect={() => setSelected(id)} />
          ))}
        </div>
      </div>
      <EditPanel bp={bp} layout={layout} setLayout={persist} resetLayout={reset}
        selected={selected} setSelected={setSelected} />
    </>
  );
}

/* ===================== READ-ONLY ARTBOARD ===================== */

function ReadArtboard() {
  const cards: Exclude<ItemId, "stat">[] = ["card1", "card2", "card3", "card4"];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
      <div className="lg:col-span-4">
        <StatView />
      </div>
      <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
        {cards.map((id, i) => {
          const rotate = [-2, 1.5, -1.5, 2][i];
          return (
            <div key={id} className="group animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-xs font-bold tracking-widest text-primary">{CARDS[id].num}</span>
                <h3 className="text-sm md:text-base font-semibold text-foreground">{CARDS[id].title}</h3>
              </div>
              <div
                className="rounded-2xl bg-card border border-border/60 shadow-xl shadow-primary/10 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:-translate-y-1 group-hover:!rotate-0"
                style={{ transform: `rotate(${rotate}deg)` }}
              >
                <img src={CARDS[id].img} alt={CARDS[id].title} loading="lazy" className="w-full h-auto block" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ===================== MAIN ===================== */

export function ReportCollageBlock() {
  const bp = useBreakpoint();
  const edit = useEditMode();

  return (
    <section className="relative pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden">
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

        <div className="max-w-6xl mx-auto">
          {edit ? <EditArtboard bp={bp} /> : <ReadArtboard />}
        </div>
      </div>
    </section>
  );
}
