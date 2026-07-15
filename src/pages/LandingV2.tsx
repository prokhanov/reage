import { BenefitsBlock } from "@/components/landing/v2/BenefitsBlock";
import { HeroBlockPortrait } from "@/components/landing/v2/HeroBlockPortrait";
import { HowItWorksBlock } from "@/components/landing/v2/HowItWorksBlock";
import { CycleInfographicBlock } from "@/components/landing/v2/CycleInfographicBlock";
import { ConsultationCtaBlock } from "@/components/landing/v2/ConsultationCtaBlock";
import { QuizCTASection } from "@/components/landing/QuizCTASection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import {
  ReportCollageBlock,
  REPORT_COLLAGE_DEFAULT_LAYOUTS,
  REPORT_COLLAGE_STORAGE_KEY,
} from "@/components/landing/v2/ReportCollageBlock";
import { ReportShowcaseSection } from "@/components/landing/ReportShowcaseSection";
import { HeroPortraitClassic } from "@/components/landing/HeroPortraitClassic";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { useEffect, useState, Children, isValidElement, cloneElement, ReactNode } from "react";

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

  const [editOn, setEditOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("layoutEdit") === "1";
  });

  useEffect(() => {
    const onPop = () => {
      setEditOn(new URLSearchParams(window.location.search).get("layoutEdit") === "1");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleEdit = () => {
    setEditOn((prev) => {
      const next = !prev;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("layoutEdit", "1");
      else url.searchParams.delete("layoutEdit");
      window.history.replaceState({}, "", url.toString());
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[60] flex justify-end gap-2 bg-background/80 backdrop-blur border-b border-border px-3 py-2">
        {editOn && (
          <button
            onClick={async () => {
              const storedReportLayouts = JSON.parse(localStorage.getItem(REPORT_COLLAGE_STORAGE_KEY) || "{}");
              const text = JSON.stringify(
                {
                  heroLayoutV2: JSON.parse(localStorage.getItem("heroLayoutV2") || "{}"),
                  reportCollageLayoutV2: Object.fromEntries(
                    Object.entries(REPORT_COLLAGE_DEFAULT_LAYOUTS).map(([bp, defaults]) => [
                      bp,
                      Object.fromEntries(
                        Object.entries(defaults).map(([id, pos]) => [
                          id,
                          { ...pos, ...(storedReportLayouts[bp]?.[id] ?? {}) },
                        ]),
                      ),
                    ]),
                  ),
                },
                null,
                2,
              );
              const ok = await copyToClipboard(text);
              window.prompt(
                ok ? "Все координаты скопированы. Если буфер недоступен — скопируйте отсюда:" : "Скопируйте координаты вручную:",
                text,
              );
            }}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground"
          >
            Copy layouts
          </button>
        )}
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
          <HeroBlockPortrait editMode={editOn} />
        </Block>
        <Block>
          <HeroPortraitClassic />
        </Block>
        <Block>
          <HowItWorksBlock />
        </Block>
        <Block>
          <CycleInfographicBlock />
        </Block>
        <Block>
          <HowItWorksSection />
        </Block>
        <Block>
          <ReportCollageBlock editMode={editOn} />
        </Block>
        <Block>
          <ReportShowcaseSection />
        </Block>
        <Block>
          <ConsultationCtaBlock />
        </Block>

        {/* Скрыто по просьбе — блок в «черновиках», не удалять
        <Block>
          <BenefitsBlock />
        </Block>
        */}
      </Blocks>
    </div>
  );
};

export default LandingV2;
