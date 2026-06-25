import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  FileText,
  Target,
  TrendingUp,
  Pill,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const reportFeatures = [
  {
    icon: FileText,
    title: "Подробная расшифровка анализов",
    description: "Разбираем показатели простым языком и объясняем их влияние на организм",
  },
  {
    icon: TrendingUp,
    title: "Связи между показателями",
    description: "Показываем, как анализы влияют друг на друга и что это означает для здоровья",
  },
  {
    icon: Target,
    title: "Инсайты о состоянии организма",
    description: "Объясняем сильные и слабые стороны организма, выявляем потенциальные риски",
  },
  {
    icon: Pill,
    title: "Биологический возраст",
    description: "Рассчитываем ваш биологический возраст и показываем факторы, ускоряющие старение",
  },
  {
    icon: ShieldAlert,
    title: "Ранние сигналы риска",
    description: "Показываем, какие показатели выходят за пределы оптимальных диапазонов и к каким последствиям это может привести",
  },
  {
    icon: CheckCircle2,
    title: "Конкретные рекомендации врача",
    description: "Подборка витаминов, питания и образа жизни. При необходимости рекомендуем дополнительные обследования",
  },
];

// ============ Mockup pages ============
type MockPage = { id: string; label: string; render: () => JSX.Element };

const Dot = ({ color }: { color: string }) => (
  <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
);

const Bar = ({ value, color }: { value: number; color: string }) => (
  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="h-full rounded-full"
      style={{ background: color }}
    />
  </div>
);

const PageSummary = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Биологический возраст</div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">38.4</span>
          <span className="text-sm text-muted-foreground">/ 42 хроно</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground mb-1">Динамика</div>
        <div className="text-emerald-500 font-semibold text-lg">−1.8 года</div>
      </div>
    </div>
    <div className="rounded-xl border border-border/60 p-4 bg-card/60 space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Краткое резюме</div>
      <div className="space-y-2">
        <div className="h-2 rounded bg-muted/60 w-[95%]" />
        <div className="h-2 rounded bg-muted/60 w-[88%]" />
        <div className="h-2 rounded bg-muted/60 w-[72%]" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { v: 82, c: "hsl(142 71% 45%)", l: "Метаб." },
        { v: 64, c: "hsl(38 92% 50%)", l: "Гормоны" },
        { v: 91, c: "hsl(142 71% 45%)", l: "Сердце" },
      ].map((s) => (
        <div key={s.l} className="rounded-lg bg-card/60 border border-border/60 p-3">
          <div className="text-[10px] text-muted-foreground mb-1">{s.l}</div>
          <div className="text-lg font-bold">{s.v}</div>
          <div className="mt-1"><Bar value={s.v} color={s.c} /></div>
        </div>
      ))}
    </div>
  </div>
);

const PageBiomarkers = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Биомаркеры · Метаболизм</div>
    {[
      { n: "Глюкоза", v: "5.2", u: "ммоль/л", p: 35, c: "hsl(142 71% 45%)" },
      { n: "Инсулин", v: "9.4", u: "мкЕд/мл", p: 55, c: "hsl(142 71% 45%)" },
      { n: "HOMA-IR", v: "2.18", u: "", p: 72, c: "hsl(38 92% 50%)" },
      { n: "HbA1c", v: "5.6", u: "%", p: 48, c: "hsl(142 71% 45%)" },
      { n: "Триглицериды", v: "1.9", u: "ммоль/л", p: 78, c: "hsl(25 95% 53%)" },
    ].map((b) => (
      <div key={b.n} className="rounded-lg border border-border/60 bg-card/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Dot color={b.c} />
            <span className="text-sm font-medium">{b.n}</span>
          </div>
          <div className="text-sm font-semibold">
            {b.v} <span className="text-muted-foreground text-xs">{b.u}</span>
          </div>
        </div>
        <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-500/30 via-emerald-500/40 to-red-500/30">
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${b.p}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute -top-1 w-3.5 h-3.5 rounded-full border-2 border-background shadow-md"
            style={{ background: b.c, transform: "translateX(-50%)" }}
          />
        </div>
      </div>
    ))}
  </div>
);

