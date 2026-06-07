import { PageMeta } from "@/components/PageMeta";
import { Link } from "react-router-dom";
import {
  Droplet,
  Moon,
  Coffee,
  Dumbbell,
  Pill,
  Cigarette,
  Clock,
  Utensils,
  Activity,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import logoDark from "@/assets/reage-logo-dark.png";

interface Rule {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

const MAIN_RULES: Rule[] = [
  {
    icon: Clock,
    title: "Голод 8–12 часов",
    text: "Большинство биохимических и гормональных анализов сдают натощак. Последний приём пищи — лёгкий ужин накануне до 20:00. Не более 14 часов голода — иначе показатели исказятся.",
  },
  {
    icon: Droplet,
    title: "Можно чистую воду",
    text: "Утром перед забором крови разрешена негазированная вода в обычном объёме. Чай, кофе, соки, жвачка — нельзя: они меняют уровень глюкозы, инсулина и липидов.",
  },
  {
    icon: Utensils,
    title: "За 1–2 дня — обычный рацион",
    text: "Не переедайте, не садитесь на диету и не пробуйте новые продукты. Исключите жирное, жареное, острое и алкоголь минимум за 24 часа — это смажет липидограмму и печёночные пробы.",
  },
  {
    icon: Cigarette,
    title: "Без алкоголя и курения",
    text: "Алкоголь — за 48–72 часа до сдачи (особенно перед печёночными пробами, гормонами и липидами). Не курите минимум за 1 час до забора крови.",
  },
  {
    icon: Dumbbell,
    title: "Без интенсивных нагрузок",
    text: "За 24 часа исключите тяжёлые тренировки, баню, сауну, массаж и физиопроцедуры. Они меняют КФК, АЛТ, АСТ, кортизол и показатели воспаления.",
  },
  {
    icon: Moon,
    title: "Сон и спокойствие",
    text: "Полноценный сон 7–8 часов накануне. Перед забором крови посидите 10–15 минут в спокойствии — стресс и спешка повышают кортизол, глюкозу и лейкоциты.",
  },
  {
    icon: Pill,
    title: "Лекарства и БАД",
    text: "Если принимаете препараты или витамины — обсудите с врачом, можно ли пропустить утренний приём. Биотин (B7) и высокие дозы витамина C искажают гормональные тесты — отмените за 3 дня.",
  },
  {
    icon: Coffee,
    title: "Утро дня анализа",
    text: "Никакого кофе, чая и сигарет. Если плохо переносите голод — возьмите с собой воду и перекус на после процедуры. Приезжайте за 10–15 минут до записи.",
  },
];

const SPECIAL: Rule[] = [
  {
    icon: HeartPulse,
    title: "Гормоны щитовидной железы",
    text: "ТТГ, Т3, Т4 — утром натощак, до 10:00. За 1 месяц отменяют препараты йода и тироксин только по согласованию с эндокринологом.",
  },
  {
    icon: Activity,
    title: "Глюкоза и инсулин",
    text: "Строго натощак, 8–12 часов голода. Без воды с сахаром, жвачки и зубной пасты со сладким вкусом. HbA1c можно сдавать в любое время — он не зависит от еды.",
  },
  {
    icon: Droplet,
    title: "Липидный профиль",
    text: "Холестерин, ЛПНП, ЛПВП, триглицериды — натощак 12 часов. За 2 недели не меняйте обычный рацион, иначе результат не отразит реальную картину.",
  },
  {
    icon: Pill,
    title: "Витамины и минералы",
    text: "Витамин D, B12, ферритин, железо — натощак. Минимум 3 дня до сдачи не принимайте добавки с тем витамином/минералом, который сдаёте.",
  },
];

const URINE = [
  "Соберите утреннюю порцию мочи сразу после пробуждения.",
  "Перед сбором — гигиенический душ без мыла на область промежности.",
  "Используйте стерильный аптечный контейнер.",
  "Соберите среднюю порцию — первые секунды пропустите.",
  "Доставьте в лабораторию в течение 1–2 часов.",
  "За сутки исключите свёклу, морковь, витамины группы B, мочегонные.",
];

const DONT = [
  "Сдавать анализы во время острого ОРВИ, температуры, обострения хронических болезней (кроме случаев контроля).",
  "Делать анализы сразу после рентгена, УЗИ, физиопроцедур, колоноскопии.",
  "Женщинам — сдавать общий анализ мочи и кровь на половые гормоны во время менструации.",
  "Менять привычный режим сна и питания «ради хороших результатов» — вы получите нереальную картину.",
];

export default function AnalysisPrep() {
  return (
    <>
      <PageMeta
        title="Памятка перед сдачей анализов — ReAge"
        description="Как правильно подготовиться к анализам крови и мочи: голод, вода, лекарства, нагрузки и сон. Подробные правила и особенности по типам анализов."
        canonical="/analysis-prep"
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoDark} alt="ReAge" className="h-7 w-auto" />
            </Link>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              На главную
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

          <div className="relative container mx-auto px-4 py-16 md:py-24 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <HeartPulse className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Подготовка к анализам</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Памятка перед{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                сдачей анализов
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Точность результатов на 70% зависит от подготовки. Эти простые правила помогут получить
              достоверную картину вашего здоровья и избежать пересдачи.
            </p>
          </div>
        </section>

        {/* Main rules */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <CheckCircle2 className="w-7 h-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Основные правила</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {MAIN_RULES.map((rule) => {
                const Icon = rule.icon;
                return (
                  <article
                    key={rule.title}
                    className="group relative rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-2 text-foreground">{rule.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{rule.text}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Special analyses */}
        <section className="border-y border-border/40 bg-card/30">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="flex items-center gap-3 mb-10">
              <Activity className="w-7 h-7 text-accent" />
              <h2 className="text-2xl md:text-3xl font-bold">Особенности по типам анализов</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {SPECIAL.map((rule) => {
                const Icon = rule.icon;
                return (
                  <article
                    key={rule.title}
                    className="rounded-2xl border border-border/60 bg-background p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="w-5 h-5 text-accent" />
                      <h3 className="text-lg font-semibold text-foreground">{rule.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rule.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Urine */}
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <Droplet className="w-7 h-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">Сбор мочи</h2>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
            <ul className="space-y-3">
              {URINE.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Don't */}
        <section className="border-t border-border/40 bg-card/30">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="w-7 h-7 text-destructive" />
              <h2 className="text-2xl md:text-3xl font-bold">Когда сдавать не стоит</h2>
            </div>
            <div className="space-y-3">
              {DONT.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
                >
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base text-foreground leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer note */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Материал носит общеинформационный характер. Точные требования по подготовке к
            конкретному исследованию уточняйте у вашего врача или в лаборатории, в которой вы
            сдаёте анализ.
          </p>
        </section>

        <footer className="border-t border-border/40 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ReAge — премиальный мониторинг здоровья
          </div>
        </footer>
      </div>
    </>
  );
}
