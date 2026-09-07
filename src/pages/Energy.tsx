import { useState } from "react";
import { toast } from "sonner";

import { PageMeta } from "@/components/PageMeta";
import { Footer } from "@/components/landing/CTASection";
import { EnergyExpertResult } from "@/components/landing/energy/EnergyExpertResult";
import { EnergyHeader } from "@/components/landing/energy/EnergyHeader";
import { EnergyHero } from "@/components/landing/energy/EnergyHero";
import { EnergyHowItWorks } from "@/components/landing/energy/EnergyHowItWorks";
import { EnergyIncluded } from "@/components/landing/energy/EnergyIncluded";
import { EnergyOtherCheckups } from "@/components/landing/energy/EnergyOtherCheckups";
import { EnergyStickyCta } from "@/components/landing/energy/EnergyStickyCta";
import { EnergyWhereToTest } from "@/components/landing/energy/EnergyWhereToTest";
import { reachGoal } from "@/lib/yandexMetrika";

export default function Energy() {
  const [cartCount, setCartCount] = useState(0);

  const handleAddToCart = () => {
    setCartCount((v) => v + 1);
    reachGoal("energy_add_to_cart");
    toast.success("ReAge Energy добавлен в корзину", {
      description: "Оформление заказа скоро будет доступно.",
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <PageMeta
        title="ReAge Energy — чекап при усталости: 6 анализов на энергию"
        description="Чекап ReAge Energy: ОАК, ферритин, витамин D, ТТГ, глюкоза и HbA1c за 5 990 ₽. Анализы в LabQuest, результаты с разбором в ReAge за 1–2 дня."
        canonical="/energy"
      />
      <EnergyHeader cartCount={cartCount} />
      <main className="pb-20 lg:pb-0">
        <EnergyHero onAddToCart={handleAddToCart} />
        <EnergyIncluded />
        <EnergyWhereToTest />
        <EnergyExpertResult />
        <EnergyHowItWorks />
        <EnergyOtherCheckups />
      </main>
      <div id="energy-page-end" />
      <Footer />
      <EnergyStickyCta
        cartCount={cartCount}
        onAddToCart={handleAddToCart}
        anchorId="energy-hero-cta"
        hideNearId="energy-page-end"
      />
    </div>
  );
}