const PageConnections = () => (
  <div className="space-y-4">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Связи между показателями</div>
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <svg viewBox="0 0 300 180" className="w-full h-40">
        <defs>
          <linearGradient id="ln" x1="0" x2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {[
          ["60,40", "150,90"],
          ["240,30", "150,90"],
          ["60,140", "150,90"],
          ["240,150", "150,90"],
          ["150,20", "150,90"],
        ].map(([a, b], i) => (
          <motion.line
            key={i}
            x1={a.split(",")[0]} y1={a.split(",")[1]}
            x2={b.split(",")[0]} y2={b.split(",")[1]}
            stroke="url(#ln)" strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: i * 0.12 }}
          />
        ))}
        {[
          [150, 90, 18, "hsl(var(--primary))"],
          [60, 40, 10, "hsl(142 71% 45%)"],
          [240, 30, 10, "hsl(38 92% 50%)"],
          [60, 140, 10, "hsl(25 95% 53%)"],
          [240, 150, 10, "hsl(142 71% 45%)"],
          [150, 20, 10, "hsl(38 92% 50%)"],
        ].map(([x, y, r, c], i) => (
          <motion.circle
            key={i} cx={x as number} cy={y as number} r={r as number}
            fill={c as string} fillOpacity="0.85"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>
    </div>
    <div className="space-y-2">
      {["Высокий HOMA-IR ⇄ снижение тестостерона", "Дефицит D ⇄ воспаление (CRP)", "Гомоцистеин ⇄ B12 / фолат"].map((t) => (
        <div key={t} className="text-xs px-3 py-2 rounded-lg bg-card/60 border border-border/60">{t}</div>
      ))}
    </div>
  </div>
);

const PagePrescriptions = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Рекомендации врача</div>
    {[
      { t: "Витамин D3", d: "5000 МЕ · утром с жирной пищей · 8 недель", c: "hsl(var(--primary))" },
      { t: "Омега-3", d: "EPA 1000 + DHA 500 мг · с едой · постоянно", c: "hsl(142 71% 45%)" },
      { t: "Магний глицинат", d: "400 мг · вечером · 12 недель", c: "hsl(280 70% 60%)" },
      { t: "Питание", d: "−20% быстрых углеводов, +30 г клетчатки/день", c: "hsl(38 92% 50%)" },
    ].map((r) => (
      <div key={r.t} className="rounded-lg border border-border/60 bg-card/60 p-3 flex gap-3">
        <div className="w-1 rounded-full shrink-0" style={{ background: r.c }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{r.t}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{r.d}</div>
        </div>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      </div>
    ))}
  </div>
);

const pages: MockPage[] = [
  { id: "summary", label: "Резюме", render: () => <PageSummary /> },
  { id: "bio", label: "Биомаркеры", render: () => <PageBiomarkers /> },
  { id: "links", label: "Связи", render: () => <PageConnections /> },
  { id: "rx", label: "Рекомендации", render: () => <PagePrescriptions /> },
];

function ReportMockup() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % pages.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const go = (delta: number) => {
    setDir(delta);
    setIdx((i) => (i + delta + pages.length) % pages.length);
  };

  const page = pages[idx];

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 bg-gradient-hero opacity-20 blur-3xl rounded-[2rem] pointer-events-none" />

      {/* A4 page frame (1 : √2) */}
      <div
        className="relative mx-auto rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ aspectRatio: "1 / 1.4142", maxWidth: "440px" }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-hero" />
            <span className="text-xs font-semibold tracking-wide">ReAge · Отчёт</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Стр. {idx + 1} / {pages.length}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 overflow-x-auto scrollbar-none">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                i === idx
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Page content */}
        <div className="relative px-6 py-5 overflow-hidden" style={{ height: "calc(100% - 130px)" }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={page.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 40 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {page.render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dots (outside A4) */}
      <div className="flex justify-center gap-1.5 pt-4">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
            aria-label={`Страница ${i + 1}`}
          />
        ))}
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => go(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 sm:-translate-x-1/3 w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-10"
        aria-label="Предыдущая страница"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 sm:translate-x-1/3 w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-10"
        aria-label="Следующая страница"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export function ReportShowcaseSection() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <Badge className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm hover:bg-primary/10 transition-none">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            Что я получу?
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Ваш </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              персональный отчёт на понятном языке
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Дорожная карта вашего здоровья: расшифровка всех показателей и персональные рекомендации
          </p>
        </div>

        {/* Split: mockup + features */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: report mockup */}
          <div className="order-2 lg:order-1 px-6 sm:px-10 lg:px-4">
            <ReportMockup />
          </div>

          {/* Right: features */}
          <div className="order-1 lg:order-2 space-y-3">
            {reportFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 leading-tight">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}

            <div className="pt-4">
              <Link to="/example-report" className="inline-block w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group">
                  <Eye className="w-5 h-5 mr-2" />
                  Посмотреть пример отчёта
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
