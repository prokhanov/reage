import {
  Archive,
  Check,
  ClipboardList,
  Gauge,
  MessagesSquare,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  icon: LucideIcon;
  label: string;
  lab: string;
  reage: string;
};

const ROWS: Row[] = [
  { icon: Gauge, label: "Норма", lab: "«В норме» ≠ «всё хорошо»", reage: "Видно, где показатель уже съезжает" },
  { icon: Waypoints, label: "Взаимосвязи", lab: "Каждая цифра сама по себе", reage: "Показатели читаются вместе, видны скрытые связи" },
  { icon: ClipboardList, label: "Приоритеты", lab: "15 одинаково тревожных звёздочек", reage: "3 главных шага: что важно сейчас" },
  { icon: ClipboardList, label: "Действия", lab: "«Обратитесь к врачу»", reage: "План: питание, сон, нагрузка, вопросы врачу" },
  { icon: MessagesSquare, label: "Язык", lab: "Термины, которые надо гуглить", reage: "Человеческим языком, без гугления" },
  { icon: Archive, label: "Хранение", lab: "Бланки теряются в почте", reage: "Всё в одном кабинете" },
];

// "Действия" и "Приоритеты" получили одинаковые иконки — различаем их
const ROWS_FINAL: Row[] = ROWS.map((r, i) =>
  i === 3 ? { ...r, icon: StethoscopeIcon } : r,
);

import { Stethoscope as StethoscopeIcon } from "lucide-react";

function Marker({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <X className="h-3 w-3" strokeWidth={2.5} />}
    </span>
  );
}

export function MainLabVsReport({ id }: { id?: string }) {
  return (
    <section id={id} className="border-b hairline bg-muted/40 py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <h2 className="font-display max-w-[760px] text-balance text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
          Лаборатория даёт цифры. ReAge объясняет, что с&nbsp;ними делать
        </h2>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:mt-10">
          {/* Шапка таблицы */}
          <div className="grid grid-cols-[1fr] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
            <div className="hidden md:block" />
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4 text-sm font-semibold text-muted-foreground md:border-b-0 md:px-6 md:py-5">
              <X className="h-4 w-4 text-destructive" strokeWidth={2.5} />
              Бланк из лаборатории
            </div>
            <div className="hidden items-center gap-2 border-b border-border/60 px-6 py-5 text-sm font-semibold text-primary md:flex">
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Отчёт ReAge
            </div>
          </div>

          {/* Строки */}
          <div className="divide-y divide-border/60">
            {ROWS_FINAL.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.label}
                  className="grid grid-cols-1 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] md:items-center md:gap-x-4 md:px-6 md:py-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/80">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="text-[15px] font-semibold text-foreground">{r.label}</span>
                  </div>

                  <div className="flex items-start gap-2.5 md:items-center">
                    <Marker ok={false} />
                    <p className="text-[15px] leading-snug text-muted-foreground">{r.lab}</p>
                  </div>

                  <div className="flex items-start gap-2.5 md:items-center">
                    <span className="hidden md:flex">
                      <Marker ok />
                    </span>
                    <p className="text-[15px] font-medium leading-snug text-foreground">
                      <span className="mr-2.5 inline-flex align-middle md:hidden">
                        <Marker ok />
                      </span>
                      {r.reage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
