import { markersLabel, money } from "@/data/checkups";
import type { ResolvedVariant } from "@/hooks/useResolvedCheckups";
import { cn } from "@/lib/utils";

interface Props {
  variants: ResolvedVariant[];
  activeSlug: string;
  onChange: (slug: string) => void;
}

/** Переключатель вариантов одного чекапа (создаются в админке «Чекапы → Варианты»). */
export function CheckupVariantSwitcher({ variants, activeSlug, onChange }: Props) {
  if (variants.length < 2) return null;
  const idx = Math.max(
    variants.findIndex((v) => v.variant.slug === activeSlug),
    0,
  );
  const count = variants[idx].checkup.markers.length;
  const prev = idx > 0 ? variants[idx - 1] : null;
  const note = prev
    ? `+ ${markersLabel(Math.max(count - prev.checkup.markers.length, 0))} к варианту «${prev.variant.label}» — полная картина по ${markersLabel(count)}`
    : `Ключевые показатели — ${markersLabel(count)}`;

  return (
    <div className="mt-7 max-w-[520px]">
      <p className="mb-2.5 text-[13px] uppercase tracking-[0.05em] text-muted-foreground">
        Вариант чекапа
      </p>
      <div
        role="radiogroup"
        aria-label="Вариант чекапа"
        className="grid gap-1 rounded-2xl bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))` }}
      >
        {variants.map(({ variant, checkup }) => {
          const active = variant.slug === activeSlug;
          return (
            <button
              key={variant.slug}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(variant.slug)}
              className={cn(
                "relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16",
                active ? "border-primary bg-card shadow-sm" : "border-transparent hover:bg-card/50",
              )}
            >
              {variant.is_popular && (
                <span
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                    active ? "bg-primary text-primary-foreground" : "bg-border text-foreground",
                  )}
                >
                  Популярный
                </span>
              )}
              <span
                className={cn(
                  "text-sm text-foreground sm:font-display sm:text-[17px]",
                  active && "font-medium",
                )}
              >
                {variant.label}
              </span>
              <span className="text-xs text-muted-foreground sm:text-[13px]">{money(checkup.price)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-snug text-foreground/80">{note}</p>
    </div>
  );
}
