import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { LabMapItem } from "@/components/admin/LabLocationsMap";
import { ENERGY_CHECKUP, type Checkup } from "@/data/checkups";

interface EnergyOrderValue {
  checkup: Checkup;
  clinic: LabMapItem | null;
  setClinic: (item: LabMapItem | null) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  inCart: boolean;
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
  const [inCart, setInCart] = useState(false);

  const value = useMemo<EnergyOrderValue>(
    () => ({
      checkup,
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
    [checkup, clinic, cartOpen, inCart],
  );

  return <EnergyOrderContext.Provider value={value}>{children}</EnergyOrderContext.Provider>;
}

export function useEnergyOrder() {
  const ctx = useContext(EnergyOrderContext);
  if (!ctx) throw new Error("useEnergyOrder must be used within EnergyOrderProvider");
  return ctx;
}
