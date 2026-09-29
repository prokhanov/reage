import { PageMeta } from "@/components/PageMeta";
import {
  IncomeSection,
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
  // Кнопка «Подключиться» в шапке ведёт к секции подключения.
  const scrollToJoin = () => {
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="ReAge Партнёрам — партнёрская программа для специалистов"
        description="Направьте клиента на чекап ReAge: клиенту скидка 5%, вам 20% с каждой покупки. Подключение через Telegram за одну минуту, выплата на карту за 24 часа."
        canonical="/partners"
      />
      <PartnersHeader onJoin={scrollToJoin} />
      <main>
        <PartnersHero onJoin={scrollToJoin} />
        <StatsStrip />
        <HowItWorks />
        <BenefitsSection />
        <IncomeSection />
        <div id="join" className="scroll-mt-20" />
        <JoinSection />
        <PartnersFaq />
        <FinalCta />
      </main>
    </div>
  );
}
