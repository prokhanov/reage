import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Shield, RefreshCw, Zap, type LucideIcon } from "lucide-react";

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

// Молекула гормона — иконка эндокринной системы
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
    markers: ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "не-HDL холестерин", "Индекс атерогенности", "Ферритин", "ApoA1", "ApoB", "ApoB/ApoA1", "Гомоцистеин", "Lp(a)", "Железо", "Медь", "hs-Troponin I", "NT-proBNP", "Фибриноген", "ПТИ", "МНО", "АЧТВ"],
    insights: ["Как выглядит ваш липидный профиль в деталях", "В каком состоянии ваша сосудистая стенка", "Соотношение «плохого» и «хорошего» холестерина", "Есть ли маркеры, указывающие на риски сердечно-сосудистых заболеваний"],
    risks: ["Риск атеросклероза", "Дислипидемия", "Гиперхолестеринемия", "Риск тромбоза", "Кардиоваскулярный риск", "Гипергомоцистеинемия", "Эндотелиальная дисфункция", "Нарушение липидного профиля", "Анемия", "Дефицит железа"]
  },
  {
    id: "immune",
    icon: Shield as LucideIcon,
    name: "Воспалительная и иммунная система",
    image: systemImmune,
    markers: ["Эритроциты", "Гемоглобин", "Гематокрит", "MCV", "MCH", "MCHC", "RDW", "Тромбоциты", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "Моноциты", "Эозинофилы", "Базофилы", "СОЭ", "CRP (hs-CRP)", "IgM", "IgG", "IL-6", "TNF-α", "Фибриноген", "ПТИ", "МНО", "АЧТВ"],
    insights: ["Как работает ваша иммунная защита", "Есть ли скрытое хроническое воспаление", "Имеются ли в организме признаки аутоиммунных\nпроцессов", "Риски нарушений свёртывания крови и тромбозов"],
    risks: ["Хроническое воспаление", "Системное воспаление", "Снижение иммунитета", "Аутоиммунные риски", "Нарушение гемопоэза", "Нарушение свёртываемости", "Хроническая гипоксия", "Ускоренное старение"]
  },
  {
    id: "endocrine",
    icon: HormoneMoleculeIcon,
    name: "Эндокринная и стрессовая система",
    image: systemEndocrine,
    markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "25-ОН витамин D", "Тестостерон общий", "SHBG", "Кортизол", "DHEA-S", "IGF-1"],
    insights: ["Комплексная оценка состояния вашего гормонального фона", "Как работает ваша щитовидная железа и есть ли аутоиммунные риски", "Уровень хронического стресса по состоянию надпочечников и кортизолу", "Баланс половых гормонов и их влияние на ваше самочувствие"],
    risks: ["Гипотиреоз", "Гипертиреоз", "Дефицит витамина D", "Гормональный дисбаланс", "Хронический стресс", "Дисфункция надпочечников", "Дефицит тестостерона", "Избыток эстрогенов", "Нарушение кортизолового ритма", "Снижение фертильности"]
  },
  {
    id: "metabolism",
    icon: RefreshCw as LucideIcon,
    name: "Метаболизм и детоксикация",
    image: systemMetabolism,
    markers: ["ALT", "AST", "GGT", "Билирубин", "ALP", "Общий белок", "Креатинин", "eGFR", "Мочевина", "Натрий", "Калий", "Хлор", "Кальций", "Мочевая кислота", "Альбумин/креатинин мочи (ACR)", "Общий анализ мочи", "Трансферрин", "Насыщение трансферрина"],
    insights: ["Насколько эффективно работает ваш обмен веществ", "Как ваш организм самостоятельно справляется с детоксикацией", "Задерживается ли в организме лишняя жидкость, создавая нагрузку на сердце и сосуды", "Баланс ключевых электролитов и состояние минерального обмена"],
    risks: ["Нарушение функции печени", "Жировой гепатоз", "Фиброз печени", "Токсическая нагрузка", "Нарушение детоксикации", "Подагра", "Нарушение белкового обмена", "Почечная недостаточность", "Нефропатия", "Нарушение водно-солевого баланса", "Риск мочекаменной болезни", "Дефицит кальция"]
  },
  {
    id: "energy",
    icon: Zap as LucideIcon,
    name: "Энергия и восстановление",
    image: systemEnergy,
    markers: ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Альбумин", "Магний", "КФК", "Витамин B12", "Фолиевая кислота (B9)", "Цинк", "Селен", "Лактат", "Коэнзим Q10", "Малоновый диальдегид", "Антиоксидантный статус", "Индекс окислит. стресса"],
    insights: ["Откуда берётся постоянная усталость и сонливость ", "Насколько эффективно ваши клетки вырабатывают энергию", "Есть ли у вас скрытые дефициты витаминов и минералов", "Как быстро организм восстанавливается после нагрузок"],
    risks: ["Инсулинорезистентность", "Преддиабет", "Гипергликемия", "Дефицит B12", "Дефицит магния", "Дефицит цинка", "Дефицит селена", "Оксидативный стресс", "Митохондриальная дисфункция", "Синдром хронической усталости"]
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
              <span className="text-sm text-foreground/80 whitespace-pre-line">{insight}</span>
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
            5 систем · 85+ биомаркеров
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in">
            <span className="text-foreground">Что мы </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">измеряем</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Все системы взаимосвязаны — мы анализируем их комплексно
          </p>
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
                  active === i ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
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
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const n = cat.markers.length;
                          const mod10 = n % 10;
                          const mod100 = n % 100;
                          if (mod10 === 1 && mod100 !== 11) return "маркер";
                          if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "маркера";
                          return "маркеров";
                        })()}
                      </span>
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
