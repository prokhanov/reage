import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "reage:ref";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type PartnerOffer = {
  source: "bound" | "code";
  discount_pct: number;
  hide_consultation: boolean;
  name: string;
  code: string | null;
};

/** Код партнёра из браузера (живёт 90 дней). */
export function getRefCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, ts } = JSON.parse(raw) as { code: string; ts: number };
    if (!code || Date.now() - ts > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function setRefCode(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: code.trim().toUpperCase(), ts: Date.now() }));
    window.dispatchEvent(new Event("reage:ref-changed"));
  } catch {
    /* ignore */
  }
}

export async function fetchPartnerOffer(code: string | null): Promise<PartnerOffer | null> {
  const { data, error } = await supabase.rpc("partner_offer" as any, { p_code: code });
  if (error || !data) return null;
  return data as unknown as PartnerOffer;
}

/** Предложение партнёра для текущего посетителя (закрепление важнее ссылки). */
export function usePartnerOffer() {
  const code = getRefCode();
  return useQuery({
    queryKey: ["partner-offer", code],
    queryFn: () => fetchPartnerOffer(code),
    staleTime: 5 * 60 * 1000,
  });
}

export function applyPartnerDiscount(price: number, offer: PartnerOffer | null | undefined) {
  if (!offer || !offer.discount_pct) return price;
  return Math.round(price * (1 - offer.discount_pct / 100));
}
