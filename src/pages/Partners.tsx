import { PageMeta } from "@/components/PageMeta";
import { PartnerApplyDialog } from "./partners/PartnerApplyDialog";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { PartnersHeader, PartnersHero, StatsStrip, WhoCanPartner, HowItWorks, PartnerStatuses } from "./partners/PartnersTop";
import { JoinSection, PartnersFooter } from "./partners/PartnersBottom";
import { SplitCalculator, BonusSection, ConnectSection, EarningsSection, FaqSection } from "./partners/PartnersPart2";

export default function Partners() {
  const scrollToJoin = () => {
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="ReAge Партнёрам — партнёрская программа для специалистов"
        description="Направьте клиента на чекап ReAge: клиенту скидка 5%, вам 20% с каждой покупки. Подключение по короткой заявке, выплата на карту за 24 часа."
        canonical="/partners"
      />
      <PartnersHeader onJoin={scrollToJoin} />
      <main>
        <PartnersHero onJoin={scrollToJoin} />
        <StatsStrip />
        <WhoCanPartner />
        <PartnerStatuses />
        <HowItWorks />
        <JoinSection />
        <SplitCalculator />
        <BonusSection />
        <EarningsSection />
        <FaqSection />
        <ConnectSection />
      </main>
      <PartnersFooter />
      <PartnerApplyDialog />
      <SupportChatWidget />
    </div>
  );
}
