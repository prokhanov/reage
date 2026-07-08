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

// Small marker chip with mini-scale
const MarkerChip = ({
  name,
  value,
  unit,
  p,
  color,
  label,
}: {
  name: string;
  value: string;
  unit: string;
  p: number;
  color: string;
  label: string;
}) => (
  <div className="rounded-lg border border-border/40 bg-card/50 p-2.5 space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold truncate">{name}</span>
      <span className="text-[10px] font-medium" style={{ color }}>
        {label}
      </span>
    </div>
    <div className="relative h-1 rounded-full bg-gradient-to-r from-red-500/30 via-emerald-500/40 to-red-500/30">
      <div
        className="absolute -top-0.5 w-2 h-2 rounded-full border border-background"
        style={{ left: `${p}%`, background: color, transform: "translateX(-50%)" }}
      />
    </div>
    <div className="text-[10px] text-muted-foreground">
      {value} <span>{unit}</span>
    </div>
  </div>
);

// 1. Подробная расшифровка анализов
const PageBiomarkers = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Расшифровка анализов
    </div>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      Проанализировано <span className="font-semibold text-foreground">135 биомаркеров</span> по пяти ключевым системам организма.
      Углеводный обмен и липидный профиль находятся в превосходном состоянии: гликированный
      гемоглобин <span className="font-semibold">5.05%</span> и HOMA-IR в нижней трети нормы говорят
      о высокой чувствительности тканей к инсулину и низком риске метаболических нарушений.
    </p>

    <div className="grid grid-cols-2 gap-2">
      <MarkerChip name="HbA1c" value="5.05" unit="%" p={35} color="hsl(142 71% 45%)" label="Оптимально" />
      <MarkerChip name="Витамин D" value="74.35" unit="нг/мл" p={70} color="hsl(142 71% 45%)" label="Оптимально" />
      <MarkerChip name="Нейтрофилы" value="79.13" unit="%" p={88} color="hsl(25 95% 53%)" label="Риск" />
      <MarkerChip name="Тестостерон" value="0.16" unit="нмоль/л" p={12} color="hsl(0 84% 60%)" label="Критично" />
    </div>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      На фоне сильных систем выделяется несколько зон внимания. Тестостерон значительно ниже
      оптимальных значений — это ключевой анаболический гормон, и его дефицит проявляется
      усталостью, снижением выносливости и когнитивной активности. Повышенные нейтрофилы и
      сниженный альбумин формируют картину вялотекущего системного воспаления (inflammaging),
      одного из главных факторов биологического старения.
    </p>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      Гомоцистеин <span className="font-semibold">9.79 мкмоль/л</span> формально в норме, но выше
      оптимального порога <span className="font-semibold">&lt;8</span> — указывает на субоптимальный
      метаболизм витаминов группы B и требует поддержки фолатами и B12.
    </p>
  </div>
);

