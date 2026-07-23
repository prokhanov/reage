import { LifestyleQuizCTASection } from "@/components/landing/LifestyleQuizCTASection";
import { PageMeta } from "@/components/PageMeta";

const LifestyleTest = () => {
  return (
    <>
      <PageMeta
        title="Тест Lifestyle-6 — оцени скрытые риски образа жизни | ReAge"
        description="Короткая анкета по 6 сферам жизни за 3 минуты покажет, за какими сигналами тела могут прятаться настоящие проблемы, и какие маркеры это проверят."
      />
      <main className="min-h-screen bg-background">
        <LifestyleQuizCTASection />
      </main>
    </>
  );
};

export default LifestyleTest;
