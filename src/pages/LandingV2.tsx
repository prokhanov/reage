import { useEffect, Children, isValidElement, cloneElement, ReactNode } from "react";
import { HeroBlockPortrait } from "@/components/landing/v2/HeroBlockPortrait";
import { HowItWorksBlock } from "@/components/landing/v2/HowItWorksBlock";

const Block = ({ n, children }: { n?: number; children: ReactNode }) => (
  <section className="relative">
    <div className="pointer-events-none absolute left-2 top-2 z-50 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-lg sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-sm">
      Блок {n}
    </div>
    {children}
  </section>
);

const Blocks = ({ children }: { children: ReactNode }) => {
  let i = 0;
  return (
    <>
      {Children.map(children, (child) => {
        if (isValidElement(child) && child.type === Block) {
          i += 1;
          return cloneElement(child as React.ReactElement<{ n: number }>, { n: i });
        }
        return child;
      })}
    </>
  );
};

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

  const editOn = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("layoutEdit") === "1";

  const toggleEdit = () => {
    const url = new URL(window.location.href);
    if (editOn) url.searchParams.delete("layoutEdit");
    else url.searchParams.set("layoutEdit", "1");
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[60] flex justify-end bg-background/80 backdrop-blur border-b border-border px-3 py-2">
        <button
          onClick={toggleEdit}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
            editOn
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {editOn ? "Выйти из Edit-режима" : "Edit-режим раскладки"}
        </button>
      </div>
      <Blocks>
        <Block>
          <HeroBlockPortrait />
        </Block>
        <Block>
          <HowItWorksBlock />
        </Block>
      </Blocks>
    </div>
  );
};

export default LandingV2;
