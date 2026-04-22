import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Shield, RefreshCw, Zap, Activity, Droplets, Atom, Sparkles, FlaskConical, Dna, CircleDot, Waves, type LucideIcon } from "lucide-react";

// Helper to wrap raw SVG paths into a Lucide-compatible icon
const makeIcon = (paths: React.ReactNode): LucideIcon =>
  (({ className, strokeWidth = 2, color = "currentColor", size = 24, ...props }: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths}
    </svg>
  )) as unknown as LucideIcon;

// V1 — Щитовидная железа (текущая, "бабочка")
const ThyroidIcon = makeIcon(
  <>
    <path d="M12 3v6" />
    <path d="M12 14v7" />
    <path d="M12 9c-1 0-2.5.4-3.5 1.2-1.4 1.1-2 2.8-2 4.3 0 1.6 1 2.5 2.2 2.5 1.5 0 2.6-1 3-2.5.3-1.2.3-2.5.3-3.5V9z" />
    <path d="M12 9c1 0 2.5.4 3.5 1.2 1.4 1.1 2 2.8 2 4.3 0 1.6-1 2.5-2.2 2.5-1.5 0-2.6-1-3-2.5-.3-1.2-.3-2.5-.3-3.5V9z" />
    <path d="M9.5 12.5h5" />
  </>
);

// V2 — Силуэт человека с отмеченными железами
const EndocrineBodyIcon = makeIcon(
  <>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M8 9c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6c0 .6-.4 1-1 1h-1l-.5 5h-3l-.5-5H9c-.6 0-1-.4-1-1V9z" />
    <circle cx="12" cy="9.5" r="0.6" fill="currentColor" />
    <circle cx="10" cy="13" r="0.6" fill="currentColor" />
    <circle cx="14" cy="13" r="0.6" fill="currentColor" />
  </>
);

// V3 — Молекула гормона
const HormoneMoleculeIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="19" cy="6" r="1.5" />
    <circle cx="5" cy="18" r="1.5" />
    <circle cx="19" cy="18" r="1.5" />
    <path d="M6.2 7.1l3.8 3.5" />
    <path d="M17.8 7.1l-3.8 3.5" />
    <path d="M6.2 16.9l3.8-3.5" />
    <path d="M17.8 16.9l-3.8-3.5" />
  </>
);

// V4 — Капля гормона + орбита (циклы)
const HormoneCycleIcon = makeIcon(
  <>
    <path d="M12 3c-2 3-4 5.5-4 8a4 4 0 0 0 8 0c0-2.5-2-5-4-8z" />
    <path d="M4 17a4 4 0 0 0 4 4" />
    <path d="M20 17a4 4 0 0 1-4 4" />
    <circle cx="4" cy="17" r="1" />
    <circle cx="20" cy="17" r="1" />
  </>
);

// V5 — Гормональный баланс (две сферы)
const HormoneBalanceIcon = makeIcon(
  <>
    <circle cx="12" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <path d="M10.5 8.5l3 7" />
    <path d="M13.5 8.5l-3 7" />
  </>
);

// V6 — Надпочечник + волна стресса
const AdrenalWaveIcon = makeIcon(
  <>
    <path d="M6 5c0-1 1-2 2-2h2c2 0 3 1.5 3 4v3c0 2.5-1.5 4-4 4s-4-1.5-4-4V8" />
    <path d="M3 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
  </>
);

import systemEnergy from "@/assets/system-energy.png";
import systemHeart from "@/assets/system-heart.png";
import systemImmune from "@/assets/system-immune.png";
import systemEndocrine from "@/assets/system-endocrine.png";
import systemMetabolism from "@/assets/system-metabolism.png";


