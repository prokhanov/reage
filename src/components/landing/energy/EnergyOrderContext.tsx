import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LabMapItem } from "@/components/admin/LabLocationsMap";
import { CHECKUPS, ENERGY_CHECKUP, getCheckupBySlug, type Checkup } from "@/data/checkups";

const CART_KEY = "reage:checkup:cart";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .filter((s) => CHECKUPS.some((c) => c.slug === s));
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

/** Очистить корзину вне провайдера (например, после успешной оплаты). */
export function clearCheckupCart() {
  writeCart([]);
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
  const [clinic, setClinic] = useState<LabMapItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [slugs, setSlugs] = useState<string[]>(() => readCart());

  // Синхронизация между вкладками
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setSlugs(readCart());
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

  const items = useMemo(
    () => slugs.map((s) => getCheckupBySlug(s)).filter((c): c is Checkup => Boolean(c)),
    [slugs],
  );

  const value = useMemo<EnergyOrderValue>(
    () => ({
      checkup,
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
      inCart: slugs.includes(checkup.slug),
      addToCart: () => {
        addItem(checkup.slug);
        setCartOpen(true);
      },
    }),
    [checkup, items, slugs, addItem, removeItem, clearCart, clinic, cartOpen],
  );

  return <EnergyOrderContext.Provider value={value}>{children}</EnergyOrderContext.Provider>;
}

export function useEnergyOrder() {
  const ctx = useContext(EnergyOrderContext);
  if (!ctx) throw new Error("useEnergyOrder must be used within EnergyOrderProvider");
  return ctx;
}
