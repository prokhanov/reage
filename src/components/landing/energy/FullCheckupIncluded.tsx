import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { markersLabel } from "@/data/checkups";
import { FULL_CHECKUP_CATEGORIES, FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";
import type { TierComposition } from "@/hooks/useFullCheckupTiers";

const DOTS = ["bg-success", "bg-warning", "bg-destructive", "bg-info", "bg-primary"];

export function FullCheckupIncluded({ composition }: { composition?: TierComposition | null }) {
  const categories =
    composition && composition.count > 0
      ? composition.groups.map((g, i) => ({
          title: g.name,
          dotClass: DOTS[i % DOTS.length],
          note: "",
          markers: g.markers,
        }))
      : FULL_CHECKUP_CATEGORIES;
  const total = categories.reduce((s, c) => s + c.markers.length, 0) || FULL_CHECKUP_MARKERS_COUNT;
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
          Что входит — {markersLabel(total)}
        </h2>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card sm:mt-8">
          <Accordion
            type="single"
            collapsible
            key={categories[0]?.title}
            defaultValue={categories[0]?.title}
            className="w-full"
          >
            {categories.map((category) => (
              <AccordionItem
                key={category.title}
                value={category.title}
                className="border-b border-border last:border-b-0"
              >
                <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-8">
                  <div className="flex w-full items-center gap-3 pr-3 text-left">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${category.dotClass}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-base text-foreground sm:text-lg">
                      {category.title}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-muted-foreground sm:text-base">
                      {category.markers.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-6 sm:px-8">
                  {category.note && <p className="text-sm text-muted-foreground sm:text-base">{category.note}</p>}
                  <ul className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {category.markers.map((marker) => (
                      <li
                        key={marker}
                        className="flex items-start gap-2 text-sm text-foreground sm:text-base"
                      >
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border"
                          aria-hidden
                        />
                        <span className="min-w-0">{marker}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