const biomarkerCategories = [
  {
    id: "cardio",
    icon: Heart as LucideIcon,
    name: "Сердечно-сосудистая система",
    image: systemHeart,
    markers: ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "ApoA1", "ApoB", "ApoB/ApoA1", "не-HDL холестерин", "Индекс атерогенности", "Гомоцистеин", "Lp(a)", "Ферритин", "Железо", "Трансферрин", "Медь", "NT-proBNP", "КФК"],
    insights: ["Как выглядит ваш липидный профиль в деталях", "В каком состоянии ваша сосудистая стенка", "Соотношение «плохого» и «хорошего» холестерина", "Есть ли маркеры, указывающие на риски сердечно-сосудистых заболеваний"],
    risks: ["Риск атеросклероза", "Дислипидемия", "Гиперхолестеринемия", "Риск тромбоза", "Кардиоваскулярный риск", "Гипергомоцистеинемия", "Эндотелиальная дисфункция", "Нарушение липидного профиля", "Анемия", "Дефицит железа"]
  },
  {
    id: "immune",
    icon: Shield as LucideIcon,
    name: "Воспалительная и иммунная система",
    image: systemImmune,
    markers: ["Гемоглобин", "Эритроциты", "Гематокрит", "MCV", "MCH", "MCHC", "RDW", "RDW-SD", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "Моноциты", "Эозинофилы", "Базофилы", "Тромбоциты", "MPV", "PDW", "PCT", "CD3+", "CD4+", "CD8+", "CD19+", "NK-клетки", "СОЭ", "CRP", "IL-6", "TNF-α", "IgM", "IgG", "Фибриноген", "Протромбиновое время", "Тромбиновое время", "МНО", "АЧТВ"],
    insights: ["Как работает иммунная защита организма", "Есть ли скрытое хроническое воспаление", "Полная картина клеточного и гуморального иммунитета", "Состояние свёртывающей системы крови, оценка риска тромбозов"],
    risks: ["Хроническое воспаление", "Системное воспаление", "Снижение иммунитета", "Аутоиммунные риски", "Нарушение гемопоэза", "Нарушение свёртываемости", "Хроническая гипоксия", "Ускоренное старение"]
  },
  {
    id: "endocrine",
    icon: ThyroidIcon,
    name: "Эндокринная и стрессовая система",
    image: systemEndocrine,
    markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "Анти-ТПО", "Анти-ТГ", "TRAb", "Тестостерон", "Эстрадиол", "Эстрон", "Эстриол", "SHBG", "Кортизол", "DHEA-S", "Витамин D", "IGF-1"],
    insights: ["Комплексная оценка состояния вашего гормонального фона", "Как работает ваша щитовидная железа и есть ли аутоиммунные риски", "Уровень хронического стресса по состоянию надпочечников и кортизолу", "Баланс половых гормонов и их влияние на ваше самочувствие"],
    risks: ["Гипотиреоз", "Гипертиреоз", "Дефицит витамина D", "Гормональный дисбаланс", "Хронический стресс", "Надпочечниковая усталость", "Дефицит тестостерона", "Избыток эстрогенов", "Нарушение кортизолового ритма", "Снижение фертильности"]
  },
  {
    id: "metabolism",
    icon: RefreshCw as LucideIcon,
    name: "Метаболизм и детоксикация",
    image: systemMetabolism,
    markers: ["ALT", "AST", "GGT", "Билирубин", "ALP", "Общий белок", "Трансферрин", "Мочевая кислота", "Витамин K1", "Креатинин", "Мочевина", "Цистатин С", "Натрий", "Калий", "Хлор", "Кальций", "Фосфор", "pH", "Удельный вес", "Белок", "Глюкоза", "Кетоны", "Уробилиноген", "Гемоглобин", "Нитриты", "Лейкоциты", "Эритроциты"],
    insights: ["Насколько эффективно работает ваш обмен веществ", "Как ваш организм самостоятельно справляется с детоксикацией", "Задерживается ли в организме лишняя жидкость, создавая нагрузку на сердце и сосуды", "Баланс ключевых электролитов и состояние минерального обмена"],
    risks: ["Нарушение функции печени", "Жировой гепатоз", "Фиброз печени", "Токсическая нагрузка", "Нарушение детоксикации", "Подагра", "Гиперурикемия", "Нарушение белкового обмена", "Почечная недостаточность", "Нефропатия", "Нарушение электролитного баланса", "Гиперкалиемия", "Гипонатриемия", "Нарушение водно-солевого баланса", "Риск мочекаменной болезни", "Дефицит кальция"]
  },
  {
    id: "energy",
    icon: Zap as LucideIcon,
    name: "Энергия и восстановление",
    image: systemEnergy,
    markers: ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Коэнзим Q10", "Малоновый диальдегид", "Антиоксидантный статус", "Магний", "B12", "B9 (фолат)", "Цинк", "Селен", "Альбумин", "Лактат", "Бета-каротин", "Витамин A", "Витамин E"],
    insights: ["Откуда берётся постоянная усталость и сонливость ", "Насколько эффективно ваши клетки вырабатывают энергию", "Есть ли у вас скрытые дефициты витаминов и минералов", "Как быстро организм восстанавливается после нагрузок"],
    risks: ["Инсулинорезистентность", "Преддиабет", "Гипергликемия", "Дефицит B12", "Дефицит магния", "Дефицит цинка", "Дефицит селена", "Оксидативный стресс", "Митохондриальная дисфункция", "Хроническая усталость"]
  },
];

