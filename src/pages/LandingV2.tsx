import { useEffect } from "react";
import { HeroBlock } from "@/components/landing/v2/HeroBlock";
import { HeroBlockCentered } from "@/components/landing/v2/HeroBlockCentered";
import { HeroBlockPortrait } from "@/components/landing/v2/HeroBlockPortrait";
import { HowItWorksBlock } from "@/components/landing/v2/HowItWorksBlock";

const Block = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <section className="relative">
    <div className="pointer-events-none absolute left-2 top-2 z-50 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-lg sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-sm">
      Блок {n}
    </div>
    {children}
  </section>
);

const LandingV2 = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Block n={3}>
        <HeroBlockPortrait />
      </Block>
      <Block n={4}>
        <HowItWorksBlock />
      </Block>
    </div>
  );
};

export default LandingV2;
