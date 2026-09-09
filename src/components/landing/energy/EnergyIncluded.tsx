import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Checkup } from "@/data/checkups";
import { ENERGY_CHECKUP } from "@/data/checkups";

interface Props {
  checkup?: Checkup;
}

export function EnergyIncluded({ checkup = ENERGY_CHECKUP }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = checkup.markers.length > 6;

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
            Что входит в {checkup.name}
          </h2>
          <p className="mt-2 text-base text-muted-foreground md:text-lg">
            <span className="sm:hidden">{checkup.markers.length} показателей входят в стоимость чекапа.</span>
            <span className="hidden sm:inline">{checkup.includedNote}</span>
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
          <ul className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-8 sm:gap-y-6 md:gap-x-12 md:gap-y-7">
            {checkup.markers.map((item, index) => (
              <li
                key={item.title}
                className={`${hasMore && !expanded && index >= 6 ? "hidden sm:flex" : "flex"} min-w-0 items-center gap-3 sm:gap-4`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base text-foreground sm:font-display sm:text-lg md:text-xl">
                    <span className="sm:hidden">{item.title.replace(/\s+—\s+расч[её]тный/iu, "")}</span>
                    <span className="hidden sm:inline">{item.title}</span>
                  </h3>
                  <p className="mt-0.5 hidden text-sm leading-relaxed text-muted-foreground sm:block sm:text-base">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="px-5 pb-5 sm:hidden">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full text-base"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded ? "Скрыть состав" : `Показать состав · ещё ${checkup.markers.length - 6}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
