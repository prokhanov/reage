import { Star, Quote } from "lucide-react";

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  avatar: string;
  rating: number;
  highlight?: string;
  delay: number;
}

function TestimonialCard({ quote, author, role, avatar, rating, highlight, delay }: TestimonialProps) {
  return (
    <div 
      className="group relative h-full animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
      
      <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/20">
        {/* Quote icon */}
        <div className="absolute top-6 right-6 opacity-10">
          <Quote className="w-12 h-12 text-primary" />
        </div>
        
        {/* Rating */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`w-4 h-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} 
            />
          ))}
        </div>
        
        {/* Highlight badge */}
        {highlight && (
          <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            {highlight}
          </div>
        )}
        
        {/* Quote */}
        <blockquote className="text-foreground leading-relaxed mb-6">
          "{quote}"
        </blockquote>
        
        {/* Author */}
        <div className="flex items-center gap-4 mt-auto">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
            {avatar}
          </div>
          <div>
            <div className="font-semibold text-foreground">{author}</div>
            <div className="text-sm text-muted-foreground">{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const testimonials: Omit<TestimonialProps, 'delay'>[] = [
    {
      quote: "Наконец-то понял, почему постоянно уставал. Оказалось, витамин D был на нижней границе нормы. После коррекции — небо и земля.",
      author: "Алексей К.",
      role: "Предприниматель, 38 лет",
      avatar: "А",
      rating: 5,
      highlight: "Биовозраст -4 года",
    },
    {
      quote: "Раньше сдавала анализы раз в год и забывала про них. Теперь вижу тренды, понимаю что работает, а что нет. Это совсем другой уровень.",
      author: "Мария С.",
      role: "Маркетолог, 34 года",
      avatar: "М",
      rating: 5,
      highlight: "3 анализа за год",
    },
    {
      quote: "AI-рекомендации удивили. Очень конкретные советы, не вода. Особенно понравился план по улучшению липидного профиля.",
      author: "Дмитрий В.",
      role: "IT-директор, 45 лет",
      avatar: "Д",
      rating: 5,
      highlight: "Холестерин в норме",
    },
    {
      quote: "Медсестра приехала вовремя, всё быстро и профессионально. Результаты пришли раньше срока. Очень удобный сервис.",
      author: "Елена П.",
      role: "Врач, 42 года",
      avatar: "Е",
      rating: 5,
    },
    {
      quote: "После 40 понял, что здоровье нужно отслеживать системно. ReAge дал именно это — полную картину и план действий.",
      author: "Игорь Н.",
      role: "Финансист, 47 лет",
      avatar: "И",
      rating: 5,
      highlight: "Постоянный клиент",
    },
    {
      quote: "Сравнивала с обычными лабораториями — тут реально больше инсайтов. Биологический возраст стал отличной мотивацией.",
      author: "Анна Л.",
      role: "HR-директор, 36 лет",
      avatar: "А",
      rating: 5,
      highlight: "Биовозраст -6 лет",
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">Отзывы клиентов</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Что говорят </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              наши клиенты
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Реальные истории людей, которые взяли здоровье под контроль
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index} 
              {...testimonial} 
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <StatItem value="500+" label="клиентов" />
          <StatItem value="4.9" label="средняя оценка" />
          <StatItem value="2000+" label="анализов" />
          <StatItem value="-5 лет" label="средний результат" />
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
