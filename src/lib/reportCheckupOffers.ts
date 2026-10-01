import QRCode from "qrcode";

import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";

export interface ReportCheckupOffer {
  id: string;
  analysis_id: string;
  advertised_checkup_slug: string;
  advertised_checkup_name: string;
  advertised_list_price: number;
  source_paid_amount: number;
  pricing_mode: "full_upgrade" | "ten_percent";
  final_price: number;
  discount_amount: number;
  code: string;
  display_until: string;
  expires_at: string;
  is_active: boolean;
  used_at?: string | null;
  checkout_url?: string;
  qr_data_url?: string;
}

export interface ReportCheckupCandidate {
  slug: string;
  name: string;
  listPrice: number;
  pricingMode: "full_upgrade" | "ten_percent";
  sourcePaid: number;
  finalPrice: number;
  discountAmount: number;
  eligible: boolean;
}

export function checkoutUrlForOffer(offer: Pick<ReportCheckupOffer, "id" | "advertised_checkup_slug">) {
  const path = offer.advertised_checkup_slug === "full" ? "/checkup/full" : `/checkup/${offer.advertised_checkup_slug}`;
  return `${window.location.origin}${path}?offer=${encodeURIComponent(offer.id)}`;
}

export async function decorateReportOffers(offers: ReportCheckupOffer[]): Promise<ReportCheckupOffer[]> {
  return Promise.all(offers.map(async (offer) => {
    const checkout_url = checkoutUrlForOffer(offer);
    const qr_data_url = await QRCode.toDataURL(checkout_url, { errorCorrectionLevel: "M", margin: 1, width: 240 });
    return { ...offer, checkout_url, qr_data_url };
  }));
}

export async function manageReportOffers(
  analysisId: string,
  action: "list" | "save",
  selectedSlugs?: string[],
): Promise<{ candidates: ReportCheckupCandidate[]; selected: ReportCheckupOffer[]; success?: boolean }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Сессия не найдена");
  const response = await fetch(edgeFunctionUrl("report-checkup-offers"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, analysisId, selectedSlugs }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Не удалось сохранить баннеры");
  return payload;
}