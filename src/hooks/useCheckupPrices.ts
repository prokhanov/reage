import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { CHECKUPS, type Checkup } from "@/data/checkups";

export const CONSULTATION_SLUG = "consultation";
export const DEFAULT_CONSULT_PRICE = 3500;

export type CheckupPriceRow = {
  slug: string;
  title: string;
  price: number;
  updated_at: string;
};

async function fetchPrices(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("checkup_prices").select("slug, price");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.slug] = row.price;
  return map;
}

/**
 * Цены чекапов и консультации из БД (раздел «Цены чекапов» в админке).
 * Пока данные не загрузились — используются значения из каталога.
 */
export function useCheckupPrices() {
  const { data } = useQuery({
    queryKey: ["checkup-prices"],
    queryFn: fetchPrices,
    staleTime: 5 * 60 * 1000,
  });

  const priceOf = (checkup: Pick<Checkup, "slug" | "price">) =>
    data?.[checkup.slug] ?? checkup.price;

  const priceBySlug = (slug: string) =>
    data?.[slug] ?? CHECKUPS.find((c) => c.slug === slug)?.price ?? 0;

  const consultPrice = data?.[CONSULTATION_SLUG] ?? DEFAULT_CONSULT_PRICE;

  return { prices: data ?? {}, priceOf, priceBySlug, consultPrice };
}
