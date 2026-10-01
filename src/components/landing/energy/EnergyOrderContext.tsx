import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LabMapItem } from "@/components/admin/LabLocationsMap";
import { ENERGY_CHECKUP, type Checkup } from "@/data/checkups";
import { useResolvedCheckups } from "@/hooks/useResolvedCheckups";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/toast";

const CART_KEY = "reage:checkup:cart";
const CLINIC_KEY = "reage:checkup:clinic";
const UPSELL_ORDER_KEY = "reage:checkup:upsell-order";
const REPORT_OFFER_KEY = "reage:checkup:report-offer";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function writeCart(slugs: string[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(slugs));
  } catch {
    /* noop */
  }
}

function readClinic(): LabMapItem | null {
  try {
    const raw = localStorage.getItem(CLINIC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed as LabMapItem;
  } catch {
    return null;
  }
}

function writeClinic(item: LabMapItem | null) {
  try {
    if (item) localStorage.setItem(CLINIC_KEY, JSON.stringify(item));
    else localStorage.removeItem(CLINIC_KEY);
  } catch {
    /* noop */
  }
}

/** Очистить корзину вне провайдера (например, после успешной оплаты). */
export function clearCheckupCart() {
  writeCart([]);
  writeClinic(null);
  localStorage.removeItem(UPSELL_ORDER_KEY);
  localStorage.removeItem(REPORT_OFFER_KEY);
}

interface EnergyOrderValue {
  /** Чекап текущей страницы */
  checkup: Checkup;
  /** Все чекапы в корзине */
  items: Checkup[];
  count: number;
  hasItem: (slug: string) => boolean;
  addItem: (slug: string) => void;
  addUpsellItem: (slug: string, sourceOrderId: string) => void;
  upsellOrderId: string | null;
  reportOfferId: string | null;
  removeItem: (slug: string) => void;
  clearCart: () => void;
  clinic: LabMapItem | null;
  setClinic: (item: LabMapItem | null) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Чекап текущей страницы уже в корзине */
  inCart: boolean;
  /** Добавить чекап текущей страницы и открыть панель */
  addToCart: () => void;
}

const EnergyOrderContext = createContext<EnergyOrderValue | null>(null);

export function EnergyOrderProvider({
  children,
  checkup = ENERGY_CHECKUP,
}: {
  children: ReactNode;
  checkup?: Checkup;
}) {
  const [clinic, setClinicState] = useState<LabMapItem | null>(() => readClinic());
  const [cartOpen, setCartOpen] = useState(false);
  const [slugs, setSlugs] = useState<string[]>(() => readCart());
  const [upsellOrderId, setUpsellOrderId] = useState<string | null>(() => localStorage.getItem(UPSELL_ORDER_KEY));
  const [reportOfferId, setReportOfferId] = useState<string | null>(() => localStorage.getItem(REPORT_OFFER_KEY));
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolve, bySlug } = useResolvedCheckups();

  const setClinic = useCallback((item: LabMapItem | null) => {
    setClinicState(item);
    writeClinic(item);
  }, []);

  const update = useCallback((next: string[]) => {
    setSlugs(next);
    writeCart(next);
  }, []);

  // Синхронизация между вкладками
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setSlugs(readCart());
      if (e.key === CLINIC_KEY) setClinicState(readClinic());
      if (e.key === UPSELL_ORDER_KEY) setUpsellOrderId(e.newValue);
      if (e.key === REPORT_OFFER_KEY) setReportOfferId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const offerId = searchParams.get("offer");
    if (!offerId || !/^[0-9a-f-]{36}$/i.test(offerId)) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        navigate("/auth", { state: { from: location }, replace: true });
        return;
      }
      supabase
        .from("report_checkup_offers")
        .select("id, advertised_checkup_slug, expires_at, is_active, used_at")
        .eq("id", offerId)
        .maybeSingle()
        .then(({ data: offer }) => {
          if (cancelled) return;
          if (offer?.is_active && !offer.used_at && new Date(offer.expires_at).getTime() > Date.now()) {
            update([offer.advertised_checkup_slug]);
            localStorage.setItem(REPORT_OFFER_KEY, offer.id);
            setReportOfferId(offer.id);
            setCartOpen(true);
          } else {
            localStorage.removeItem(REPORT_OFFER_KEY);
            setReportOfferId(null);
            notify.error("Срок действия промокода истёк", "Чекап открыт по текущей цене.");
          }
          const next = new URLSearchParams(searchParams);
          next.delete("offer");
          setSearchParams(next, { replace: true });
        });
    });
    return () => { cancelled = true; };
  }, [location, navigate, searchParams, setSearchParams, update]);

  const addItem = useCallback(
    (slug: string) => update(slugs.includes(slug) ? slugs : [...slugs, slug]),
    [slugs, update],
  );
  const removeItem = useCallback(
    (slug: string) => {
      const next = slugs.filter((s) => s !== slug);
      update(next);
      if (next.length === 0) {
        localStorage.removeItem(UPSELL_ORDER_KEY);
        localStorage.removeItem(REPORT_OFFER_KEY);
        setUpsellOrderId(null);
        setReportOfferId(null);
      }
    },
    [slugs, update],
  );
  const clearCart = useCallback(() => {
    update([]);
    localStorage.removeItem(UPSELL_ORDER_KEY);
    localStorage.removeItem(REPORT_OFFER_KEY);
    setUpsellOrderId(null);
    setReportOfferId(null);
  }, [update]);
  const addUpsellItem = useCallback((slug: string, sourceOrderId: string) => {
    update(slugs.includes(slug) ? slugs : [...slugs, slug]);
    localStorage.setItem(UPSELL_ORDER_KEY, sourceOrderId);
    setUpsellOrderId(sourceOrderId);
  }, [slugs, update]);

  // Цены берём из настроек в админке, остальные данные — из каталога.
  const pageCheckup = useMemo<Checkup>(() => resolve(checkup), [checkup, resolve]);

  const items = useMemo(
    () => slugs.map((s) => bySlug(s)).filter((c): c is Checkup => Boolean(c)),
    [slugs, bySlug],
  );

  const value = useMemo<EnergyOrderValue>(
    () => ({
      checkup: pageCheckup,
      items,
      count: items.length,
      hasItem: (slug: string) => slugs.includes(slug),
      addItem,
      addUpsellItem,
      upsellOrderId,
      reportOfferId,
      removeItem,
      clearCart,
      clinic,
      setClinic,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      inCart: slugs.includes(pageCheckup.slug),
      addToCart: () => {
        addItem(pageCheckup.slug);
        setCartOpen(true);
      },
    }),
    [pageCheckup, items, slugs, addItem, addUpsellItem, removeItem, clearCart, clinic, cartOpen, upsellOrderId, reportOfferId],
  );

  return <EnergyOrderContext.Provider value={value}>{children}</EnergyOrderContext.Provider>;
}

export function useEnergyOrder() {
  const ctx = useContext(EnergyOrderContext);
  if (!ctx) throw new Error("useEnergyOrder must be used within EnergyOrderProvider");
  return ctx;
}
