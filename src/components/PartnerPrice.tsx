import { applyPartnerDiscount, usePartnerOffer } from "@/lib/partnerRef";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** Цена с учётом скидки партнёра (для текста кнопок). */
export function usePartnerPrice() {
  const { data: offer } = usePartnerOffer();
  return (price: number) => applyPartnerDiscount(price, offer);
}

/**
 * Цена со скидкой партнёра: старая — мелко зачёркнутой строкой над новой.
 * Размер/цвет наследуются от родителя, поэтому вёрстка не ломается на мобильных.
 */
export function PartnerPrice({ price, prefix = "" }: { price: number; prefix?: string }) {
  const { data: offer } = usePartnerOffer();
  const next = applyPartnerDiscount(price, offer);
  if (next === price) return <span className="whitespace-nowrap font-display font-normal">{prefix}{fmt(price)}</span>;
  return (
    <span className="inline-flex flex-col items-start font-display font-normal leading-none">
      <span className="mb-1 whitespace-nowrap text-[0.55em] font-medium line-through opacity-60">
        {prefix}{fmt(price)}
      </span>
      <span className="whitespace-nowrap">{prefix}{fmt(next)}</span>
    </span>
  );
}
