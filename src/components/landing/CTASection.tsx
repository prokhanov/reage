import { ArrowRight, Mail, Phone, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      {/* Animated orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-[150px] animate-float" />
        <div className="absolute inset-20 bg-accent/10 rounded-full blur-[120px] animate-float-delayed" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <div className="relative rounded-3xl overflow-hidden animate-fade-in">
            {/* Gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary rounded-3xl" />
            
            <div className="relative m-[2px] rounded-[22px] bg-card p-8 md:p-12 lg:p-16 my-px">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
                  Готовы взять свое{" "}
                  <span className="bg-gradient-hero bg-clip-text text-transparent">здоровье под контроль?</span>
                </h2>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Начните мониторинг здоровья сегодня
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button 
                    size="lg"
                    onClick={() => navigate("/register")}
                    className="text-lg px-10 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
                  >
                    Оформить подписку
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/register")}
                    className="text-lg px-10 py-6 border-accent/50 hover:border-accent hover:bg-accent/10 hover:text-foreground group"
                  >
                    <Sparkles className="mr-2 w-5 h-5 text-accent" />
                    Посмотреть демо-аккаунт
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {"\n"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="relative py-16 border-t border-border/50">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
              ReAge
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm whitespace-pre-line">
              {"Сервис по управлению здоровьем.\nУзнайте свой биологический возраст и получите персональные рекомендации."}
            </p>
            <div className="flex gap-4">
              <ContactButton icon={<Mail className="w-4 h-4" />} label="Email" />
              <ContactButton icon={<Phone className="w-4 h-4" />} label="Телефон" />
              <ContactButton icon={<MessageCircle className="w-4 h-4" />} label="Telegram" />
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Продукт</h4>
            <ul className="space-y-3">
              <FooterLink href="#" label="Как это работает" />
              <FooterLink href="#" label="Тарифы" />
              <FooterLink href="#" label="Биомаркеры" />
              <FooterLink href="#" label="Вопрос-ответ" />
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Юридическая информация</h4>
            <ul className="space-y-3">
              <FooterLink href="#" label="Реквизиты" />
              <FooterLink href="#" label="Политика обработки персональных данных" />
              <FooterLink href="#" label="Пользовательское соглашение" />
              <FooterLink href="#" label="Согласие на обработку персональных данных" />
              <FooterLink href="#" label="Согласие на получение и обработку исследований" />
              <FooterLink href="#" label="Все документы" />
            </ul>
          </div>
        </div>
        
        {/* Legal notice */}
        <div className="pt-8 pb-8 border-t border-border/30">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              ReAge — информационно-аналитический сервис и не оказывает медицинские услуги. Материалы сервиса не являются медицинским заключением, диагнозом или назначением лечения.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Лабораторные исследования выполняются лицензированными медицинскими организациями — партнёрами сервиса.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Оператор сервиса: ООО «Реэйдж» (ИНН 9704271028).
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Используя сайт, вы соглашаетесь с Пользовательским соглашением, Политикой обработки персональных данных и использованием файлов cookie.
            </p>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border/50 gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} ReAge. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}

function ContactButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button 
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 border border-border/50 text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300"
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function FooterLink({ href, label, small }: { href: string; label: string; small?: boolean }) {
  return (
    <li className="list-none">
      <a 
        href={href}
        className={`text-muted-foreground hover:text-primary transition-colors ${small ? "text-sm" : ""}`}
      >
        {label}
      </a>
    </li>
  );
}
