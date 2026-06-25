import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  FileText,
  Target,
  Pill,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
} from "lucide-react";

// ============ Mockup pages ============
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

// 1. Подробная расшифровка анализов → биомаркеры
const PageBiomarkers = () => {
  const items = [
    { name: "Глюкоза", code: "GLU", value: "4.72", unit: "ммоль/л", p: 35, status: "optimal", label: "Оптимально" },
    { name: "Гликированный гемоглобин", code: "HbA1c", value: "5.05", unit: "%", p: 40, status: "optimal", label: "Оптимально" },
    { name: "Витамин D (25-OH D)", code: "25-OH D", value: "74.35", unit: "нг/мл", p: 70, status: "optimal", label: "Оптимально" },
    { name: "Нейтрофилы", code: "NEUT", value: "79.13", unit: "%", p: 88, status: "risk", label: "Риск" },
    { name: "Тестостерон общий", code: "TEST", value: "0.16", unit: "нмоль/л", p: 18, status: "critical", label: "Критично" },
  ];

  const statusDot = (s: string) => {
    switch (s) {
      case "optimal": return "text-status-optimal";
      case "acceptable": return "text-status-acceptable";
      case "risk": return "text-status-risk";
      case "critical": return "text-status-critical";
      default: return "text-muted-foreground";
    }
  };
  const statusMarker = (s: string) => {
    switch (s) {
      case "optimal": return "hsl(142 71% 45%)";
      case "acceptable": return "hsl(38 92% 50%)";
      case "risk": return "hsl(25 95% 53%)";
      case "critical": return "hsl(0 84% 60%)";
      default: return "hsl(var(--muted-foreground))";
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Состояние биомаркеров
      </div>
      {items.map((b) => (
        <div
          key={b.code}
          className="rounded-xl border border-border/40 bg-card/50 shadow-sm p-4 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{b.name}</span>
              <span className="text-xs text-muted-foreground">({b.code})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${statusDot(b.status)}`}>●</span>
              <span className={`text-xs font-medium ${statusDot(b.status)}`}>{b.label}</span>
            </div>
          </div>

          <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-500/30 via-emerald-500/40 to-red-500/30">
            <motion.div
              initial={{ left: 0 }}
              animate={{ left: `${b.p}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute -top-1 w-3.5 h-3.5 rounded-full border-2 border-background shadow-md"
              style={{ background: statusMarker(b.status), transform: "translateX(-50%)" }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Значение</span>
            <span className="font-semibold">
              {b.value} <span className="text-muted-foreground font-normal">{b.unit}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 2. Связи между показателями
const PageConnections = () => {
  const links = [
    {
      from: "Гликированный гемоглобин",
      to: "Инсулинорезистентность",
      note: "Долгосрочный контроль глюкозы влияет на чувствительность к инсулину",
    },
    {
      from: "Тестостерон общий",
      to: "Энергия и восстановление",
      note: "Низкий тестостерон снижает анаболический тонус и выносливость",
    },
    {
      from: "Нейтрофилы",
      to: "Системное воспаление",
      note: "Повышенные нейтрофилы — маркер inflammaging и нагрузки на иммунитет",
    },
    {
      from: "Альбумин",
      to: "Белковый обмен",
      note: "Сниженный белок усиливает воспалительный фон и замедляет регенерацию",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Связи между показателями
      </div>

      <div className="relative rounded-2xl border border-border/40 bg-card/50 p-4 overflow-hidden">
        {/* Decorative network SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="30%" cy="30%" r="6" fill="currentColor" />
          <circle cx="70%" cy="25%" r="6" fill="currentColor" />
          <circle cx="25%" cy="70%" r="6" fill="currentColor" />
          <circle cx="75%" cy="75%" r="6" fill="currentColor" />
          <line x1="30%" y1="30%" x2="70%" y2="25%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="30%" y1="30%" x2="25%" y2="70%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="70%" y1="25%" x2="75%" y2="75%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="25%" y1="70%" x2="75%" y2="75%" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="relative space-y-3">
          {links.map((l, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <div>
                <div className="text-xs font-semibold">
                  {l.from} <span className="text-muted-foreground">→</span> {l.to}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  {l.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <div className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">
          Зачем это важно
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          Организм — это единая система. Изолированный показатель редко объясняет причину.
          ReAge показывает, какие маркеры влияют друг на друга, чтобы вы увидели полную картину.
        </p>
      </div>
    </div>
  );
};

// 3. Инсайты о состоянии организма
const PageInsights = () => {
  const systems = [
    { name: "Энергия и восстановление", score: 95, color: "hsl(142 71% 45%)" },
    { name: "Сердечно-сосудистая", score: 90, color: "hsl(142 71% 45%)" },
    { name: "Метаболизм и детокс", score: 88, color: "hsl(142 71% 45%)" },
    { name: "Иммунная система", score: 85, color: "hsl(38 92% 50%)" },
    { name: "Эндокринная и стресс", score: 80, color: "hsl(38 92% 50%)" },
  ];
  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Баланс систем организма
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
        {systems.map((s) => (
          <div key={s.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate pr-2">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.score}</span>
            </div>
            <Bar value={s.score} color={s.color} />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <div className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">
          Главный инсайт
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          Углеводный обмен и липидный профиль — в превосходном состоянии. Зона роста —
          гормональная и иммунная сферы: снижены анаболические гормоны и есть признаки
          лёгкого системного воспаления.
        </p>
      </div>
    </div>
  );
};

// 4. Биологический возраст
const PageBioAge = () => (
  <div className="space-y-4">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Биологический возраст
    </div>
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Биологический</div>
          <div className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-none">
            34.5
          </div>
          <div className="text-xs text-muted-foreground mt-1">из 38 хроно</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Моложе на</div>
          <div className="text-2xl font-bold text-emerald-500">−3.5 года</div>
          <div className="text-[11px] text-muted-foreground mt-1">Индекс здоровья 91/100</div>
        </div>
      </div>
    </div>
    <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Что ускоряет старение
      </div>
      {[
        { name: "Тестостерон общий", note: "влияет на энергию и мышечную массу" },
        { name: "DHEA-S", note: "гормон стрессоустойчивости и восстановления" },
        { name: "Альбумин", note: "белковый обмен и транспорт веществ" },
      ].map((f) => (
        <div key={f.name} className="flex items-start gap-2 text-xs">
          <Activity className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{f.name}</span>
            <span className="text-muted-foreground"> — {f.note}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 5. Ранние сигналы риска → ключевые отклонения
const PageRisks = () => {
  const risks = [
    {
      name: "Тестостерон общий",
      value: "0.16 нмоль/л",
      tag: "Критично",
      tagClr: "text-status-critical bg-status-critical/10",
      reason: "Значительно ниже оптимальных значений. Влияет на энергию, либидо, мышечную массу и когнитивные функции.",
    },
    {
      name: "Нейтрофилы",
      value: "79.13 %",
      tag: "Риск",
      tagClr: "text-status-risk bg-status-risk/10",
      reason: "Повышены — возможный признак системного воспаления. Требует наблюдения и противовоспалительной поддержки.",
    },
    {
      name: "DHEA-S",
      value: "89.72 мкг/дл",
      tag: "Внимание",
      tagClr: "text-status-acceptable bg-status-acceptable/10",
      reason: "Нижняя треть нормы. Для замедления старения оптимум — в верхней трети референсного диапазона.",
    },
    {
      name: "Альбумин",
      value: "39.1 г/л",
      tag: "Внимание",
      tagClr: "text-status-acceptable bg-status-acceptable/10",
      reason: "Снижен — может указывать на недостаточный белковый обмен и хроническое воспаление низкой степени.",
    },
  ];
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Ранние сигналы риска
      </div>
      {risks.map((r) => (
        <div key={r.name} className="rounded-xl border border-border/40 bg-card/50 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold">{r.name}</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.tagClr}`}>
              {r.tag}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-medium">{r.value}</div>
          <p className="text-[11px] leading-relaxed text-foreground/75">{r.reason}</p>
        </div>
      ))}
    </div>
  );
};

// 6. Рекомендации врача
const PagePrescriptions = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Рекомендации врача</div>
    {[
      { t: "Магний глицинат", d: "400 мг · вечером · 8 недель", c: "hsl(280 70% 60%)" },
      { t: "Витамин B6 (P-5-P)", d: "50 мг · утром с едой · 12 недель", c: "hsl(var(--primary))" },
      { t: "Омега-3 (EPA/DHA)", d: "2000 мг/сут · с едой · постоянно", c: "hsl(142 71% 45%)" },
      { t: "Кверцетин + биофлавоноиды", d: "500 мг · 2 раза в день · 8 недель", c: "hsl(38 92% 50%)" },
      { t: "Питание и сон", d: "+30 г белка, циркадный режим 23:00–07:00", c: "hsl(200 80% 55%)" },
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

// ============ Features ↔ pages mapping ============
const reportFeatures = [
  {
    icon: FileText,
    title: "Подробная расшифровка анализов",
    description: "Разбираем показатели простым языком и объясняем их влияние на организм",
    pageId: "bio",
    pageLabel: "Биомаркеры",
    render: () => <PageBiomarkers />,
  },
  {
    icon: TrendingUp,
    title: "Связи между показателями",
    description: "Показываем, как биомаркеры, системы и рекомендации влияют друг на друга",
    pageId: "connections",
    pageLabel: "Связи",
    render: () => <PageConnections />,
  },
  {
    icon: Target,
    title: "Инсайты о состоянии организма",
    description: "Объясняем сильные и слабые стороны организма, выявляем потенциальные риски",
    pageId: "insights",
    pageLabel: "Инсайты",
    render: () => <PageInsights />,
  },
  {
    icon: Pill,
    title: "Биологический возраст",
    description: "Рассчитываем ваш биологический возраст и показываем факторы, ускоряющие старение",
    pageId: "bioage",
    pageLabel: "Био-возраст",
    render: () => <PageBioAge />,
  },
  {
    icon: ShieldAlert,
    title: "Ранние сигналы риска",
    description: "Показываем, какие показатели выходят за пределы оптимальных диапазонов и к каким последствиям это может привести",
    pageId: "risks",
    pageLabel: "Риски",
    render: () => <PageRisks />,
  },
  {
    icon: CheckCircle2,
    title: "Конкретные рекомендации врача",
    description: "Подборка витаминов, питания и образа жизни. При необходимости рекомендуем дополнительные обследования",
    pageId: "rx",
    pageLabel: "Рекомендации",
    render: () => <PagePrescriptions />,
  },
];

function ReportMockup({
  idx,
  setIdx,
  dir,
  setDir,
}: {
  idx: number;
  setIdx: (i: number) => void;
  dir: number;
  setDir: (d: number) => void;
}) {
  const pages = reportFeatures;
  const go = (delta: number) => {
    setDir(delta);
    setIdx((idx + delta + pages.length) % pages.length);
  };

  const page = pages[idx];

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 bg-gradient-hero opacity-20 blur-3xl rounded-[2rem] pointer-events-none" />

      {/* A4 page frame (1 : √2) */}
      <div
        className="relative mx-auto rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ aspectRatio: "1 / 1.4142", maxWidth: "520px" }}
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
              key={p.pageId}
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                i === idx
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {p.pageLabel}
            </button>
          ))}
        </div>

        {/* Page content */}
        <div className="relative px-6 py-5 overflow-y-auto" style={{ height: "calc(100% - 130px)" }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={page.pageId}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {page.render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation: arrows + dots */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={() => go(-1)}
          className="w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
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

        <button
          onClick={() => go(1)}
          className="w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Следующая страница"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function ReportShowcaseSection() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % reportFeatures.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

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
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
          {/* Left: report mockup */}
          <div className="order-2 lg:order-1 px-6 sm:px-10 lg:px-4">
            <ReportMockup idx={idx} setIdx={setIdx} dir={dir} setDir={setDir} />
          </div>

          {/* Right: features */}
          <div className="order-1 lg:order-2 space-y-3">
            {reportFeatures.map((feature, index) => {
              const Icon = feature.icon;
              const active = index === idx;
              return (
                <motion.button
                  key={feature.title}
                  type="button"
                  onClick={() => { setDir(index > idx ? 1 : -1); setIdx(index); }}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`w-full text-left flex gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all ${
                    active
                      ? "bg-primary/5 border-primary/50 shadow-md shadow-primary/10"
                      : "bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 leading-tight">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </motion.button>
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
