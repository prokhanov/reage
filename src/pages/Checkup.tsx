import { useEffect } from "react";
import { useParams } from "react-router-dom";

import NotFound from "@/pages/NotFound";
import { useTheme } from "next-themes";

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
import { getCheckupBySlug, type Checkup } from "@/data/checkups";
import { reachGoal } from "@/lib/yandexMetrika";

export function CheckupContent() {
  const { addToCart, inCart, openCart, checkup } = useEnergyOrder();
  const { setTheme } = useTheme();

  // На страницах чекапов по умолчанию используем светлую тему
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const handleAddToCart = () => {
    reachGoal(`${checkup.slug.replace(/-/g, "_")}_add_to_cart`);
    addToCart();
  };

  return (
    <div className="min-h-screen max-lg:overflow-x-clip bg-background">
      <PageMeta
        title={checkup.seoTitle}
        description={checkup.seoDescription}
        canonical={checkup.href}
      />
      <EnergyHeader cartCount={inCart ? 1 : 0} onOpenCart={openCart} />
      <main className="pb-20 lg:pb-0">
        <EnergyHero onAddToCart={handleAddToCart} checkup={checkup} />
        <EnergyIncluded checkup={checkup} />
        <EnergyWhereToTest />
        <EnergyExpertResult />
        <EnergyHowItWorks onAddToCart={handleAddToCart} price={checkup.price} />
        <EnergyOtherCheckups currentSlug={checkup.slug} />
      </main>
      <div id="energy-page-end" />
      <Footer />
      <EnergyStickyCta
        cartCount={inCart ? 1 : 0}
        onAddToCart={handleAddToCart}
        anchorId="energy-hero-cta"
        hideNearId="energy-page-end"
        price={checkup.price}
        name={checkup.name}
      />
      <EnergyCart />
    </div>
  );
}

export function CheckupPage({ checkup }: { checkup: Checkup }) {
  return (
    <EnergyOrderProvider checkup={checkup}>
      <CheckupContent />
    </EnergyOrderProvider>
  );
}

export default function Checkup() {
  const { slug } = useParams();
  const checkup = getCheckupBySlug(slug);

  if (!checkup) return <NotFound />;


  return <CheckupPage key={checkup.slug} checkup={checkup} />;
}
