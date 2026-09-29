import { useState } from "react";

import { PageMeta } from "@/components/PageMeta";
import {
  IncomeSection,
  NAV,
  PartnersHeader,
  PartnersHero,
  StatsStrip,
  HowItWorks,
} from "./partners/PartnersTop";
import {
  BenefitsSection,
  FinalCta,
  JoinSection,
  PartnersFaq,
} from "./partners/PartnersBottom";

export default function Partners() {
  const [joinSignal, setJoinSignal] = useState(0);

  // Кнопка «Подключиться» в шапке ведёт к секции подключения.
  const scrollToJoin = () => {
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setJoinSignal((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="ReAge Партнёрам — партнёрская программа для специалистов"
        description="Направьте клиента на чекап ReAge: клиенту скидка 5%, вам 20% с каждой покупки. Подключение через Telegram за одну минуту, выплата на карту за 24 часа."
        canonical="/partners"
      />
      <PartnersHeader onJoin={scrollToJoin} />
      <main key={joinSignal}>
        <PartnersHero onJoin={scrollToJoin} />
        <StatsStrip />
        <HowItWorks />
        <BenefitsSection />
        <IncomeSection />
        <JoinSection />
        <PartnersFaq />
        <FinalCta />
      </main>
      {/* Якорь для кнопки в шапке. */}
      <span id="join" className="sr-only" aria-hidden />
      {NAV.length === 0 ? null : null}
    </div>
  );
}
