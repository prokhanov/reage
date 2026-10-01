import { useState } from "react";
import { ChevronDown, Gift } from "lucide-react";

import type { Checkup } from "@/data/checkups";
import {
  CBC_BONUS_MARKER_COUNT,
  CBC_BONUS_MARKERS,
  ENERGY_CHECKUP,
  markersLabel,
} from "@/data/checkups";

interface Props {
  checkup?: Checkup;
}

export function EnergyIncluded({ checkup = ENERGY_CHECKUP }: Props) {
  const [cbcOpen, setCbcOpen] = useState(false);

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
             Что входит чекап? 
          </h2>
          <p className="mt-2 text-base text-muted-foreground md:text-lg">{checkup.includedNote}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
          <div className="flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pt-8">
            <h3 className="font-display text-xl text-foreground sm:text-2xl">
               Биомаркеры
            </h3>
            <div className="shrink-0 text-base font-semibold text-muted-foreground">
              {checkup.markers.length} показателей{checkup.cbcBonusEnabled ? ` + ${markersLabel(CBC_BONUS_MARKER_COUNT)} ОАК в подарок` : ""}
            </div>
          </div>
          <ul className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-8 sm:gap-y-6 md:gap-x-12 md:gap-y-7">
            {checkup.markers.map((item) => (
              <li key={item.title} className="flex min-w-0 items-center gap-3 sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base text-foreground sm:text-lg md:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {checkup.cbcBonusEnabled && (
            <div className="mx-5 mb-5 sm:mx-8 sm:mb-8">
                <div className="rounded-xl border border-success/30 bg-success-soft p-4 sm:p-6">
                  <div className="grid grid-cols-[auto,1fr] items-start gap-x-3 sm:flex sm:items-center sm:gap-x-5">
                    <span className="col-start-1 row-start-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground sm:h-14 sm:w-14">
                      <Gift className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="col-start-2 row-start-1 min-w-0 sm:flex-1">
                      <div className="sm:flex sm:flex-wrap sm:items-center sm:gap-x-3">
                        <span className="inline-block rounded-full bg-success px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success-foreground sm:order-2">
                          в подарок
                        </span>
                        <h3 className="mt-1.5 font-display text-[1.35rem] leading-tight text-foreground sm:order-1 sm:mt-0 sm:text-2xl md:text-[1.7rem]">
                          Общий анализ крови
                        </h3>
                      </div>
                      <p className="mt-3 text-[15px] font-medium leading-relaxed text-foreground/90 sm:mt-1.5 sm:text-base">
                        ОАК + СОЭ и лейкоцитарная формула,&nbsp;
                        <span className="font-bold text-success">{markersLabel(CBC_BONUS_MARKER_COUNT)}</span>
                        : воспаление и риск анемии — в этом же заборе крови, без доплаты
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCbcOpen((v) => !v)}
                      aria-expanded={cbcOpen}
                      className="col-span-2 col-start-1 mt-4 flex w-full items-center justify-between gap-2 border-t border-success/30 pt-3 text-left text-[15px] font-semibold text-foreground transition-colors hover:text-success sm:mt-0 sm:w-auto sm:shrink-0 sm:justify-center sm:rounded-full sm:border sm:border-border sm:bg-background sm:px-5 sm:py-3 sm:text-base sm:shadow-sm sm:hover:border-success/50"
                    >
                      {cbcOpen ? "Скрыть" : `Все ${markersLabel(CBC_BONUS_MARKER_COUNT)}`}
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 transition-transform duration-300 ${cbcOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                  </div>
                  {cbcOpen && (
                    <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {CBC_BONUS_MARKERS.map((title) => (
                        <li key={title} className="flex min-w-0 items-start gap-2 text-sm leading-snug text-foreground/90 sm:text-[15px]">
                          <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
                          <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
