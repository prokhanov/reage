import { PageMeta } from "@/components/PageMeta";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  HelpCircle,
  Info,
  FlaskConical,
  FileText,
  Stethoscope,
  CreditCard,
  ShieldCheck,
  Scale,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import logoDark from "@/assets/reage-logo-dark.png";

interface QA {
  q: string;
  a: string | React.ReactNode;
}

interface Section {
  id: string;
  num: string;
  icon: LucideIcon;
  title: string;
  items: QA[];
}

const SECTIONS: Section[] = [
  {
    id: "about",
    num: "1",
    icon: Info,
    title: "О сервисе",
    items: [
      {
        q: "Что такое ReAge?",
        a: "Годовая программа наблюдения за здоровьем. Мы организуем регулярную сдачу анализов, собираем результаты в единый отчёт, отслеживаем изменения показателей во времени и помогаем понимать, что происходит с организмом — не только сейчас, но и в динамике.",
      },
      {
        q: "Это чекап?",
        a: "Нет. Чекап — разовое обследование в одной точке времени. ReAge — наблюдение в течение года с несколькими контрольными точками.",
      },
      {
        q: "Это клиника?",
        a: "Нет. Медицинские услуги оказывают лицензированные партнёры. ReAge организует процесс, собирает данные в единый отчёт и предоставляет сервис мониторинга здоровья.",
      },
      {
        q: "Это телемедицина?",
        a: "Нет. Мы не консультируем дистанционно по жалобам и не заменяем приём врача. Задача сервиса — показать состояние организма в цифрах и изменениях.",
      },
      {
        q: "Это генетический тест?",
        a: "Нет. Мы работаем с текущим состоянием организма по анализам крови и другим показателям, а не с ДНК.",
      },
      {
        q: "А чем это лучше генетического теста?",
        a: "Генетика показывает предрасположенность — то, что заложено и не меняется в течение жизни. Это статичная картина, снятая один раз. Она не отражает, как вы сейчас себя чувствуете и как на это влияют сон, питание, нагрузка и стресс — потому что ДНК от этого не меняется.\n\nReAge работает именно с тем, что меняется. Мы показываем текущее состояние организма и то, как оно меняется со временем — а значит, на это можно влиять и видеть результат.",
      },
      {
        q: "Если у меня уже есть генетический тест, зачем мне ReAge?",
        a: "Генетический тест отвечает на вопрос «что заложено». ReAge отвечает на вопрос «что происходит сейчас и как меняется» — это два разных слоя информации, и они не заменяют друг друга. Генетика — статична, ReAge — это процесс наблюдения во времени.",
      },
      {
        q: "Для кого создан ReAge?",
        a: "Для тех, кто хочет понимать состояние здоровья системно, замечать изменения раньше появления симптомов и принимать решения на основе данных, а не ощущений.",
      },
    ],
  },
  {
    id: "biomarkers",
    num: "2",
    icon: FlaskConical,
    title: "Анализы и биомаркеры",
    items: [
      {
        q: "Сколько биомаркеров входит?",
        a: "В зависимости от тарифа — 72, 94 или 104. На сегодняшний день это самый подробный в России сервис подобного формата.",
      },
      {
        q: "Какие системы организма вы анализируете?",
        a: "Отчёт строится вокруг пяти ключевых систем: сердечно-сосудистая, воспалительная, эндокринная, метаболизм и энергия. По каждой системе вы видите отдельную оценку — что в норме, на что стоит обратить внимание и как это меняется от исследования к исследованию.\n\nГлубина анализа внутри каждой системы зависит от тарифа: чем выше тариф, тем больше маркеров охватывает каждую систему и тем точнее картина.",
      },
      {
        q: "Сколько анализов и консультаций входит в год?",
        a: "Базовый — 2 анализа и 2 консультации, Плюс — 3 анализа и 3 консультации, Экспертный — 4 анализа и 4 консультации.",
      },
      {
        q: "Что такое консультация врача?",
        a: "Это разбор вашего отчёта с врачом ReAge — не общий приём, а обсуждение конкретно ваших показателей: что означают цифры, на что стоит обратить внимание, какие рекомендации имеют смысл именно для вас. Количество консультаций в год зависит от тарифа и привязано к контрольным точкам — после каждого анализа.",
      },
      {
        q: "Где сдавать анализы — дома или в клинике?",
        a: "Основной формат — выезд медсестры на дом или в офис. Если удобнее, можно сдать в партнёрской лаборатории самостоятельно.",
      },
      {
        q: "Меня что-то беспокоит между плановыми точками — что делать?",
        a: "Можно докупить дополнительную консультацию или сдать анализы вне плана — напишите в поддержку, и мы организуем внеплановый приём.",
      },
      {
        q: "В каких городах доступен сервис?",
        a: "Выезд медсестры на дом или в офис — Москва. Сдать анализы самостоятельно в партнёрской лаборатории можно в Москве, Санкт-Петербурге и Московской области.",
      },
      {
        q: "Нужна ли подготовка к анализам?",
        a: "Большинство исследований сдаются утром натощак. Перед каждым забором вы получаете подробную инструкцию — полные правила подготовки можно посмотреть на странице /prep.",
      },
      {
        q: "Можно ли сдавать анализы, если принимаю лекарства или БАДы?",
        a: "Зависит от конкретного препарата. Рекомендации по отмене или переносу направляются заранее, индивидуально.",
      },
      {
        q: "Можно сдавать анализы во время болезни?",
        a: "Как правило, нет — острая инфекция искажает результаты. Если заболели перед сдачей, сообщите в поддержку, забор переносится.",
      },
    ],
  },
  {
    id: "report",
    num: "3",
    icon: FileText,
    title: "Отчёт и биологический возраст",
    items: [
      {
        q: "Что входит в отчёт?",
        a: "Результаты анализов, объяснение показателей, оценка систем организма, выявленные особенности, факторы риска, рекомендации по образу жизни.",
      },
      {
        q: "Когда будет готов отчёт?",
        a: "Обычно 7–12 дней после сдачи анализов.",
      },
      {
        q: "Насколько подробный отчёт?",
        a: "В среднем несколько десятков страниц с комментариями и визуализацией результатов.",
      },
      {
        q: "Можно скачать отчёт в PDF?",
        a: "Да. Отчёт доступен в личном кабинете в электронном виде, с возможностью выгрузить PDF. В кабинете также доступны дашборды и разделы для отслеживания динамики показателей со временем — не только текущий отчёт, но и сравнение с предыдущими точками.",
      },
      {
        q: "Что такое биологический возраст?",
        a: "Расчётная метрика, отражающая состояние организма по совокупности показателей. Может отличаться от паспортного возраста.",
      },
      {
        q: "Насколько точен биологический возраст?",
        a: "Это не диагноз и не абсолютное число. Метрика используется как ориентир для отслеживания изменений состояния — её ценность в динамике, а не в одном измерении.",
      },
      {
        q: "Можно ли снизить биологический возраст?",
        a: "Во многих случаях показатели улучшаются при изменении образа жизни — питания, сна, физической активности.",
      },
      {
        q: "Что такое зоны риска и приоритеты в отчёте?",
        a: "Зоны риска — это показатели, которые отклоняются от нормы или меняются в неблагоприятную сторону и требуют внимания в первую очередь. Приоритеты — это порядок, в котором стоит работать с этими показателями: что важно скорректировать сейчас, а что можно просто продолжать наблюдать. Это помогает не теряться в десятках цифр, а понимать, с чего начать.",
      },
      {
        q: "Будут рекомендации по БАДам и витаминам?",
        a: "В отчёте могут упоминаться варианты поддержки питания и образа жизни, но это не медицинское назначение.",
      },
    ],
  },
  {
    id: "doctor",
    num: "4",
    icon: Stethoscope,
    title: "Рекомендации и врач",
    items: [
      {
        q: "Вы ставите диагнозы?",
        a: "Нет.",
      },
      {
        q: "Вы назначаете лечение или лекарства?",
        a: "Нет. Назначения остаются за лечащим врачом — если отчёт показывает основания для консультации, мы направляем к профильному специалисту с готовыми данными.",
      },
      {
        q: "Что делать, если в анализах нашли отклонения?",
        a: "В отчёте указывается, на что стоит обратить внимание и какие шаги стоит рассмотреть дальше.",
      },
      {
        q: "Кто готовит отчёт?",
        a: "Отчёт готовит врач команды ReAge — каждый отчёт проходит многоуровневую врачебную проверку перед отправкой клиенту.",
      },
    ],
  },
  {
    id: "pricing",
    num: "5",
    icon: CreditCard,
    title: "Тарифы и подписка",
    items: [
      {
        q: "Сколько стоит мониторинг?",
        a: "Базовый — 69 990 ₽/год (72 биомаркера, 2 анализа, 2 консультации), Плюс — 134 990 ₽/год (94 биомаркера, 3 анализа, 3 консультации), Экспертный — 239 990 ₽/год (104 биомаркера, 4 анализа, 4 консультации).",
      },
      {
        q: "Чем отличаются тарифы кроме количества маркеров?",
        a: "Количеством заборов анализов и консультаций в течение года. Чем выше тариф, тем чаще точки наблюдения и тем точнее видна динамика.",
      },
      {
        q: "Почему подписка только годовая?",
        a: "Ценность ReAge — в сравнении показателей со временем. Один цикл анализов даёт срез, год наблюдения — динамику, которая и составляет суть продукта.",
      },
      {
        q: "Что входит в стоимость?",
        a: "Организация сдачи анализов, лабораторные исследования, подготовка отчётов, консультации в течение года.",
      },
      {
        q: "Есть скрытые платежи?",
        a: "Нет.",
      },
      {
        q: "Можно подарить ReAge?",
        a: "Да, доступны подарочные сертификаты.",
      },
      {
        q: "Можно оформить на родственника?",
        a: "Да.",
      },
    ],
  },
  {
    id: "security",
    num: "6",
    icon: ShieldCheck,
    title: "Безопасность и доверие",
    items: [
      {
        q: "Кто проводит анализы — своя лаборатория или партнёрская?",
        a: "Лабораторные исследования выполняет наш партнёр — сеть медицинских лабораторий Лабквест. Это аккредитованная лаборатория федерального уровня с собственной логистикой и контролем качества преаналитики.",
      },
      {
        q: "Нужен ли рецепт врача для сдачи анализов?",
        a: "Нет, направление формирует куратор/врач сервиса при подборе программы.",
      },
      {
        q: "Кто увидит мои анализы?",
        a: "Только специалисты, участвующие в подготовке отчёта, и вы сами.",
      },
      {
        q: "Где хранятся данные?",
        a: "На защищённых серверах в соответствии с требованиями законодательства РФ.",
      },
      {
        q: "Можно удалить свои данные?",
        a: "Да, в порядке, предусмотренном законодательством.",
      },
    ],
  },
  {
    id: "comparison",
    num: "7",
    icon: Scale,
    title: "Сравнение и возражения",
    items: [
      {
        q: "Я регулярно сдаю анализы сам — чем ReAge отличается?",
        a: "Лаборатория показывает отдельные результаты. ReAge объединяет их в единую картину, отслеживает изменения и показывает тенденции во времени.",
      },
      {
        q: "Почему нельзя просто сдавать анализы в обычной лаборатории дешевле?",
        a: "Можно. Но это даст отдельные результаты без интерпретации и без сравнения с предыдущей точкой.",
      },
      {
        q: "Почему так дорого по сравнению с обычным чекапом в клинике?",
        a: "В стоимость входит не только анализ, но и врачебная интерпретация, построение динамики год к году и сопровождение в течение года.",
      },
    ],
  },
  {
    id: "practical",
    num: "8",
    icon: HelpCircle,
    title: "Практические вопросы",
    items: [
      {
        q: "Мне 25 лет — нужен ли мне ReAge?",
        a: "Да, если хотите получить базовую точку отсчёта и отслеживать изменения заранее, до появления жалоб.",
      },
      {
        q: "Мне 60 лет — нужен ли мне ReAge?",
        a: "Да. С возрастом регулярное наблюдение становится более значимым.",
      },
      {
        q: "Я чувствую себя отлично — зачем мне это?",
        a: "Многие изменения в организме проявляются задолго до симптомов — в этом и смысл регулярного мониторинга.",
      },
      {
        q: "Что будет через год?",
        a: "История изменений ваших показателей и возможность сравнить текущее состояние с отправной точкой.",
      },
    ],
  },
];

