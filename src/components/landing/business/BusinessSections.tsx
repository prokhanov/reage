import {
  AlarmClock,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Crown,
  Eye,
  EyeOff,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  UserRoundCheck,
  Users,
} from "lucide-react";

/* ---------------- 2. Цена бездействия ---------------- */

// TODO: заменить на реальные данные
const inaction = [
  { icon: <TrendingDown className="w-5 h-5" />, value: "до 12 дней", label: "в год теряет сотрудник на больничных и низкой работоспособности" },
  { icon: <AlarmClock className="w-5 h-5" />, value: "6 из 10", label: "сотрудников не проходят обследование без организации со стороны компании" },
  { icon: <Users className="w-5 h-5" />, value: "×2,5", label: "стоимость замены ключевого специалиста относительно его годовой зарплаты" },
];

export function CostOfInactionBlock() {
  return (
    <section className="relative py-16 md:py-24 border-y border-border/40 bg-muted/10">
      <div className="container mx-auto px-6 max-w-7xl grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight text-foreground">
            Компания платит за незамеченные отклонения — просто не видит эту строку в бюджете
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Выгорание ключевых людей, длительные больничные, падение продуктивности и внезапно
            найденные состояния у топ-менеджмента — это не медицинская, а операционная проблема.
          </p>
        </div>
        <div className="grid gap-4">
          {inaction.map((i) => (
            <div
              key={i.label}
              className="flex items-start gap-5 p-6 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {i.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{i.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{i.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 3. Зачем это компании ---------------- */

const values = [
  {
    icon: <UserRoundCheck className="w-6 h-6" />,
    title: "Удержание ключевых людей",
    text: "Программа адресована тем, кого нельзя заменить быстро: руководителям, экспертам, продающим командам.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Аргумент в найме, который заметен",
    text: "Не «ДМС как у всех», а персональная программа с отчётом врача — то, о чём кандидат рассказывает сам.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Измеримая динамика год к году",
    text: "Обезличенный срез по группе: сколько сотрудников улучшили показатели, где риски концентрируются.",
  },
  {
    icon: <Crown className="w-6 h-6" />,
    title: "Отдельный уровень для C-level",
    text: "Расширенная панель и персональное сопровождение для собственников и топ-менеджмента.",
  },
];

export function BusinessValueBlock() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-12">
          <span className="text-foreground">Что это даёт </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">бизнесу</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <div
              key={v.title}
              className={`group p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-500 ${
                i % 3 === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                {v.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{v.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. Персоны ---------------- */

const personas = [
  {
    role: "HR / People-директор",
    question: "«Как показать, что забота работает?»",
    answer:
      "Обезличенный отчёт по группе с динамикой год к году: вовлечённость в программу, доля сотрудников с улучшением показателей, зоны риска по команде.",
  },
  {
    role: "Собственник / CEO",
    question: "«Что это даёт бизнесу?»",
    answer:
      "Меньше внезапных выпадений ключевых людей, ощутимая для команды забота и собственная программа с расширенным сопровождением.",
  },
  {
    role: "Финансовый директор",
    question: "«Как считается бюджет?»",
    answer:
      "Прозрачная стоимость за сотрудника, договор и закрывающие документы для юрлица, возможность стартовать с пилотной группы.",
  },
];

export function PersonasBlock() {
  return (
    <section className="relative py-16 md:py-24 border-y border-border/40 bg-muted/10">
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-12">
          <span className="text-foreground">Кому внутри компании </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">это нужно</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((p) => (
            <div key={p.role} className="p-8 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-4">
                {p.role}
              </div>
              <p className="text-lg font-semibold text-foreground mb-3">{p.question}</p>
              <p className="text-muted-foreground leading-relaxed">{p.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. Сотрудник vs компания ---------------- */

const employeeItems = [
  { icon: <HeartPulse className="w-4 h-4" />, text: "Биологический возраст и состояние 5 систем организма" },
  { icon: <FileCheck2 className="w-4 h-4" />, text: "Отчёт с расшифровкой и рекомендациями, проверенный врачом" },
  { icon: <ClipboardCheck className="w-4 h-4" />, text: "Персональный план: нутрицевтики, питание, обследования" },
  { icon: <BarChart3 className="w-4 h-4" />, text: "Личный кабинет с динамикой и AI-ассистентом" },
];

const companyItems = [
  { icon: <Users className="w-4 h-4" />, text: "Обезличенный срез по группе: участие и охват" },
  { icon: <BarChart3 className="w-4 h-4" />, text: "Распределение зон риска по системам организма" },
  { icon: <CalendarClock className="w-4 h-4" />, text: "Динамика показателей группы год к году" },
  { icon: <EyeOff className="w-4 h-4" />, text: "Никаких персональных результатов конкретного сотрудника" },
];

export function CompanyVsEmployeeBlock() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-4">
          <span className="text-foreground">Сотрудник видит всё. </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">Компания — только цифры по группе</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Это условие, без которого программа не работает: люди участвуют только тогда, когда
          уверены, что результаты не попадут к работодателю.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-3xl bg-card/60 border border-primary/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Что видит сотрудник</h3>
            </div>
            <ul className="space-y-4">
              {employeeItems.map((i) => (
                <li key={i.text} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-1 text-primary">{i.icon}</span>
                  <span className="leading-relaxed">{i.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-card/40 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Что видит компания</h3>
            </div>
            <ul className="space-y-4">
              {companyItems.map((i) => (
                <li key={i.text} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-1 text-foreground/60">{i.icon}</span>
                  <span className="leading-relaxed">{i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 7. Форматы программы ---------------- */

const formats = [
  {
    icon: <Users className="w-6 h-6" />,
    title: "Программа для команды",
    text: "Годовое наблюдение для всех сотрудников или выбранных подразделений. Организуем забор анализов и сопровождение.",
    note: "от 10 человек",
  },
  {
    icon: <Crown className="w-6 h-6" />,
    title: "Программа для руководителей",
    text: "Расширенная панель биомаркеров, приоритетные сроки и персональное сопровождение врача.",
    note: "C-level и ключевые эксперты",
    featured: true,
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Пилот на группу",
    text: "Небольшая группа, полный цикл за квартал, затем решение о масштабировании на компанию.",
    note: "быстрый старт",
  },
];

export function ProgramFormatsBlock() {
  return (
    <section className="relative py-16 md:py-24 border-y border-border/40 bg-muted/10">
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-4">
          <span className="text-foreground">Форматы </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">программы</span>
        </h2>
        <p className="text-lg text-muted-foreground mb-12">
          Стоимость зависит от объёма и состава панели — рассчитаем под вашу команду.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {formats.map((f) => (
            <div
              key={f.title}
              className={`p-8 rounded-3xl backdrop-blur-sm border transition-all duration-500 hover:-translate-y-1 ${
                f.featured
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card/50 border-border/50 hover:border-primary/30"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center text-primary mb-5">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">{f.text}</p>
              <span className="inline-flex text-xs uppercase tracking-[0.15em] text-primary/80">
                {f.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 8. Как запускаем ---------------- */

const steps = [
  { icon: <ClipboardCheck className="w-5 h-5" />, title: "Расчёт и согласование", text: "Обсуждаем объём, состав панели и формат. Готовим смету и договор." },
  { icon: <FlaskConical className="w-5 h-5" />, title: "Забор анализов", text: "Организуем сдачу в лаборатории или выезд к офису — Москва и Санкт-Петербург." },
  { icon: <FileCheck2 className="w-5 h-5" />, title: "Отчёты и планы", text: "Каждый сотрудник получает персональный отчёт, проверенный врачом. Срок — до 10 рабочих дней." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Квартальный обзор", text: "Динамика показателей и обезличенный отчёт по группе для компании." },
];

export function OnboardingTimeline() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-12">
          <span className="text-foreground">Как </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">запускаем</span>
        </h2>
        <div className="grid md:grid-cols-4 gap-6 relative">
          <div
            aria-hidden
            className="hidden md:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="w-12 h-12 rounded-full bg-card border border-primary/30 flex items-center justify-center text-primary mb-5 relative z-10">
                {s.icon}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
                Шаг {i + 1}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 9. Безопасность и документы ---------------- */

const trust = [
  { icon: <ShieldCheck className="w-5 h-5" />, title: "152-ФЗ", text: "Обработка персональных данных по требованиям российского законодательства." },
  { icon: <Lock className="w-5 h-5" />, title: "Хранение в РФ", text: "Данные сотрудников хранятся на серверах на территории России." },
  { icon: <EyeOff className="w-5 h-5" />, title: "Обезличивание", text: "Компания получает только агрегированную статистику по группе." },
  { icon: <FileCheck2 className="w-5 h-5" />, title: "Врачебная верификация", text: "Каждый отчёт проверяет врач до публикации сотруднику." },
];

export function TrustComplianceBlock() {
  return (
    <section className="relative py-16 md:py-24 border-y border-border/40 bg-muted/10">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight text-foreground">
              Безопасность данных и документы для юрлица
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Работаем по договору с ООО «Реэйдж», предоставляем закрывающие документы.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/legal/documents"
                className="inline-flex items-center px-5 py-2.5 rounded-full border border-border/60 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                Все документы
              </a>
              <a
                href="/legal/requisites"
                className="inline-flex items-center px-5 py-2.5 rounded-full border border-border/60 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                Реквизиты
              </a>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {trust.map((t) => (
              <div key={t.title} className="p-6 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {t.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
