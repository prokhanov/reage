import { useState } from "react";
import {
  CalendarClock,
  Check,
  FileText,
  Gift,
  HeartPulse,
  Send,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { Footer } from "@/components/landing/CTASection";
import { FeedbackDialog } from "@/components/landing/FeedbackDialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { COMMISSION_RATE, TELEGRAM_URL } from "./PartnersTop";

const BENEFITS = [
  {
    icon: Gift,
    title: "Скидка 5% для клиентов",
    text: "Персональный промокод — ваш пациент платит меньше, чем по цене на сайте.",
  },
  {
    icon: UserRound,
    title: "Личный кабинет партнёра",
    text: "Клиенты, оплаты и выплаты видны в личном кабинете в реальном времени.",
  },
  {
    icon: CalendarClock,
    title: "Выплата за 24 часа",
    text: "Деньги приходят на карту в течение суток после сдачи анализов.",
  },
  {
    icon: FileText,
    title: "Отчёт на 50 страниц",
    text: "Клиент получает персональный разбор на понятном языке — вам не нужно писать заключение.",
  },
  {
    icon: Stethoscope,
    title: "Медицинская часть на нас",
    text: "Нормы, интерпретация и поддержка врача — внутри сервиса ReAge.",
  },
  {
    icon: HeartPulse,
    title: "Без бумажного договора",
    text: "Подключение по заявке, реквизиты — до первой выплаты.",
  },
];

export function BenefitsSection() {
  return (
    <section id="bonus" className="cv-section scroll-mt-20 bg-background">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Что вы получаете, кроме комиссии {COMMISSION_RATE * 100}%
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl border hairline bg-card p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft">
                <benefit.icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{benefit.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


export function JoinSection() {
  return (
    <section className="cv-section bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 lg:py-20">
        <div className="grid items-center gap-10 rounded-3xl border hairline bg-card p-7 shadow-md sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <span className="rounded-full bg-success-soft px-4 py-1.5 text-xs font-medium text-foreground">
              Подключение по заявке
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Заявка — и вы партнёр
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Заполните короткую анкету — мы свяжемся с вами и откроем кабинет. Реквизиты для выплат можно
              добавить позже — до первой выплаты.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Без звонков и встреч",
                "Без бумажного договора",
                "Код и ссылка — сразу после подключения",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 h-12 rounded-full px-7 text-base font-semibold">
              <a href={TELEGRAM_URL}>
                Оставить заявку
              </a>
            </Button>
          </div>

          <div className="rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                После подключения
              </p>
              <div className="mt-4">
                  <p className="text-sm text-primary-foreground/80">Ваш промокод</p>
                  <p className="text-2xl font-bold">IVANOVA</p>
                  <p className="mt-2 truncate text-sm text-primary-foreground/80">
                    reage.life/ivanova
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Как и когда выплачивается комиссия?",
    a: `Комиссия ${COMMISSION_RATE * 100}% от стоимости чекапа приходит на вашу карту в течение 24 часов после того, как клиент сдал анализы. Реквизиты добавляются один раз в личном кабинете.`,
  },
  {
    q: "Нужно ли заключать договор?",
    a: "Нет. Подключение по короткой заявке, договор не требуется. Все условия видны в кабинете до первого клиента.",
  },
  {
    q: "Как клиент получает скидку?",
    a: "По вашей персональной ссылке или промокоду скидка 5% применяется автоматически при оплате — клиенту ничего вводить не нужно.",
  },
  {
    q: "Что получает клиент?",
    a: "Сдачу анализов в лаборатории рядом с домом и персональный отчёт на 50 страниц: что в норме, что нет, оценка рисков и конкретные шаги на понятном языке.",
  },
  {
    q: "Кто отвечает за медицинскую часть?",
    a: "ReAge. Мы берём на себя нормы, интерпретацию показателей и поддержку врача, поэтому вам не нужно писать заключения самостоятельно.",
  },
  {
    q: "Можно ли совмещать с основной практикой?",
    a: "Да, партнёрство не требует времени: вы только рекомендуете чекап, всё остальное — запись, сдача, отчёт и выплаты — делает сервис.",
  },
];

export function PartnersFaq() {
  return (
    <section id="faq" className="cv-section scroll-mt-20 bg-background">
      <div className="mx-auto w-full max-w-[48rem] px-4 py-14 md:px-6 lg:py-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Частые вопросы</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold sm:text-lg">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function FinalCta() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <section className="cv-section bg-muted/40">
      <div className="mx-auto w-full max-w-[72rem] px-4 pb-16 pt-4 md:px-6">
        <div className="rounded-3xl bg-primary px-7 py-12 text-center text-primary-foreground sm:px-10 sm:py-16">
          <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Подключитесь — первый клиент может прийти уже завтра
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/85">
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="secondary"
              className="h-12 rounded-full px-7 text-base font-semibold"
            >
              <a href={TELEGRAM_URL}>
                Стать партнёром
              </a>
            </Button>
            <Button
              variant="ghost"
              className="h-12 rounded-full px-7 text-base font-medium text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              onClick={() => setFeedbackOpen(true)}
            >
              Остались вопросы
            </Button>
          </div>
        </div>
        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </div>
    </section>
  );
}

export function PartnersFooter() {
  return <Footer />;
}
