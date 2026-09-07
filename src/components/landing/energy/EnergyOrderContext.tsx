import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { LabMapItem } from "@/components/admin/LabLocationsMap";

interface EnergyOrderValue {
  clinic: LabMapItem | null;
  setClinic: (item: LabMapItem | null) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  inCart: boolean;
  addToCart: () => void;
}

const EnergyOrderContext = createContext<EnergyOrderValue | null>(null);

export function EnergyOrderProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<LabMapItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [inCart, setInCart] = useState(false);

  const value = useMemo<EnergyOrderValue>(
    () => ({
      clinic,
      setClinic,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      inCart,
      addToCart: () => {
        setInCart(true);
        setCartOpen(true);
      },
    }),
    [clinic, cartOpen, inCart],
  );

  return <EnergyOrderContext.Provider value={value}>{children}</EnergyOrderContext.Provider>;
}

export function useEnergyOrder() {
  const ctx = useContext(EnergyOrderContext);
  if (!ctx) throw new Error("useEnergyOrder must be used within EnergyOrderProvider");
  return ctx;
}
