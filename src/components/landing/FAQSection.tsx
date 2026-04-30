import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  delay: number;
}

function FAQItem({ question, answer, isOpen, onToggle, delay }: FAQItemProps) {
  return (
    <div 
      className="animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between gap-4 p-6 rounded-2xl text-left transition-all duration-300",
          isOpen 
            ? "bg-primary/5 border border-primary/20" 
            : "bg-card/50 border border-border/50 hover:bg-card/80 hover:border-primary/20"
        )}
      >
        <span className="font-semibold text-foreground">{question}</span>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
            isOpen && "rotate-180 text-primary"
          )} 
        />
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-6 pt-4 text-muted-foreground leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    {
      question: "Как рассчитывается биологический возраст?",
      answer: "Биологический возраст рассчитывается на основе ключевых показателей крови. Мы анализируем маркеры воспаления, обмена веществ, гормонального баланса и других систем, сравнивая ваши показатели с оптимальными значениями для разных возрастных групп.",
    },
    {
      question: "Чем вы отличаетесь от обычных лабораторий?",
      answer: "Обычные лаборатории дают только цифры и широкие референсные значения. Мы же анализируем оптимальные диапазоны, готовим подробный отчёт с расшифровками, отслеживаем динамику и даём персональные рекомендации по улучшению ваших показателей.",
    },
    {
      question: "Как происходит забор крови?",
      answer: "Сертифицированная медсестра приезжает к вам домой или в офис в выбранное время. Процедура занимает около 10-15 минут. Используются только одноразовые стерильные инструменты, образцы крови сразу отправляются в аккредитованную лабораторию для исследования.",
    },
    {
      question: "Когда будут готовы результаты?",
      answer: "Стандартный срок — 5 рабочих дней с момента забора крови. Для Premium-подписчиков доступны экспресс-результаты за 3 дня. Вы получите уведомление, когда результаты будут готовы.",
    },
    {
      question: "Можно ли отменить подписку?",
      answer: "Да, вы можете отменить подписку в любой момент. Мы также предлагаем возврат средств в течение 14 дней после первого анализа, если результаты вас не устроят.",
    },
    {
      question: "Нужна ли подготовка к анализу?",
      answer: "Да, стандартная подготовка: сдавать кровь натощак (8-12 часов без еды), за сутки исключить алкоголь и интенсивные физические нагрузки. Подробные инструкции отправим за день до визита.",
    },
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Частые вопросы</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Ответы на </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              ваши вопросы
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Не нашли ответ? Напишите нам — ответим в течение часа
          </p>
        </div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              delay={0.1 + index * 0.05}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