function CategoryContent({ cat }: { cat: typeof biomarkerCategories[0] }) {
  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-6">
      <h3 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
        <cat.icon className="w-7 h-7 text-primary shrink-0" strokeWidth={1.75} />
        <span>{cat.name}</span>
      </h3>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Что узнаете</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cat.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span className="text-sm text-foreground/80">{insight}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Биомаркеры</h4>
        <div className="flex flex-wrap gap-1.5">
          {cat.markers.map((marker) => (
            <span
              key={marker}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground/70 border border-border/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-default"
            >
              {marker}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/30">
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Выявляемые риски</h4>
        <div className="flex flex-wrap gap-1.5">
          {cat.risks.map((risk) => (
            <span
              key={risk}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-destructive/5 text-destructive/80 border border-destructive/15"
            >
              {risk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BiomarkersDeepDiveSection() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const cat = biomarkerCategories[active];

  const go = useCallback((idx: number, isUser = false) => {
    if (isUser) setUserInteracted(true);
    setDirection(idx > active ? 1 : -1);
    setActive(idx);
  }, [active]);

  const prev = useCallback(() => { setUserInteracted(true); setDirection(-1); setActive(a => (a - 1 + biomarkerCategories.length) % biomarkerCategories.length); }, []);
  const next = useCallback(() => { setUserInteracted(true); setDirection(1); setActive(a => (a + 1) % biomarkerCategories.length); }, []);

  // Auto-rotate every 5s until user interacts
  useEffect(() => {
    if (userInteracted) return;
    const timer = setInterval(() => {
      setDirection(1);
      setActive(a => (a + 1) % biomarkerCategories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [userInteracted]);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
            5 систем · 85+ маркеров
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in">
            <span className="text-foreground">Что мы </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">измеряем</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Все системы взаимосвязаны — мы анализируем их комплексно
          </p>
        </div>

        {/* TEMP: Icon variants preview for endocrine system */}
        <div className="max-w-4xl mx-auto mb-12 p-6 rounded-2xl bg-card/60 border border-border/40">
          <h3 className="text-lg font-bold text-foreground mb-4 text-center">
            Варианты иконок для эндокринной системы
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { Icon: ThyroidIcon, label: "V1 — Щитовидка" },
              { Icon: EndocrineBodyIcon, label: "V2 — Силуэт с железами" },
              { Icon: HormoneMoleculeIcon, label: "V3 — Молекула гормона" },
              { Icon: HormoneCycleIcon, label: "V4 — Капля + цикл" },
              { Icon: HormoneBalanceIcon, label: "V5 — Баланс сфер" },
              { Icon: AdrenalWaveIcon, label: "V6 — Надпочечник + волна" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/40 border border-border/30"
              >
                <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronLeft className="w-4 h-4 animate-pulse" />
            <span className="font-medium">Выберите систему организма</span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
          <div className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border/40 overflow-x-auto max-w-full scrollbar-hide shadow-md">
            {biomarkerCategories.map((c, i) => (
              <button
                key={c.id}
                onClick={() => go(i, true)}
                className={`relative px-3 md:px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 shrink-0 ${
                  active === i ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {active === i && (
                  <motion.div
                    layoutId="biomarker-tab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <c.icon className="w-4 h-4" strokeWidth={2} />
                  <span className="hidden md:inline">{c.name.split(" ")[0]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main gallery card */}
        <div className="relative max-w-6xl mx-auto">
          <button
            onClick={prev}
            className="hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={cat.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/40 overflow-hidden shadow-2xl shadow-primary/[0.03]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
                {/* Image side */}
                <div className="relative flex items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-muted/80 via-muted/40 to-transparent">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent" />
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="relative w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain drop-shadow-2xl"
                  />
                  <div className="absolute bottom-6 left-6 lg:bottom-8 lg:left-8">
                    <div className="flex items-baseline gap-1.5 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 shadow-lg">
                      <span className="text-3xl font-bold text-foreground">{cat.markers.length}</span>
                      <span className="text-sm text-muted-foreground">маркеров</span>
                    </div>
                  </div>
                  <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {active + 1} / {biomarkerCategories.length}
                    </span>
                  </div>
                </div>

                {/* Content side */}
                <CategoryContent cat={cat} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots with arrows */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {biomarkerCategories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, true)}
                  className={`transition-all duration-300 rounded-full ${
                    active === i ? "w-8 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
