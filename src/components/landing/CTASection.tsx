import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, MessageCircle, Instagram, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoDark from "@/assets/reage-logo-dark.png";
import { useRegisterGuard } from "@/components/RegisterGuard";
import { FeedbackDialog } from "@/components/landing/FeedbackDialog";

export function CTASection() {
  const { requestRegister } = useRegisterGuard();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);


  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
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
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground whitespace-pre-line">
                  Время покажет.{"\u00A0"}{"\n"}<span className="bg-gradient-hero bg-clip-text text-transparent">Мы покажем раньше.</span>{"\n"}
                </h2>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Начните мониторинг здоровья сегодня
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button 
                    size="lg"
                    onClick={requestRegister}
                    className="text-lg px-10 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
                  >
                    Посмотреть демо-аккаунт
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    asChild
                    size="lg"
                    variant="outline"
                    className="text-lg px-10 py-6 border-accent/50 hover:border-accent hover:bg-accent/10 hover:text-foreground group"
                  >
                    <Link to="/subscription">
                      <CreditCard className="mr-2 w-5 h-5 text-accent" />
                      Оформить подписку
                    </Link>
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

      <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
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
          </div>


          <div className="md:col-span-5 lg:col-span-4 md:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-4">
              Связаться с нами
            </p>
            <div className="flex md:justify-end gap-2.5 mb-5">
              <ContactButton
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                href="mailto:team@reage.life"
              />
              <ContactButton
                icon={<Phone className="w-4 h-4" />}
                label="Телефон"
                href="tel:+79959984638"
              />
              <ContactButton
                icon={<MessageCircle className="w-4 h-4" />}
                label="Telegram"
                href="https://t.me/reage.life"
              />
              <ContactButton
                icon={<Instagram className="w-4 h-4" />}
                label="Instagram"
                href="https://instagram.com/reage.life"
              />
              <ContactButton
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.575c0 .424-.136.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.866 4 8.38c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.18-3.608 2.18-3.608.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.474-.085.716-.576.716z" />
                  </svg>
                }
                label="VK"
                href="https://vk.com/reage.life"
              />
            </div>
            <a
              href="mailto:team@reage.life"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              team@reage.life
            </a>
          </div>
        </div>

        {/* Disclaimer: full width */}
        <div className="border-t border-border/40 py-10 text-sm text-foreground/70 leading-relaxed space-y-3">
          <p>ReAge (ООО «Реэйдж», ИНН 9704271028) является информационно-аналитическим сервисом и не осуществляет медицинскую деятельность.</p>
          <p>Сервис ReAge предназначен для сбора, хранения, обработки, визуализации и представления информации о показателях здоровья пользователя, полученной из результатов лабораторных исследований.</p>
          <p>Материалы, отчеты, оценки, индексы, показатели биологического возраста, аналитические выводы и иная информация, формируемые сервисом ReAge с использованием алгоритмов обработки данных, носят исключительно информационный характер, не являются медицинским заключением, диагнозом, назначением лечения либо медицинской консультацией и не заменяют обращение к врачу.</p>
          <p>Медицинские услуги, включая забор биологического материала и проведение лабораторных исследований, оказываются АО «ЛабКвест» (ОГРН 1167746128692) на основании действующей лицензии на осуществление медицинской деятельности.</p>
          <p>Используя сайт, вы соглашаетесь с Пользовательским соглашением, Политикой обработки персональных данных и использованием файлов cookie.</p>
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

function ContactButton({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/40 border border-border/60 text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-300"
      aria-label={label}
    >
      {icon}
    </a>
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