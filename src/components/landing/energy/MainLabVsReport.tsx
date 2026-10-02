import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROWS = [
  { label: "Норма", lab: "«В норме» ≠ «всё хорошо»", reage: "Видно, где показатель уже съезжает" },
  { label: "Взаимосвязи", lab: "Каждая цифра сама по себе", reage: "Показатели читаются вместе, видны скрытые связи" },
  { label: "Приоритеты", lab: "15 одинаково тревожных звёздочек", reage: "3 главных шага: что важно сейчас" },
  { label: "Действия", lab: "«Обратитесь к врачу»", reage: "План: питание, сон, нагрузка, вопросы врачу" },
  { label: "Язык", lab: "Термины, которые надо гуглить", reage: "Человеческим языком, без гугления" },
  { label: "Хранение", lab: "Бланки теряются в почте", reage: "Всё в одном кабинете" },
];

function Column({ reage }: { reage: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 shadow-sm sm:p-8",
        reage ? "border border-primary/15 bg-primary/[0.07]" : "border border-border/80 bg-card",
      )}
    >
      <p className={cn("text-sm font-semibold", reage ? "text-primary" : "text-muted-foreground")}>
        {reage ? "Отчёт ReAge" : "Бланк из лаборатории"}
      </p>
      <ul className="mt-5 divide-y divide-border/60">
        {ROWS.map((r) => (
          <li key={r.label} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                reage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {reage ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.label}</p>
              <p className={cn("mt-0.5 text-[15px] leading-snug", reage ? "font-medium text-foreground" : "text-foreground/80")}>
                {reage ? r.reage : r.lab}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MainLabVsReport({ id }: { id?: string }) {
  return (
    <section id={id} className="border-b hairline bg-muted/40 py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <h2 className="font-display max-w-[760px] text-balance text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
          Лаборатория даёт цифры. ReAge объясняет, что с&nbsp;ними делать
        </h2>
        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6">
          <Column reage={false} />
          <Column reage />
        </div>
      </div>
    </section>
  );
}
