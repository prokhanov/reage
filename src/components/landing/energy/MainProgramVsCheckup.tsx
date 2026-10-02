import { useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = {
  title: string;
  desc: string;
  checkup: string;
  program: string;
};

const ROWS: Row[] = [
  {
    title: "Анализы",
    desc: "Сколько раз за год вы сдаёте кровь",
    checkup: "1 сдача",
    program: "2–4 сдачи в год по графику",
  },
  {
    title: "Цена одной сдачи",
    desc: "Тот же набор показателей, разово или в программе",
    checkup: "25 990–64 990 ₽",
    program: "Около 5% дешевле, чем те же чекапы разово — плюс выезд на дом бесплатно",
  },
  {
    title: "Отчёт по результатам",
    desc: "Разбор каждого показателя: оптимум, что значит, что делать",
    checkup: "Один отчёт",
    program: "Отчёт после каждой сдачи — со сравнением с прошлыми",
  },
  {
    title: "Тренды и дашборды",
    desc: "Каждый показатель на графике по всем сдачам, сводка по 8 системам",
    checkup: "Только текущие значения",
    program: "Графики по всем сдачам и дашборды систем организма",
  },
  {
    title: "Биологический возраст",
    desc: "Настоящий организм «молодой» или «старее» паспортного",
    checkup: "—",
    program: "Расчёт после каждой сдачи и изменение за год",
  },
  {
    title: "План действий",
    desc: "Что изменить в витаминах, сне, нагрузке и что обсудить с врачом",
    checkup: "Составляется один раз",
    program: "Пересматривается после каждой сдачи: что сработало — оставляем, что нет — меняем",
  },
  {
    title: "Консультации врача",
    desc: "Онлайн-разбор результатов с врачом, который видит всю историю",
    checkup: "Оплачиваются отдельно",
    program: "2–4 консультации входят в программу",
  },
  {
    title: "Выезд медсестры на дом",
    desc: "Забор крови дома в удобное время, 10–15 минут",
    checkup: "Оплачиваются отдельно",
    program: "Бесплатно на каждую сдачу (Москва и МО)",
  },
  {
    title: "Годовое сопровождение",
    desc: "Команда ReAge ведёт вас весь год, а не только до отчёта",
    checkup: "—",
    program: "Напоминаем о сдачах, подсказываем, что и когда пересдать, отвечаем на вопросы",
  },
  {
    title: "Приоритетная поддержка",
    desc: "Как быстро вам ответят",
    checkup: "Стандартная",
    program: "Приоритетная — ваши вопросы в начале очереди",
  },
  {
    title: "Личный кабинет",
    desc: "Разделы и инструменты системы",
    checkup: "Результаты и отчёт",
    program: "Весь функционал: история, дашборды, тренды, дневник самочувствия, AI-ассистент, стратегии здоровья",
  },
  {
    title: "Напоминания о пересдаче",
    desc: "Когда и что сдать, чтобы не выпасть из графика",
    checkup: "—",
    program: "Автоматически, по вашему плану",
  },
];

const COLLAPSED_DESKTOP = 4;
const COLLAPSED_MOBILE = 3;

function ProgramCta({ className }: { className?: string }) {
  return (
    <Button
      size="lg"
      onClick={() => document.getElementById("monitoring")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className={cn("bg-primary-foreground text-primary hover:bg-primary-foreground/90", className)}
    >
      Выбрать программу
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

function ToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60"
    >
      {open ? "Свернуть" : `Показать все ${ROWS.length} отличий`}
      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="leading-snug">{children}</span>
    </span>
  );
}

export function MainProgramVsCheckup({ id }: { id?: string }) {
  const [open, setOpen] = useState(false);

  const visibleRows = open ? ROWS : ROWS.slice(0, COLLAPSED_DESKTOP);
  const visibleRowsMobile = open ? ROWS : ROWS.slice(0, COLLAPSED_MOBILE);

  return (
    <section id={id} className="scroll-mt-16 border-b hairline bg-gradient-monitoring-green py-14 text-primary-foreground md:py-20">
      <div className="mx-auto w-full max-w-[72rem] px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          <h2 className="font-display text-[1.9rem] leading-tight text-primary-foreground md:text-[2.6rem]">
            Чем программа отличается от чекапа
          </h2>
          <p className="max-w-xl self-center text-base leading-relaxed text-primary-foreground/75 md:text-lg">
            Чекап отвечает на вопрос «что сейчас». Программа — «что меняется и помогает ли то, что вы делаете».
            Вы платите не за пробирки, а за весь год наблюдения.
          </p>
        </div>

        {/* ===== Desktop table ===== */}
        <div className="relative mt-10 hidden rounded-3xl bg-card text-foreground shadow-xl shadow-black/10 md:block">
          <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)_minmax(0,1.1fr)]">
            {/* Header */}
            <div className="border-b border-border/60 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Что входит</p>
            </div>
            <div className="border-b border-border/60 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Снимок на сегодня</p>
              <p className="mt-1 font-display text-xl text-foreground">Разовый чекап</p>
            </div>
            <div className="rounded-tr-3xl bg-primary px-6 py-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">История за год</p>
              <p className="mt-1 font-display text-xl">Годовая программа</p>
            </div>

            {/* Rows */}
            {visibleRows.map((r) => (
              <div key={r.title} className="contents">
                <div className="border-b border-border/60 px-6 py-5">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{r.desc}</p>
                </div>
                <div className="border-b border-border/60 px-6 py-5 text-[15px] text-foreground/85">
                  {r.checkup}
                </div>
                <div className="border-b border-border/60 bg-primary/5 px-6 py-5 text-[15px] text-foreground/90">
                  <CheckItem>{r.program}</CheckItem>
                </div>
              </div>
            ))}
          </div>

          {/* Collapse fade + button */}
          <div className="relative">
            {!open && (
              <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-card" />
            )}
            <div className={cn("flex justify-center py-5", !open && "-mt-16 relative z-10")}>
              <ToggleButton open={open} onClick={() => setOpen(!open)} />
            </div>
          </div>
        </div>

        {/* ===== Mobile cards ===== */}
        <div className="mt-8 md:hidden">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">Снимок на сегодня</p>
              <p className="mt-1 font-display text-lg leading-tight">Разовый чекап</p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3.5 text-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">История за год</p>
              <p className="mt-1 font-display text-lg leading-tight">Годовая программа</p>
            </div>
          </div>

          <div className="relative mt-3">
            <div className="space-y-3">
              {visibleRowsMobile.map((r) => (
                <div key={r.title} className="rounded-2xl bg-card p-4 text-foreground shadow-sm">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{r.desc}</p>
                  <div className="mt-3 flex items-start justify-between gap-3 border-t border-border/60 pt-3 text-sm">
                    <span className="shrink-0 text-muted-foreground">Чекап</span>
                    <span className="text-right text-foreground/85">{r.checkup}</span>
                  </div>
                  <div className="mt-2 rounded-xl bg-primary/5 px-3 py-2.5 text-sm text-foreground/90">
                    <CheckItem>
                      <span className="font-semibold">Программа:</span> {r.program}
                    </CheckItem>
                  </div>
                </div>
              ))}
            </div>
            {!open && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-background/0" />
            )}
          </div>

          <div className={cn("flex flex-col gap-3", !open && "-mt-10 relative z-10")}>
            <div className="flex justify-center">
              <ToggleButton open={open} onClick={() => setOpen(!open)} />
            </div>
            <ProgramCta className="w-full" />
          </div>
        </div>

        {/* ===== Bottom note (desktop) ===== */}
        <div className="mt-8 hidden items-center justify-between gap-6 md:flex">
          <p className="max-w-2xl text-[15px] leading-relaxed text-primary-foreground/80">
            <span className="font-semibold text-primary-foreground">Уже прошли чекап?</span> Передайте на программу —
            стоимость чекапа зачтём, а его результаты станут первой точкой на графиках.
          </p>
          <ProgramCta />
        </div>
      </div>
    </section>
  );
}
