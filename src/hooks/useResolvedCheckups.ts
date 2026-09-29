import { useCallback } from "react";
import { FlaskConical } from "lucide-react";

import { CHECKUPS, type Checkup } from "@/data/checkups";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { useCheckupSettings, type CheckupVariantRow } from "@/hooks/useCheckupSettings";

/** Базовые описания чекапов из кода (тексты, фото, SEO). Показатели и цены — из админки. */
export const BASE_CHECKUPS: Checkup[] = [...CHECKUPS, FULL_CHECKUP];

export interface ResolvedVariant {
  variant: CheckupVariantRow;
  checkup: Checkup;
}

/**
 * Собирает чекап из кода + настроек в админке: цена, «ОАК в подарок»,
 * привязанные показатели и варианты. Всё, что рендерит страница, идёт отсюда.
 */
export function useResolvedCheckups() {
  const { priceOf, hasCbcBonus, markersOf, variantsOf, variantBySlug } = useCheckupSettings();

  const resolve = useCallback(
    (c: Checkup): Checkup => {
      const rows = markersOf(c.slug);
      const markers = rows
        ? rows.map((r) => ({
            title: r.title,
            description: r.description || r.category || "",
            icon: c.markers.find((m) => m.title === r.title)?.icon ?? FlaskConical,
          }))
        : c.markers;
      return {
        ...c,
        price: priceOf(c.slug, c.price),
        cbcBonusEnabled: hasCbcBonus(c.slug),
        markers,
      };
    },
    [priceOf, hasCbcBonus, markersOf],
  );

  /** Чекап по адресу/slug, включая варианты, созданные в админке. */
  const bySlug = useCallback(
    (slug: string | undefined): Checkup | undefined => {
      if (!slug) return undefined;
      const base = BASE_CHECKUPS.find((c) => c.slug === slug);
      if (base) return resolve(base);
      const v = variantBySlug(slug);
      if (!v) return undefined;
      const parent = BASE_CHECKUPS.find((c) => c.slug === v.parent_slug);
      if (!parent) return undefined;
      return resolve({
        ...parent,
        slug: v.slug,
        bundle: v.slug,
        name: `${parent.name} · ${v.label}`,
        price: parent.price,
      });
    },
    [resolve, variantBySlug],
  );

  /** Все варианты, в которые входит чекап (включая его самого). Пусто — вариантов нет. */
  const variantsFor = useCallback(
    (slug: string): ResolvedVariant[] => {
      const own = variantBySlug(slug);
      const parentSlug = own?.parent_slug ?? slug;
      const list = variantsOf(parentSlug);
      if (list.length < 2) return [];
      return list
        .map((variant) => ({ variant, checkup: bySlug(variant.slug) }))
        .filter((x): x is ResolvedVariant => Boolean(x.checkup));
    },
    [variantBySlug, variantsOf, bySlug],
  );

  return { resolve, bySlug, variantsFor, markersOf };
}
