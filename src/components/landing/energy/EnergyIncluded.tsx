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
              <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning text-warning-foreground sm:h-12 sm:w-12">
                    <Gift className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-foreground sm:text-xl md:text-2xl">
                        Общий анализ крови
                      </h3>
                      <span className="rounded-full bg-warning px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning-foreground sm:text-sm">
                        в подарок
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-foreground/90 sm:text-base">
                      {markersLabel(CBC_BONUS_MARKER_COUNT)}: воспаление и риск анемии — в этом же заборе крови, без доплаты
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCbcOpen((v) => !v)}
                  aria-expanded={cbcOpen}
                  className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-sm font-semibold text-foreground transition-colors hover:text-primary sm:mt-4 sm:text-base"
                >
                  {cbcOpen ? "Скрыть список показателей" : `Показать все ${markersLabel(CBC_BONUS_MARKER_COUNT)}`}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${cbcOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {cbcOpen && (
                  <ul className="mt-2 grid gap-x-6 gap-y-1.5 border-t border-warning/30 pt-3 sm:grid-cols-2">
                    {CBC_BONUS_MARKERS.map((title) => (
                      <li key={title} className="flex min-w-0 items-start gap-2 text-sm leading-snug text-foreground/90 sm:text-[15px]">
                        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
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
