import { useEffect, useRef } from "react";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";

const TOKEN_KEY = "reage:checkup:lead-token";
const DELAY_MS = 1500;

export function getCartLeadToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return "";
  }
}

export function clearCartLeadToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
}

export interface CartLeadPayload {
  email: string;
  phone: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  bundles: string[];
  clinicTitle?: string | null;
  clinicAddress?: string | null;
  locationType: "clinic" | "home";
  promoCode?: string | null;
  amount: number;
  consult?: boolean;
  consultPrice?: number | null;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: string) => v.replace(/\D/g, "").length === 11;

/**
 * Тихо сохраняет незавершённую корзину гостя. Клиент ничего не видит:
 * никаких состояний, уведомлений и ожиданий. Отправка — после паузы,
 * при уходе из поля и при закрытии вкладки.
 */
export function useCartLeadAutosave(payload: CartLeadPayload, enabled: boolean) {
  const latest = useRef(payload);
  latest.current = payload;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const sent = useRef("");
  const inFlight = useRef(false);
  const timer = useRef<number | null>(null);

  const flush = useRef((keepalive = false) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (!enabledRef.current) return;
    const p = latest.current;
    if (!isEmail(p.email) && !isPhone(p.phone)) return;
    const fp = JSON.stringify(p);
    if (fp === sent.current) return;
    if (inFlight.current && !keepalive) {
      timer.current = window.setTimeout(() => flush.current(), DELAY_MS);
      return;
    }
    const token = getCartLeadToken();
    if (!token) return;
    let utm: unknown = null;
    try { utm = JSON.parse(localStorage.getItem("reage_utm") || "null"); } catch { /* noop */ }
    const body = JSON.stringify({ ...p, token, utm, page: window.location.pathname + window.location.search });
    sent.current = fp;
    inFlight.current = true;
    fetch(edgeFunctionUrl("checkup-lead-save"), {
      method: "POST",
      keepalive,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body,
    })
      .catch(() => { if (sent.current === fp) sent.current = ""; })
      .finally(() => { inFlight.current = false; });
  });

  const fingerprint = JSON.stringify(payload);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flush.current(), DELAY_MS);
  }, [fingerprint, enabled]);

  useEffect(() => {
    const onBlur = () => window.setTimeout(() => flush.current(), 0);
    const onHide = () => { if (document.visibilityState === "hidden") flush.current(true); };
    const onPageHide = () => flush.current(true);
    window.addEventListener("focusout", onBlur, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
}
