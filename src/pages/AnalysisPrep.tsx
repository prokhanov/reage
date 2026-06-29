import { PageMeta } from "@/components/PageMeta";
import { Link } from "react-router-dom";
import {
  Droplet,
  Coffee,
  Dumbbell,
  Pill,
  Cigarette,
  Clock,
  Utensils,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Info,
  Phone,
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
    text: "Большинство анализов крови сдают натощак: последний приём пищи — лёгкий ужин накануне вечером. Не голодайте более 14 часов — организм переходит в другой режим, и показатели могут измениться.",
  },
  {
    icon: Utensils,
    title: "Без алкоголя",
    text: "Не употребляйте алкоголь за 48–72 часа до исследования. Он временно меняет показатели печени, липидов, воспаления и ряда гормонов.",
  },
  {
    icon: Dumbbell,
    title: "Без интенсивных нагрузок",
    text: "За сутки исключите тяжёлые тренировки, баню, сауну, массаж и физиотерапию. После нагрузки организм ещё восстанавливается, и часть показателей может отличаться от привычного уровня.",
  },
  {
    icon: Droplet,
    title: "Утром — только вода",
    text: "Перед сдачей крови можно пить обычную негазированную воду. Кофе, чай, соки и жевательная резинка могут повлиять на результаты.",
  },
];

const EXTRA_RULES: Rule[] = [
  {
    icon: Utensils,
    title: "Питайтесь как обычно",
    text: "За 1–2 дня не меняйте рацион, не переедайте и не начинайте диету. Нам важно увидеть привычное состояние организма, а не картину на фоне изменений.",
  },
  {
    icon: Cigarette,
    title: "Спокойствие и отказ от курения",
    text: "Воздержитесь от курения минимум за 1 час до процедуры. Постарайтесь спать 7–8 часов и перед забором крови спокойно посидите 10–15 минут — это помогает избежать влияния стресса.",
  },
  {
    icon: Pill,
    title: "Лекарства и витамины",
    text: "Если вы принимаете препараты или БАД, заранее обсудите с врачом, нужно ли пропустить утренний приём. Биотин и высокие дозы витамина C желательно отменить за 3 дня до исследования.",
  },
  {
    icon: Coffee,
    title: "После процедуры",
    text: "Если вы плохо переносите длительный голод, возьмите с собой воду и небольшой перекус. Поесть лучше сразу после сдачи крови.",
  },
];

const URINE = [
  "Соберите первую утреннюю мочу сразу после пробуждения.",
  "Перед сбором выполните обычную гигиену без использования мыла в области промежности.",
  "Используйте только стерильный аптечный контейнер.",
  "Для анализа нужна средняя порция мочи: первые секунды мочеиспускания пропустите.",
  "Доставьте контейнер в лабораторию в течение 1–2 часов после сбора.",
  "За сутки до исследования желательно исключить свёклу, морковь, витамины группы B и мочегонные препараты (если их отмена согласована с врачом).",
];

const DONT = [
  "вы болеете ОРВИ, у вас повышена температура или обострилось хроническое заболевание (если исследование не назначено именно для контроля этого состояния);",
  "анализы планируются сразу после рентгенографии, эндоскопических исследований, физиотерапии или других медицинских процедур;",
  "кровь на половые гормоны или общий анализ мочи сдаётся во время менструации;",
  "вы специально меняете режим питания, сна или физической активности, чтобы получить «лучшие» результаты. Для точной оценки нам важно увидеть ваш организм таким, каким он живёт обычно.",
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
              <img src={logoDark} alt="ReAge" className="h-10 md:h-12 w-auto" />
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
            <p className="text-xl md:text-2xl text-foreground font-medium mb-4">
              Чтобы результаты отражали ваше реальное состояние
            </p>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Качество отчёта зависит не только от лаборатории, но и от подготовки к сдаче анализов. Несколько простых правил помогут получить точную картину вашего здоровья и избежать повторной сдачи.
            </p>
          </div>
        </section>

        {/* Main rules */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <CheckCircle2 className="w-7 h-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Самое важное</h2>
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

        {/* Extra recommendations */}
        <section className="border-t border-border/40 bg-card/30">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-10">
                <Info className="w-7 h-7 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">Дополнительные рекомендации</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {EXTRA_RULES.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <article
                      key={rule.title}
                      className="group relative rounded-2xl border border-border/60 bg-background p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
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
              <h2 className="text-2xl md:text-3xl font-bold">Когда лучше перенести сдачу анализов</h2>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Результаты могут быть менее информативными, если:
            </p>
            <div className="space-y-3">
              {DONT.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
                >
                  <span className="text-destructive flex-shrink-0 mt-0.5">•</span>
                  <span className="text-sm md:text-base text-foreground leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-3xl text-center">
          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Phone className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold">Если возникли вопросы</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Если вы сомневаетесь, как подготовиться именно к вашим анализам, свяжитесь с нами заранее. Мы подскажем, как сделать всё правильно и получить максимально достоверные результаты.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
