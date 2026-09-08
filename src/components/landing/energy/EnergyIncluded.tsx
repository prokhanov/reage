import type { Checkup } from "@/data/checkups";
import { ENERGY_CHECKUP } from "@/data/checkups";

interface Props {
  checkup?: Checkup;
}

export function EnergyIncluded({ checkup = ENERGY_CHECKUP }: Props) {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
            Что входит в {checkup.name}
          </h2>
          <p className="mt-2 text-base text-muted-foreground md:text-lg">{checkup.includedNote}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
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
        </div>
      </div>
    </section>
  );
}
