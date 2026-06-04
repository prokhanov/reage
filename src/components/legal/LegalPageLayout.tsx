import { ArrowLeft, FileText, Shield, ScrollText, ClipboardCheck, FlaskConical, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function LegalPageLayout({ title, subtitle, icon, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              На главную
            </button>
            <span className="text-lg font-bold bg-gradient-hero bg-clip-text text-transparent">
              ReAge
            </span>
          </div>
        </header>

        {/* Hero */}
        <section className="relative pt-16 pb-8 md:pt-24 md:pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                {icon || <FileText className="w-6 h-6 text-primary" />}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden">
                {/* Gradient border */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-border/50 to-accent/20 rounded-3xl" />
                <div className="relative m-[1px] rounded-[23px] bg-card/80 backdrop-blur-sm border border-border/30 p-8 md:p-12 lg:p-16">
                  <div className="prose prose-invert prose-lg max-w-none">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ReAge. Все права защищены.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function DocumentCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="group w-full text-left p-6 rounded-2xl bg-card/50 border border-border/40 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <ArrowLeft className="w-5 h-5 text-muted-foreground -rotate-180 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}
