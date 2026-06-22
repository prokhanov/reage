import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
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
        isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-6 pt-4 text-muted-foreground leading-relaxed space-y-3">
          {answer.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    {
      question: "Что такое ReAge?",
      answer: "Годовая программа наблюдения за здоровьем. Мы организуем регулярную сдачу анализов, собираем результаты в единый отчёт, отслеживаем изменения показателей во времени и помогаем понимать, что происходит с организмом — не только сейчас, но и в динамике.",
    },
    {
      question: "Сколько анализов и консультаций входит в год?",
      answer: "Базовый — 2 анализа и 2 консультации, Плюс — 3 анализа и 3 консультации, Экспертный — 4 анализа и 4 консультации.",
    },
    {
      question: "Где сдавать анализы — дома или в клинике?",
      answer: "Основной формат — выезд медсестры на дом или в офис. Если удобнее, можно сдать в партнёрской лаборатории самостоятельно.",
    },
    {
      question: "Я регулярно сдаю анализы сам — зачем мне ReAge?",
      answer: "Лаборатория показывает отдельные цифры. ReAge собирает их в единую картину и показывает, как они меняются год к году — то, что отдельные анализы никогда не покажут.",
    },
    {
      question: "Почему нельзя просто сдавать анализы в обычной лаборатории дешевле?",
      answer: "Можно. Но это даст отдельные результаты без интерпретации и без сравнения с предыдущей точкой.\n\nКроме того, «в пределах нормы» не всегда означает, что всё в порядке. Лабораторные референсные значения формируются на основе статистики большой группы людей — в эти диапазоны попадают и показатели тех, у кого уже есть заболевания. Поэтому формальное соответствие норме не гарантирует оптимальное состояние организма.\n\nПлюс в обычном чекапе показатели обычно смотрят изолированно — каждый отдельно от других. Но организм работает как единая система: без анализа взаимосвязей между показателями вы видите цифры, но не понимаете, что на самом деле происходит и какие риски остаются незаметными, даже если каждый отдельный анализ «в норме».",
    },
    {
      question: "У меня уже куча анализов, я не понимаю, что с ними делать — это про меня?",
      answer: "Да. Основная проблема не в нехватке анализов, а в том, что цифры без контекста ничего не говорят. ReAge собирает их в одну картину и объясняет, что это значит именно для вас.",
    },
    {
      question: "Я чувствую себя отлично — мне это рано?",
      answer: "Многие изменения в организме происходят задолго до симптомов. Чем раньше есть отправная точка, тем раньше видна тенденция, а не только факт, когда уже что-то болит.",
    },
    {
      question: "Сколько биомаркеров входит?",
      answer: "В зависимости от тарифа — 72, 94 или 104. На сегодняшний день это самый подробный в России сервис подобного формата.",
    },
    {
      question: "Это генетический тест?",
      answer: "Нет. Мы работаем с текущим состоянием организма по анализам крови и другим показателям, а не с ДНК.",
    },
    {
      question: "А чем это лучше генетического теста?",
      answer: "Генетика показывает предрасположенность — то, что заложено и не меняется в течение жизни. Это статичная картина, снятая один раз. Она не отражает, как вы сейчас себя чувствуете и как на это влияют сон, питание, нагрузка и стресс — потому что ДНК от этого не меняется.\n\nReAge работает именно с тем, что меняется. Мы показываем текущее состояние организма и то, как оно меняется со временем — а значит, на это можно влиять и видеть результат.",
    },
    {
      question: "Почему так дорого по сравнению с обычным чекапом?",
      answer: "На самом деле ReAge выходит дешевле, чем сдавать аналогичный набор анализов самостоятельно в обычной лаборатории — за счёт партнёрских цен на исследования. При этом в стоимость входит не просто результат, а расшифровка показателей, рекомендации врача, отслеживание трендов несколько раз в год и анализ по 5 системам организма с учётом взаимосвязей между показателями — того, что отдельная сдача анализов не даёт ни при какой цене.",
    },
    {
      question: "Вы ставите диагнозы или назначаете лечение?",
      answer: "Нет. Назначения остаются за лечащим врачом — если отчёт показывает основания для консультации, мы направляем к профильному специалисту с готовыми данными.",
    },
    {
      question: "Что если через год окажется, что всё то же самое, ничего не изменилось?",
      answer: "Это тоже ценная информация — значит, текущий образ жизни поддерживает стабильное состояние, и это подтверждено данными, а не предположением.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <section className="relative py-10 md:py-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
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
            Не нашли ответ? <Link to="/faq" className="text-primary hover:underline font-medium">Смотрите полный FAQ</Link> — или напишите нам, ответим в течение часа
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
    </>
  );
}
