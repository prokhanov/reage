import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { money } from "@/data/checkups";
import { COMMISSION_RATE, PAYOUT, TELEGRAM_URL } from "./PartnersTop";

type Bonus = { who: "you" | "client"; title: string; text: string };

const BONUSES: Bonus[] = [
  { who: "you", title: "Бесплатный чекап после первого клиента", text: "Пройдите сами и рекомендуйте то, что видели на своём отчёте." },
  { who: "you", title: "Выплата за 24 часа", text: "Не раз в месяц, а на следующий день. Уведомление в Telegram-боте." },
  { who: "you", title: "Клиент ваш навсегда", text: "Повторные чекапы клиента и его семьи засчитываются вам." },
  { who: "you", title: "5% с оборота коллег", text: "Пригласите коллегу-специалиста и получайте 5% с его клиентов бессрочно." },
  { who: "you", title: "Контент-пак каждый месяц", text: "Готовые посты, сторис и рилсы с вашим кодом. Уже промаркированы." },
  { who: "you", title: "Кабинет партнёра", text: "Статус каждого клиента в реальном времени: оплатил, сдал, получил отчёт." },
  { who: "client", title: "Бесплатный разбор старых анализов", text: "Клиент загружает прошлые результаты и видит, каких маркеров не хватает." },
  { who: "client", title: "Рассрочка без переплат", text: "Оплата частями через Яндекс Сплит. Цена перестаёт быть возражением." },
  { who: "client", title: "Гарантия возврата", text: "Не понравилось — вернём деньги. Ваше вознаграждение сохраняется." },
];

export function BonusSection() {
  return (
    <section id="bonus" className="cv-section scroll-mt-20 bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Не только {COMMISSION_RATE * 100}%
          </h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Всё, что делает рекомендацию лёгкой для вас и выгодной для клиента.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BONUSES.map((b) => (
            <div key={b.title} className="rounded-2xl bg-card p-6 shadow-sm">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  b.who === "you" ? "bg-success-soft text-foreground" : "bg-warning/20 text-foreground"
                }`}
              >
                {b.who === "you" ? "Вам" : "Клиенту"}
              </span>
              <h3 className="mt-3 font-display text-xl font-medium leading-snug">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EarningsSection() {
  const tiers = [5, 10, 20];
  return (
    <section id="income" className="cv-section scroll-mt-20 bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 pb-14 md:px-6 lg:pb-20">
        <div className="rounded-3xl bg-primary p-7 text-primary-foreground sm:p-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
              Сколько вы заработаете
            </h2>
            <p className="max-w-xs text-sm text-primary-foreground/80">
              Только с первых чекапов. Повторные и бонус с коллег сверху.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {tiers.map((n, i) => {
              const last = i === tiers.length - 1;
              return (
                <div
                  key={n}
                  className={`rounded-2xl p-6 ${last ? "bg-card text-foreground" : "bg-primary-foreground/10"}`}
                >
                  <p className={`text-xs ${last ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                    {n} клиентов в месяц
                  </p>
                  <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
                    {money(PAYOUT * n)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  { q: "Как подключиться?", a: "Нажмите «Подключиться» и войдите через Telegram. Промокод, ссылка и QR появятся сразу, без анкет и звонков." },
  { q: "Как я получаю выплаты?", a: "На карту в течение 24 часов после сдачи анализов клиентом. Нужен статус самозанятого или ИП." },
  { q: "Увижу ли я результаты клиента?", a: "Да, если клиент даст согласие при оформлении. Вы получите копию заключения ReAge." },
  { q: "Кто может стать партнёром?", a: "Нутрициологи, терапевты, частнопрактикующие врачи, тренеры и другие специалисты, работающие с клиентами." },
];

export function FaqSection() {
  return (
    <section id="faq" className="cv-section scroll-mt-20 bg-muted/40">
      <div className="mx-auto grid w-full max-w-[72rem] gap-8 px-4 pb-14 md:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:pb-20">
        <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Частые вопросы</h2>
        <Accordion type="multiple" defaultValue={FAQ.map((_, i) => `f${i}`)} className="border-t hairline">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.q} value={`f${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function ConnectSection() {
  const [phone, setPhone] = useState("");
  return (
    <section id="join" className="cv-section scroll-mt-20 bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 pb-16 md:px-6">
        <div className="grid items-center gap-8 rounded-3xl bg-card p-7 shadow-sm sm:p-12 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
              Подключитесь в один клик
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Промокод, ссылка, QR и кабинет партнёра — сразу после входа.
            </p>
          </div>
          <div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-full bg-info text-sm font-semibold text-info-foreground transition-opacity hover:opacity-90"
            >
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Войти через Telegram
            </a>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              или
              <span className="h-px flex-1 bg-border" />
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
              }}
            >
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
                className="h-11 rounded-full"
              />
              <Button type="submit" className="h-11 shrink-0 rounded-full px-5 font-semibold">
                Получить код
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
