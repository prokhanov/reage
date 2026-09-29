import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { PageMeta } from "@/components/PageMeta";
import { Footer } from "@/components/landing/CTASection";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import { EnergyExpertResult } from "@/components/landing/energy/EnergyExpertResult";
import { EnergyHeader } from "@/components/landing/energy/EnergyHeader";
import { EnergyHowItWorks } from "@/components/landing/energy/EnergyHowItWorks";
import {
  EnergyOrderProvider,
  useEnergyOrder,
} from "@/components/landing/energy/EnergyOrderContext";
import { EnergyOtherCheckups } from "@/components/landing/energy/EnergyOtherCheckups";
import { EnergyStickyCta } from "@/components/landing/energy/EnergyStickyCta";
import { EnergyWhereToTest } from "@/components/landing/energy/EnergyWhereToTest";
import { FullCheckupHero } from "@/components/landing/energy/FullCheckupHero";
import { FullCheckupIncluded } from "@/components/landing/energy/FullCheckupIncluded";
import { BiomarkerComparisonDialog } from "@/components/landing/BiomarkerComparisonDialog";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { useResolvedCheckups } from "@/hooks/useResolvedCheckups";
import { initActiveTimeTracker } from "@/lib/activeTimeTracker";
import { reachGoal } from "@/lib/yandexMetrika";

function FullCheckupContent({ onVariantChange }: { onVariantChange: (slug: string) => void }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const { variantsFor } = useResolvedCheckups();
  const { addToCart, inCart, openCart, checkup, count } = useEnergyOrder();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    const startTracker = () => initActiveTimeTracker();
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const idleId = w.requestIdleCallback
      ? w.requestIdleCallback(startTracker, { timeout: 3000 })
      : (window.setTimeout(startTracker, 1500) as unknown as number);
    return () => {
      const wc = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (wc.cancelIdleCallback) wc.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  const handleAddToCart = () => {
    if (!inCart) reachGoal("full_add_to_cart");
    addToCart();
  };

  return (
    <div className="min-h-screen max-lg:overflow-x-clip bg-background">
      <PageMeta
        title={checkup.seoTitle}
        description={checkup.seoDescription}
        canonical={checkup.href}
      />
      <EnergyHeader cartCount={count} onOpenCart={openCart} />
      <main className="pb-20 lg:pb-0">
        <FullCheckupHero
          checkup={checkup}
          onAddToCart={handleAddToCart}
          variants={variantsFor(FULL_CHECKUP.slug)}
          onVariantChange={onVariantChange}
          onOpenCompare={() => setCompareOpen(true)}
        />
        <EnergyHowItWorks full />
        <FullCheckupIncluded slug={checkup.slug} />
        <EnergyWhereToTest />
        <EnergyExpertResult demoReport showBuyCta />
        <EnergyOtherCheckups currentSlug={checkup.slug} />
      </main>
      <div id="energy-page-end" />
      <Footer />
      <EnergyStickyCta
        cartCount={count}
        inCart={inCart}
        onAddToCart={handleAddToCart}
        anchorId="energy-hero-cta"
        hideNearId="energy-page-end"
        price={checkup.price}
        name={checkup.name}
      />
      <EnergyCart />
      <BiomarkerComparisonDialog open={compareOpen} onOpenChange={setCompareOpen} />
    </div>
  );
}

export default function FullCheckup() {
  const [variantSlug, setVariantSlug] = useState(FULL_CHECKUP.slug);
  const { bySlug } = useResolvedCheckups();
  const current = bySlug(variantSlug) ?? FULL_CHECKUP;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
  }, []);

  return (
    <EnergyOrderProvider checkup={current}>
      <FullCheckupContent onVariantChange={setVariantSlug} />
    </EnergyOrderProvider>
  );
}
