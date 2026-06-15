import { ArrowRight, Mail, Phone, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoDark from "@/assets/reage-logo-dark.png";

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

  const legalLinks = [
    { href: "/legal/requisites", label: "Реквизиты" },
    { href: "/legal/privacy", label: "Политика обработки персональных данных" },
    { href: "/legal/terms", label: "Пользовательское соглашение (оферта)" },
    { href: "/legal/consent-data", label: "Согласие на обработку персональных данных" },
    { href: "/legal/consent-research", label: "Согласие на обработку исследований" },
    { href: "/compliance", label: "Compliance" },
    { href: "/legal/documents", label: "Все документы" },
  ];

  return (
    <footer className="relative border-t border-border/40 overflow-hidden">
      {/* subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Top: brand + contacts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pt-16 pb-12">
          <div className="md:col-span-7 lg:col-span-8">
            <img
              src={logoDark}
              alt="ReAge"
              className="h-8 w-auto mb-3"
            />
            <div className="text-sm text-foreground/70 max-w-xl leading-relaxed space-y-3">
              <p>ReAge (ООО «Реэйдж», ИНН 9704271028) является информационно-аналитическим сервисом и не осуществляет медицинскую деятельность.</p>
              <p>Сервис ReAge предназначен для сбора, хранения, обработки, визуализации и представления информации о показателях здоровья пользователя, полученной из результатов лабораторных исследований.</p>
              <p>Материалы, отчеты, оценки, индексы, показатели биологического возраста, аналитические выводы и иная информация, формируемые сервисом ReAge с использованием алгоритмов обработки данных, носят исключительно информационный характер, не являются медицинским заключением, диагнозом, назначением лечения либо медицинской консультацией и не заменяют обращение к врачу.</p>
              <p>Медицинские услуги, включая забор биологического материала и проведение лабораторных исследований, оказываются АО «ЛабКвест» (ОГРН 1167746128692) на основании действующей лицензии на осуществление медицинской деятельности.</p>
              <p>Используя сайт, вы соглашаетесь с Пользовательским соглашением, Политикой обработки персональных данных и использованием файлов cookie.</p>
            </div>
          </div>

          <div className="md:col-span-5 lg:col-span-4 md:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-4">
              Связаться с нами
            </p>
            <div className="flex md:justify-end gap-2.5 mb-5">
              <ContactButton icon={<Mail className="w-4 h-4" />} label="Email" />
              <ContactButton icon={<Phone className="w-4 h-4" />} label="Телефон" />
              <ContactButton icon={<MessageCircle className="w-4 h-4" />} label="Telegram" />
            </div>
            <a
              href="mailto:team@reage.life"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              team@reage.life
            </a>
          </div>
        </div>

        {/* Legal grid */}
        <div className="border-t border-border/40 py-10">
          <div className="flex items-baseline justify-between mb-6">
            <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Юридическая информация
            </h4>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
            {legalLinks.map((link) => (
              <FooterLink key={link.href} href={link.href} label={link.label} />
            ))}
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center py-6 border-t border-border/40 gap-3">
          <p className="text-xs text-muted-foreground/70">
            © {currentYear} ООО «Реэйдж» · ИНН 9704271028 · ОГРН 1267700099985
          </p>
        </div>
      </div>
    </footer>
  );
}

function ContactButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/40 border border-border/60 text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-300"
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li className="list-none">
      <a
        href={href}
        className="text-sm text-foreground/70 hover:text-primary transition-colors"
      >
        {label}
      </a>
    </li>
  );
}