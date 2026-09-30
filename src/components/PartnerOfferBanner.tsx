import { useLocation } from "react-router-dom";
import { usePartnerOffer } from "@/lib/partnerRef";

const HIDDEN_PREFIXES = ["/admin", "/internal", "/analyses/print", "/r/"];

/** Плашка «Скидка X% от [имя]» для посетителей, пришедших по ссылке партнёра. */
export function PartnerOfferBanner() {
  const { pathname } = useLocation();
  const { data: offer } = usePartnerOffer();
  if (!offer || !offer.discount_pct) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!(pathname === "/" || pathname === "/checkup" || pathname.startsWith("/checkup/"))) return null;
  return (
    <div className="w-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
      Для вас действует скидка {offer.discount_pct}% на все услуги
    </div>
  );
}
