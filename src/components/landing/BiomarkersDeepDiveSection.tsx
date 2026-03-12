import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import systemEnergy from "@/assets/system-energy.png";
import systemHeart from "@/assets/system-heart.png";
import systemImmune from "@/assets/system-immune.png";
import systemEndocrine from "@/assets/system-endocrine.png";
import systemMetabolism from "@/assets/system-metabolism.png";
import systemKidneys from "@/assets/system-kidneys.png";

const biomarkerCategories = [
  {
    id: "energy",
    emoji: "⚡",
    name: "Энергия и восстановление",
    image: systemEnergy,
    markers: ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Коэнзим Q10", "Малоновый диальдегид", "Антиоксидантный статус", "Магний", "B12", "B9 (фолат)", "Цинк", "Селен", "Альбумин", "Лактат", "Бета-каротин", "Витамин A", "Витамин E"],
    insights: ["Откуда берётся постоянная усталость", "Насколько эффективно клетки производят энергию", "Есть ли скрытые дефициты витаминов и минералов", "Как быстро организм восстанавливается после нагрузки"],
    risks: ["Инсулинорезистентность", "Преддиабет", "Гипергликемия", "Дефицит B12", "Дефицит магния", "Дефицит цинка", "Дефицит селена", "Оксидативный стресс", "Митохондриальная дисфункция", "Хроническая усталость"]
  },
  {
    id: "cardio",
    emoji: "❤️",
    name: "Сердечно-сосудистая система",
    image: systemHeart,
    markers: ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "ApoA1", "ApoB", "ApoB/ApoA1", "не-HDL холестерин", "Индекс атерогенности", "Гомоцистеин", "Lp(a)", "Ферритин", "Железо", "Трансферрин", "Медь", "NT-proBNP", "КФК"],
    insights: ["Как выглядит ваш липидный профиль в деталях", "В каком состоянии сосудистая стенка", "Баланс «плохого» и «хорошего» холестерина", "Есть ли скрытые маркеры, указывающие на нагрузку на сердце"],
    risks: ["Риск атеросклероза", "Дислипидемия", "Гиперхолестеринемия", "Риск тромбоза", "Кардиоваскулярный риск", "Гипергомоцистеинемия", "Эндотелиальная дисфункция", "Нарушение липидного профиля", "Анемия", "Дефицит железа"]
  },
  {
    id: "immune",
    emoji: "🛡️",
    name: "Воспалительная и иммунная система",
    image: systemImmune,
    markers: ["Гемоглобин", "Эритроциты", "Гематокрит", "MCV", "MCH", "MCHC", "RDW", "RDW-SD", "Лейкоциты", "Нейтрофилы", "Нейтрофилы (абс.)", "Лимфоциты", "Лимфоциты (абс.)", "Моноциты", "Моноциты (абс.)", "Эозинофилы", "Эозинофилы (абс.)", "Базофилы", "Базофилы (абс.)", "Тромбоциты", "MPV", "PDW", "PCT", "CD3+", "CD4+", "CD8+", "CD19+", "NK-клетки", "СОЭ", "CRP", "IL-6", "TNF-α", "IgM", "IgG", "Фибриноген", "Протромбиновое время", "Тромбиновое время", "МНО", "АЧТВ"],
    insights: ["Как работает иммунная защита организма", "Есть ли скрытое хроническое воспаление", "Полная картина клеточного и гуморального иммунитета", "Состояние свёртывающей системы крови"],
    risks: ["Хроническое воспаление", "Системное воспаление", "Снижение иммунитета", "Аутоиммунные риски", "Нарушение гемопоэза", "Нарушение свёртываемости", "Хроническая гипоксия", "Ускоренное старение"]
  },
  {
    id: "endocrine",
    emoji: "🧬",
    name: "Эндокринная и стрессовая система",
    image: systemEndocrine,
    markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "Анти-ТПО", "Анти-ТГ", "TRAb", "Тестостерон", "Эстрадиол", "Эстрон", "Эстриол", "SHBG", "Кортизол", "DHEA-S", "Витамин D", "IGF-1"],
    insights: ["Полная картина гормонального баланса", "Как работает щитовидная железа и есть ли аутоиммунный компонент", "Уровень хронического стресса по кортизолу и DHEA-S", "Баланс половых гормонов и их влияние на самочувствие"],
    risks: ["Гипотиреоз", "Гипертиреоз", "Дефицит витамина D", "Гормональный дисбаланс", "Хронический стресс", "Надпочечниковая усталость", "Дефицит тестостерона", "Избыток эстрогенов", "Нарушение кортизолового ритма", "Снижение фертильности"]
  },
  {
    id: "metabolism",
    emoji: "🔄",
    name: "Обмен веществ и детоксикация",
    image: systemMetabolism,
    markers: ["ALT", "AST", "GGT", "Билирубин", "ALP", "Общий белок", "Трансферрин", "Мочевая кислота", "Витамин K1"],
    insights: ["Насколько эффективно работает печень", "Как организм справляется с детоксикацией", "Состояние белкового обмена и запасов белка", "Уровень мочевой кислоты и пуринового обмена"],
    risks: ["Нарушение функции печени", "Жировой гепатоз", "Фиброз печени", "Токсическая нагрузка", "Нарушение детоксикации", "Подагра", "Гиперурикемия", "Нарушение белкового обмена"]
  },
  {
    id: "kidneys",
    emoji: "💧",
    name: "Почки и водно-солевой баланс",
    image: systemKidneys,
    markers: ["Креатинин", "Мочевина", "Цистатин С", "Натрий", "Калий", "Хлор", "Кальций", "Фосфор", "pH", "Удельный вес", "Белок", "Глюкоза", "Кетоны", "Уробилиноген", "Билирубин", "Гемоглобин", "Нитриты", "Лейкоциты", "Эритроциты"],
    insights: ["Насколько хорошо работают почки", "Баланс ключевых электролитов в организме", "Полный анализ мочи для оценки функции почек", "Состояние минерального обмена"],
    risks: ["Почечная недостаточность", "Нефропатия", "Нарушение электролитного баланса", "Гиперкалиемия", "Гипонатриемия", "Нарушение водно-солевого баланса", "Риск мочекаменной болезни", "Дефицит кальция"]
  }
];

function CategoryContent({ cat }: { cat: typeof biomarkerCategories[0] }) {
  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-6">
      <h3 className="text-2xl md:text-3xl font-bold text-foreground">
        {cat.emoji} {cat.name}
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
            6 систем · 85+ маркеров
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
                  <span className="text-base">{c.emoji}</span>
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

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {biomarkerCategories.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`transition-all duration-300 rounded-full ${
                  active === i ? "w-8 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