// 2. Связи между показателями
const PageConnections = () => {
  const links = [
    { from: "HbA1c", to: "Чувствительность к инсулину", note: "Долгосрочный контроль глюкозы определяет инсулинорезистентность и риск метаболического синдрома." },
    { from: "Тестостерон ↓", to: "Энергия и мышцы", note: "Низкий тестостерон снижает анаболический тонус, выносливость, скорость восстановления и плотность костей." },
    { from: "Нейтрофилы ↑ + Альбумин ↓", to: "Inflammaging", note: "Сочетание этих маркеров — типичная картина хронического воспаления низкой интенсивности, ускоряющего старение." },
    { from: "Гомоцистеин ↑", to: "Сердечно-сосудистый риск", note: "Указывает на дефицит B6, B12 и фолиевой кислоты, повышает риск эндотелиальной дисфункции." },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Связи между показателями
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/85">
        Организм работает как единая сеть — изолированный показатель редко объясняет причину.
        Мы анализируем, как биомаркеры влияют друг на друга, и показываем цепочки, которые
        формируют общую картину вашего здоровья.
      </p>

      <div className="space-y-2.5">
        {links.map((l, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-card/50 p-2.5">
            <div className="text-[11px] font-semibold">
              {l.from} <span className="text-muted-foreground">→</span> {l.to}
            </div>
            <p className="text-[11px] text-foreground/75 leading-relaxed mt-1">{l.note}</p>
          </div>
        ))}
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
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Баланс систем организма
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/85">
        Фундаментальные системы организма функционируют на высоком уровне — это и определяет
        биологический возраст ниже хронологического. Превосходные показатели углеводного обмена
        и липидного профиля компенсируют локальные отклонения.
      </p>

      {/* Compact bars */}
      <div className="rounded-lg border border-border/40 bg-card/50 p-3 space-y-2">
        {systems.map((s) => (
          <div key={s.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium truncate pr-2">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.score}</span>
            </div>
            <Bar value={s.score} color={s.color} />
          </div>
        ))}
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/85">
        <span className="font-semibold">Зона роста — гормональная и иммунная сферы.</span>{" "}
        Снижены анаболические гормоны (тестостерон, DHEA-S), есть признаки лёгкого системного
        воспаления. Это не критично, но требует целенаправленной поддержки: восстановление
        гормонального статуса даст прирост энергии, выносливости и улучшит регенерацию тканей.
      </p>

      <p className="text-[12px] leading-relaxed text-foreground/85">
        Эндокринная система получила <span className="font-semibold">80/100</span> — самый низкий
        балл среди пяти систем. На ближайшие 3 месяца это приоритетная зона работы.
      </p>
    </div>
  );
};

// 4. Биологический возраст
const PageBioAge = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Биологический возраст
    </div>

    {/* Smaller hero tile */}
    <div className="rounded-xl border border-border/40 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Биологический</div>
          <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-none">
            34.5
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">из 38 хроно</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground mb-0.5">Моложе на</div>
          <div className="text-xl font-bold text-emerald-500">−3.5 года</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Индекс здоровья 91/100</div>
        </div>
      </div>
    </div>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      Биологический возраст рассчитывается по совокупности 135 показателей с учётом их веса
      в процессах старения. Значение <span className="font-semibold">34.5 года</span> при
      хронологическом возрасте 38 — отличный результат, обусловленный сильным углеводным
      обменом (HbA1c, HOMA-IR), благоприятным липидным профилем (ApoB/A1, hs-CRP) и низким
      уровнем системного воспаления.
    </p>

    <div className="rounded-lg border border-border/40 bg-card/50 p-3 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Что ускоряет старение
      </div>
      {[
        { name: "Тестостерон общий", note: "ключевой анаболический гормон, влияет на энергию и мышечную массу" },
        { name: "DHEA-S", note: "«гормон молодости», определяет стрессоустойчивость и восстановление" },
        { name: "Альбумин", note: "белковый обмен, маркер общего состояния здоровья" },
      ].map((f) => (
        <div key={f.name} className="flex items-start gap-2 text-[11px]">
          <Activity className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{f.name}</span>
            <span className="text-foreground/70"> — {f.note}</span>
          </div>
        </div>
      ))}
    </div>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      Целевой ориентир на 6 месяцев — снижение биовозраста ещё на 1.5–2 года за счёт работы
      с гормональным статусом и противовоспалительной поддержки.
    </p>
  </div>
);

