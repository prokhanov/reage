import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LabMapItem } from "@/components/admin/LabLocationsMap";
import { CHECKUPS, ENERGY_CHECKUP, type Checkup } from "@/data/checkups";
import { FULL_CHECKUP_TIERS } from "@/data/fullCheckup";

/** Каталог + полный чекап: он живёт на отдельной странице, но попадает в ту же корзину. */
const ALL_CHECKUPS: Checkup[] = [...CHECKUPS, ...FULL_CHECKUP_TIERS.map((t) => t.checkup)];

function resolveCheckup(slug: string | undefined): Checkup | undefined {
  return ALL_CHECKUPS.find((c) => c.slug === slug);
}
import { useCheckupSettings } from "@/hooks/useCheckupSettings";

const CART_KEY = "reage:checkup:cart";
const CLINIC_KEY = "reage:checkup:clinic";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .filter((s) => ALL_CHECKUPS.some((c) => c.slug === s));
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
}

interface EnergyOrderValue {
  /** Чекап текущей страницы */
  checkup: Checkup;
  /** Все чекапы в корзине */
  items: Checkup[];
  count: number;
  hasItem: (slug: string) => boolean;
  addItem: (slug: string) => void;
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
  const { priceOf, hasCbcBonus } = useCheckupSettings();

  const setClinic = useCallback((item: LabMapItem | null) => {
    setClinicState(item);
    writeClinic(item);
  }, []);

  // Синхронизация между вкладками
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setSlugs(readCart());
      if (e.key === CLINIC_KEY) setClinicState(readClinic());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: string[]) => {
    setSlugs(next);
    writeCart(next);
  }, []);

  const addItem = useCallback(
    (slug: string) => update(slugs.includes(slug) ? slugs : [...slugs, slug]),
    [slugs, update],
  );
  const removeItem = useCallback(
    (slug: string) => update(slugs.filter((s) => s !== slug)),
    [slugs, update],
  );
  const clearCart = useCallback(() => update([]), [update]);

  // Цены берём из настроек в админке, остальные данные — из каталога.
  const pageCheckup = useMemo<Checkup>(
    () => ({
      ...checkup,
      price: priceOf(checkup.slug, checkup.price),
      cbcBonusEnabled: hasCbcBonus(checkup.slug),
    }),
    [checkup, priceOf, hasCbcBonus],
  );

  const items = useMemo(
    () =>
      slugs
        .map((s) => resolveCheckup(s))
        .filter((c): c is Checkup => Boolean(c))
        .map((c) => ({
          ...c,
          price: priceOf(c.slug, c.price),
          cbcBonusEnabled: hasCbcBonus(c.slug),
        })),
    [slugs, priceOf, hasCbcBonus],
  );

  const value = useMemo<EnergyOrderValue>(
    () => ({
      checkup: pageCheckup,
      items,
      count: items.length,
      hasItem: (slug: string) => slugs.includes(slug),
      addItem,
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
    [pageCheckup, items, slugs, addItem, removeItem, clearCart, clinic, cartOpen],
  );

  return <EnergyOrderContext.Provider value={value}>{children}</EnergyOrderContext.Provider>;
}

export function useEnergyOrder() {
  const ctx = useContext(EnergyOrderContext);
  if (!ctx) throw new Error("useEnergyOrder must be used within EnergyOrderProvider");
  return ctx;
}
