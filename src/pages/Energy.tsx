import { PageMeta } from "@/components/PageMeta";
import { Footer } from "@/components/landing/CTASection";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import { EnergyExpertResult } from "@/components/landing/energy/EnergyExpertResult";
import { EnergyHeader } from "@/components/landing/energy/EnergyHeader";
import { EnergyHero } from "@/components/landing/energy/EnergyHero";
import { EnergyHowItWorks } from "@/components/landing/energy/EnergyHowItWorks";
import { EnergyIncluded } from "@/components/landing/energy/EnergyIncluded";
import {
  EnergyOrderProvider,
  useEnergyOrder,
} from "@/components/landing/energy/EnergyOrderContext";
import { EnergyOtherCheckups } from "@/components/landing/energy/EnergyOtherCheckups";
import { EnergyStickyCta } from "@/components/landing/energy/EnergyStickyCta";
import { EnergyWhereToTest } from "@/components/landing/energy/EnergyWhereToTest";
import { reachGoal } from "@/lib/yandexMetrika";
import { useTheme } from "next-themes";
import { useEffect } from "react";

function EnergyContent() {
  const { addToCart, inCart, openCart } = useEnergyOrder();

  const handleAddToCart = () => {
    reachGoal("energy_add_to_cart");
    addToCart();
  };

  return (
    <div className="min-h-screen max-lg:overflow-x-clip bg-background">
      <PageMeta
        title="ReAge Energy — чекап при усталости: 6 анализов на энергию"
        description="Чекап ReAge Energy: ОАК, ферритин, витамин D, ТТГ, глюкоза и HbA1c за 5 990 ₽. Анализы в LabQuest, результаты с разбором в ReAge за 1–2 дня."
        canonical="/energy"
      />
      <EnergyHeader cartCount={inCart ? 1 : 0} onOpenCart={openCart} />
      <main className="pb-20 lg:pb-0">
        <EnergyHero onAddToCart={handleAddToCart} />
        <EnergyIncluded />
        <EnergyWhereToTest />
        <EnergyExpertResult />
        <EnergyHowItWorks onAddToCart={handleAddToCart} />
        <EnergyOtherCheckups />
      </main>
      <div id="energy-page-end" />
      <Footer />
      <EnergyStickyCta
        cartCount={inCart ? 1 : 0}
        onAddToCart={handleAddToCart}
        anchorId="energy-hero-cta"
        hideNearId="energy-page-end"
      />
      <EnergyCart />
    </div>
  );
}

export default function Energy() {
  return (
    <EnergyOrderProvider>
      <EnergyContent />
    </EnergyOrderProvider>
  );
}