// 5. Ранние сигналы риска
const PageRisks = () => {
  const risks = [
    {
      name: "Тестостерон общий — 0.16 нмоль/л",
      tag: "Критично",
      tagClr: "text-status-critical bg-status-critical/10",
      text: "Значительно ниже оптимальных значений. Является ключевым анаболическим гормоном — влияет на энергию, либидо, мышечную массу, плотность костей и когнитивные функции. Требует углублённой диагностики и коррекции у эндокринолога.",
    },
    {
      name: "Нейтрофилы — 79.13%",
      tag: "Риск",
      tagClr: "text-status-risk bg-status-risk/10",
      text: "Повышены при норме до 72%. Может свидетельствовать о вялотекущем воспалительном процессе — одном из ключевых факторов старения (inflammaging). Рекомендуется противовоспалительная поддержка и повторный контроль через 8 недель.",
    },
    {
      name: "Гомоцистеин — 9.79 мкмоль/л",
      tag: "Внимание",
      tagClr: "text-status-acceptable bg-status-acceptable/10",
      text: "Формально в пределах нормы, но выше оптимального порога <8 мкмоль/л. Указывает на субоптимальный метаболизм витаминов группы B. Фактор сердечно-сосудистого риска и эндотелиальной дисфункции в перспективе 5–10 лет.",
    },
    {
      name: "Альбумин — 32.1 г/л",
      tag: "Внимание",
      tagClr: "text-status-acceptable bg-status-acceptable/10",
      text: "Снижен — указывает на недостаточный белковый обмен, возможные скрытые воспалительные процессы или нагрузку на печень и почки. Усиливает воспалительный фон и замедляет регенерацию тканей.",
    },
  ];
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Ранние сигналы риска
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/85">
        Четыре показателя требуют внимания: один в критической зоне, один в зоне риска и два —
        формально в норме, но за пределами оптимума. Своевременная коррекция этих маркеров
        предотвращает развитие хронических состояний за горизонтом 3–5 лет.
      </p>

      {risks.map((r) => (
        <div key={r.name} className="rounded-lg border border-border/40 bg-card/50 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[12px] font-semibold">{r.name}</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.tagClr}`}>
              {r.tag}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground/75">{r.text}</p>
        </div>
      ))}
    </div>
  );
};

// 6. Рекомендации врача
const PagePrescriptions = () => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Рекомендации врача
    </div>

    <p className="text-[12px] leading-relaxed text-foreground/85">
      Персональный план составлен с учётом ваших биомаркеров, образа жизни и приоритетных зон
      роста. На 8–12 недель — нутрицевтическая поддержка для снижения воспаления и поддержки
      нервной системы, дальше — повторный контроль и корректировка курса.
    </p>

    <div className="space-y-2">
      {[
        { t: "Магний глицинат", d: "400 мг · вечером · 8 недель — снижение тревожности, улучшение сна и нервно-мышечного восстановления", c: "hsl(280 70% 60%)" },
        { t: "Витамин B6 (P-5-P)", d: "50 мг · утром с едой · 12 недель — нормализация гомоцистеина, поддержка нейромедиаторов", c: "hsl(var(--primary))" },
        { t: "Омега-3 (EPA/DHA)", d: "2000 мг/сут · с едой · постоянно — противовоспалительное действие, поддержка сердца и мозга", c: "hsl(142 71% 45%)" },
        { t: "Кверцетин + биофлавоноиды", d: "500 мг · 2 раза в день · 8 недель — снижение системного воспаления, поддержка иммунной системы", c: "hsl(38 92% 50%)" },
      ].map((r) => (
        <div key={r.t} className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex gap-2.5">
          <div className="w-1 rounded-full shrink-0" style={{ background: r.c }} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold">{r.t}</div>
            <div className="text-[11px] text-foreground/70 mt-0.5 leading-relaxed">{r.d}</div>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
        </div>
      ))}
    </div>

    <div className="rounded-lg border border-border/40 bg-card/50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1.5">
        Образ жизни
      </div>
      <p className="text-[11px] leading-relaxed text-foreground/80">
        Добавить +30 г белка в суточный рацион (поддержка альбумина и анаболизма). Циркадный
        режим сна 23:00–07:00 для естественного восстановления тестостерона и DHEA-S. Силовые
        тренировки 2–3 раза в неделю. Повторный анализ — через 12 недель.
      </p>
    </div>
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
  stopAuto,
}: {
  idx: number;
  setIdx: (i: number) => void;
  dir: number;
  setDir: (d: number) => void;
  stopAuto: () => void;
}) {
  const pages = reportFeatures;
  const go = (delta: number) => {
    stopAuto();
    setDir(delta);
    setIdx((idx + delta + pages.length) % pages.length);
  };

  const page = pages[idx];

  return (
    <div className="relative" onClick={stopAuto}>
      {/* Glow */}
      <div className="absolute -inset-8 bg-gradient-hero opacity-20 blur-3xl rounded-[2rem] pointer-events-none" />

      {/* A4 page frame (1 : √2) */}
      <div
        className="relative mx-auto w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[520px] rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ aspectRatio: "1 / 1.4142" }}
      >
        {/* Page header */}
        <div className="flex items-center justify-center px-3 pt-3 pb-2 sm:px-6 sm:pt-5 sm:pb-3 border-b border-border/40">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide">ReAge · Отчёт</span>
        </div>

        {/* Page content */}
        <div className="relative flex-1 min-h-0 overflow-hidden px-3 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-5">

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
      <div className="flex items-center justify-center gap-2 sm:gap-3 pt-3 sm:pt-4">
        <button
          onClick={() => go(-1)}
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
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
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Следующая страница"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}

// ============ Screenshot preview stack ============
import reportPage01 from "@/assets/landing-v2/report-page-01.png";
import reportPage13 from "@/assets/landing-v2/report-page-13.png";
import reportPage61 from "@/assets/landing-v2/report-page-61.png";

function PreviewCardsRow() {
  const shots = [
    { src: reportPage01, alt: "Титульная страница отчёта ReAge" },
    { src: reportPage13, alt: "Раздел сердечно-сосудистой системы" },
    { src: reportPage61, alt: "Персональные рекомендации" },
  ];
  const [active, setActive] = useState(0);
  const n = shots.length;
  const next = () => setActive((active + 1) % n);
  const prev = () => setActive((active - 1 + n) % n);

  return (
    <div className="relative flex flex-col items-center">
      <div className="absolute -inset-6 bg-gradient-hero opacity-20 blur-3xl rounded-[2rem] pointer-events-none" />

      <div
        className="relative w-full max-w-[580px] mx-auto"
        style={{ aspectRatio: "1 / 1.35" }}
      >
        {shots.map((s, i) => {
          // Position relative to active: 0 = front, 1 = one behind, 2 = two behind (wraps)
          const offset = (i - active + n) % n;
          // Front-most = offset 0
          const styles = [
            // front
            { x: 0, y: 0, scale: 1, rotate: 0, z: 30, opacity: 1 },
            // second (peeks from right)
            { x: 36, y: 18, scale: 0.94, rotate: 3, z: 20, opacity: 0.9 },
            // third (peeks further)
            { x: 68, y: 34, scale: 0.88, rotate: 5, z: 10, opacity: 0.75 },
          ];
          const st = styles[offset] ?? styles[styles.length - 1];
          const isFront = offset === 0;

          return (
            <motion.button
              key={s.alt}
              type="button"
              onClick={() => (isFront ? next() : setActive(i))}
              aria-label={isFront ? "Следующая страница" : `Показать: ${s.alt}`}
              className="absolute inset-0 rounded-xl overflow-hidden border border-border/60 bg-card shadow-[0_25px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              animate={{
                x: st.x,
                y: st.y,
                scale: st.scale,
                rotate: st.rotate,
                opacity: st.opacity,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              style={{ zIndex: st.z, cursor: "pointer" }}
            >
              <img
                src={s.src}
                alt={s.alt}
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover object-top block pointer-events-none"
              />
            </motion.button>
          );
        })}
      </div>

      {/* Nav */}
      <div className="relative z-40 mt-6 flex items-center justify-center gap-3">
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Предыдущая"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {shots.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Страница ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label="Следующая"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ReportShowcaseSection() {
  const bullets = [
    "Целостная картина вашего здоровья",
    "Понимание рисков и причин изменений",
    "Персональные рекомендации и план действий",
    "Динамика показателей во времени",
    "Поддержка врача и сопровождение",
  ];

  return (
    <section className="py-12 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section title */}
        <div className="max-w-7xl mx-auto mb-10 md:mb-14 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-bold leading-tight">
            <span className="text-foreground">Ваш </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              персональный отчёт на понятном языке
            </span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Дорожная карта вашего здоровья: расшифровка всех показателей и персональные рекомендации
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.55fr)] gap-8 lg:gap-10 items-start max-w-7xl mx-auto">
          {/* Left: feature tiles + CTA */}
          <div className="order-2 lg:order-1">
            <ul className="space-y-3 mb-8">
              {reportFeatures.map((f) => {
                const Icon = f.icon;
                return (
                  <li
                    key={f.pageId}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{f.title}</div>
                      <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                        {f.description}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link to="/example-report" className="inline-block">
              <Button size="lg" className="group">
                <Eye className="w-5 h-5 mr-2" />
                Посмотреть пример отчёта
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Right: preview stack */}
          <div className="order-1 lg:order-2">
            <PreviewCardsRow />
          </div>
        </div>
      </div>

    </section>
  );
}