export default function Faq() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SECTIONS.flatMap((s) =>
      s.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    ),
  };

  return (
    <>
      <PageMeta
        title="FAQ — ответы на частые вопросы о ReAge"
        description="Всё о годовой программе наблюдения за здоровьем ReAge: как устроен сервис, какие биомаркеры входят, что в отчёте, тарифы, безопасность данных и сравнение с обычными анализами."
        canonical="/faq"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
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
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Частые вопросы</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Ответы на вопросы{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                о ReAge
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Как устроен сервис, что входит в программу, как готовится отчёт и почему годовое
              наблюдение работает иначе, чем разовый чекап.
            </p>
          </div>
        </section>

        {/* Table of contents */}
        <section className="border-b border-border/40 bg-card/30">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </span>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                      {s.title}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sections */}
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          const isAlt = idx % 2 === 1;
          return (
            <section
              key={section.id}
              id={section.id}
              className={`scroll-mt-20 border-b border-border/40 ${
                isAlt ? "bg-card/30" : ""
              }`}
            >
              <div className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
                <div className="flex items-center gap-4 mb-10">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold mb-1">
                      Раздел {section.num}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                      {section.title}
                    </h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {section.items.map((it, i) => (
                    <details
                      key={i}
                      className="group rounded-2xl border border-border/60 bg-background hover:border-primary/30 transition-colors overflow-hidden"
                    >
                      <summary className="flex items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5 cursor-pointer list-none">
                        <span className="text-base md:text-lg font-semibold text-foreground pr-2">
                          {it.q}
                        </span>
                        <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 group-open:text-primary transition-all flex-shrink-0" />
                      </summary>
                      <div className="px-5 pb-5 md:px-6 md:pb-6 -mt-1">
                        <div className="pt-3 border-t border-border/40 text-muted-foreground leading-relaxed whitespace-pre-line">
                          {it.a}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* Closing CTA */}
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Не нашли ответ?</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Напишите нам — ответим персонально
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Если остались вопросы о программе, тарифах или подготовке к анализам — свяжитесь с
            поддержкой, и мы подробно расскажем именно про ваш случай.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-base font-semibold text-primary-foreground bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all"
          >
            Начать мониторинг
          </Link>
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
