import { Bell, CreditCard, Send } from "lucide-react";

import { ThemedLogo } from "@/components/ThemedLogo";
import { Button } from "@/components/ui/button";
import { CHECKUPS, money } from "@/data/checkups";
import { FULL_CHECKUP, FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";

export const TELEGRAM_URL = "https://t.me/reage_life";
export const COMMISSION_RATE = 0.2;
export const CLIENT_DISCOUNT_RATE = 0.05;

const PRICE = FULL_CHECKUP.price;
const DISCOUNT = Math.round(PRICE * CLIENT_DISCOUNT_RATE);
const CLIENT_PRICE = PRICE - DISCOUNT;
export const PAYOUT = Math.round(PRICE * COMMISSION_RATE);

export const NAV = [
  { href: "#how", label: "Как это работает" },
  { href: "#bonus", label: "Бонусы" },
  { href: "#income", label: "Доход" },
  { href: "#faq", label: "Вопросы" },
];

export function PartnersHeader({ onJoin }: { onJoin: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center justify-between px-4 md:h-16 md:px-6">
        <a href="/partners" aria-label="ReAge" className="flex items-center">
          <ThemedLogo className="h-[2.7rem] w-auto" eager />
        </a>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Разделы страницы">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Button size="sm" className="h-10 rounded-full px-5" onClick={onJoin}>
          Подключиться
        </Button>
      </div>
    </header>
  );
}

/** Карточка расчёта: сколько получает клиент и партнёр. */
export function CommissionCard() {
  const rows = [
    { label: "Цена чекапа", hint: "полный чекап на сайте", value: money(PRICE), strong: true },
    {
      label: "Скидка клиента",
      hint: `${CLIENT_DISCOUNT_RATE * 100}% по вашему коду`,
      value: `−${money(DISCOUNT)}`,
      accent: "text-destructive",
    },
    {
      label: "Клиент платит",
      hint: `${money(PRICE)} − ${CLIENT_DISCOUNT_RATE * 100}%`,
      value: money(CLIENT_PRICE),
      strong: true,
    },
    {
      label: "Ваша комиссия",
      hint: "по вашему коду",
      value: `${COMMISSION_RATE * 100}%`,
    },
  ];

  return (
    <div className="rounded-2xl border hairline bg-card p-6 shadow-md sm:p-7">
      <p className="text-sm font-medium text-muted-foreground">
        Полный чекап · {FULL_CHECKUP_MARKERS_COUNT} маркеров
      </p>
      <div className="mt-4 divide-y divide-border/70">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm text-foreground">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <p
              className={`whitespace-nowrap text-base font-bold ${
                row.accent ?? "text-foreground"
              }`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 rounded-xl bg-success-soft px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">Вам на карту</p>
        <p className="whitespace-nowrap text-2xl font-bold text-foreground">{money(PAYOUT)}</p>
      </div>
    </div>
  );
}

/** Уведомление о выплате — как пуш на телефоне. */
export function PayoutNotification() {
  return (
    <div className="flex w-fit max-w-full items-start gap-3 rounded-2xl bg-foreground p-3.5 pr-5 text-background shadow-xl sm:p-4 sm:pr-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success text-success-foreground sm:h-10 sm:w-10">
        <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold leading-tight sm:text-lg">+{money(PAYOUT)}</p>
        <p className="mt-0.5 text-sm leading-snug text-background/70">
          Ваш пациент сдал анализы. Выплата отправлена на карту.
        </p>
      </div>
    </div>
  );
}

export function PartnersHero({ onJoin }: { onJoin: () => void }) {
  return (
    <section className="cv-section bg-background">
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-10 px-4 py-12 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20 md:px-6">
        <div className="flex flex-col items-start">
          <span className="rounded-full border hairline bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Партнёрская программа для специалистов
          </span>
          <h1 className="mt-5 max-w-[26rem] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl sm:leading-[1.06]">
            Направьте клиента — остальное сделаем мы
          </h1>
          <p className="mt-5 max-w-[30rem] text-lg text-muted-foreground">
            Нутрициологам, терапевтам и частнопрактикующим врачам. Клиенту — скидка{" "}
            {CLIENT_DISCOUNT_RATE * 100}% на чекап, вам — {COMMISSION_RATE * 100}% с каждой покупки.
            Анализы, отчёт и поддержку берём на себя.
          </p>
          <div className="mt-8 flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row">
            <Button asChild className="h-12 rounded-full px-7 text-base font-semibold">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Send className="mr-2 h-4 w-4" aria-hidden />
                Подключиться за 1 минуту
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-2 px-7 text-base font-semibold"
            >
              <a href="#how">Как это работает</a>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CommissionCard />
          <PayoutNotification />
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "115+", label: "маркеров в полном чекапе" },
  { value: "50 стр.", label: "персональный отчёт с разбором" },
  { value: "25%", label: "суммарная выплата" },
  { value: "24 часа", label: "до выплаты на карту" },
];

export function StatsStrip() {
  return (
    <section className="cv-section bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-10 md:px-6">
        <div className="grid grid-cols-2 gap-6 rounded-2xl border hairline bg-card p-6 sm:p-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center lg:text-left">
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PARTNER_TYPES = [
  { title: "Терапевты, эндокринологи\nи превентологи" },
  { title: "Нутрициологи\nи диетологи" },
  { title: "Тренеры, спортивные врачи\nи спортсмены" },
  { title: "Велнес-коучи\nи блогеры о здоровье" },
];

/** Для кого программа — по образцу референса. */
export function WhoCanPartner() {
  return (
    <section className="cv-section bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-success-soft px-4 py-1.5 text-xs font-medium text-foreground">
            Для кого программа
          </span>
          <h2 className="mt-5 max-w-xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Кто может стать
            <br />
            партнёром ReAge?
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {PARTNER_TYPES.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-2xl bg-card px-6 py-8 text-center shadow-sm sm:py-10"
            >
              <h3 className="whitespace-pre-line font-display text-xl font-medium leading-snug sm:text-2xl">
                {item.title}
              </h3>
              <Button asChild className="mt-5 h-10 rounded-full px-6 font-semibold">
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                  Подключиться
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    num: "01",
    title: "Подключаетесь",
    text: "Один клик через Telegram. Ваш код, ссылка и QR появляются сразу — без анкет и ожидания одобрения.",
  },
  {
    num: "02",
    title: "Рекомендуете",
    text: "Отправляете клиенту ссылку или показываете QR на приёме. Скидка 5% применяется автоматически.",
  },
  {
    num: "03",
    title: "Клиент сдаёт чекап",
    text: "Анализы — в лаборатории рядом с домом. Персональный отчёт и разбор делает ReAge.",
  },
  {
    num: "04",
    title: "Вам 20%",
    text: `Комиссия приходит на карту в течение 24 часов после сдачи анализов. Например, ${money(
      PAYOUT,
    )} за полный чекап.`,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="cv-section scroll-mt-20 bg-background">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Четыре шага до первой выплаты
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div
              key={step.num}
              className={`rounded-2xl p-6 sm:p-7 ${
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "border hairline bg-card shadow-sm"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  index === 0 ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {step.num}
              </p>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p
                className={`mt-2 text-sm leading-relaxed ${
                  index === 0 ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                {step.text}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
          <Button asChild className="h-12 rounded-full px-7 text-base font-semibold">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Подключиться в Telegram
            </a>
          </Button>
          <Button asChild variant="ghost" className="h-12 rounded-full px-5 text-base font-medium">
            <a href="#income">
              Сколько можно заработать
              <CreditCard className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

const MINI_EARNINGS = CHECKUPS.filter((c) => c.href !== FULL_CHECKUP.href)
  .slice(0, 3)
  .map((c) => ({ name: c.name, price: c.price, payout: Math.round(c.price * COMMISSION_RATE) }));

const EARNINGS = [
  { name: FULL_CHECKUP.name, price: FULL_CHECKUP.price, payout: PAYOUT },
  ...MINI_EARNINGS,
];

export function IncomeSection() {
  return (
    <section id="income" className="cv-section scroll-mt-20 bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Сколько вы зарабатываете</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {COMMISSION_RATE * 100}% от стоимости каждого чекапа, оплаченного по вашему коду.
              Клиенту при этом дешевле — скидка {CLIENT_DISCOUNT_RATE * 100}% по вашему промокоду.
            </p>
            <p className="mt-6 rounded-xl border hairline bg-card p-5 text-sm text-muted-foreground">
              10 чекапов «Энергия» в месяц — примерно{" "}
              <span className="font-bold text-foreground">
                {money(Math.round(5990 * COMMISSION_RATE) * 10)}
              </span>{" "}
              выплаты. Полных чекапов хватит и на большее.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border hairline bg-card shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b hairline text-sm text-muted-foreground">
                  <th className="px-5 py-4 font-medium sm:px-6">Чекап</th>
                  <th className="px-5 py-4 text-right font-medium sm:px-6">Цена</th>
                  <th className="px-5 py-4 text-right font-medium sm:px-6">Вам 20%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {EARNINGS.map((row) => (
                  <tr key={row.name}>
                    <td className="px-5 py-4 text-sm font-medium sm:px-6">{row.name}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold sm:px-6">
                      {money(row.price)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-success sm:px-6">
                      +{money(row.payout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
