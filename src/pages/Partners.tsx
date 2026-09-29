import { PageMeta } from "@/components/PageMeta";
import { PartnersHeader, PartnersHero, StatsStrip, WhoCanPartner, HowItWorks } from "./partners/PartnersTop";
import { JoinSection, PartnersFooter } from "./partners/PartnersBottom";
import { BonusSection, ConnectSection, EarningsSection, FaqSection } from "./partners/PartnersPart2";

export default function Partners() {
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
        <WhoCanPartner />
        <HowItWorks />
        <JoinSection />
        <BonusSection />
        <EarningsSection />
        <FaqSection />
        <ConnectSection />
      </main>
      <PartnersFooter />
    </div>
  );
}
