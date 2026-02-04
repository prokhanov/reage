import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ArrowRight, Sparkles, Clock, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function HeroSection() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-32 -left-32 w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-primary rounded-full blur-[120px] opacity-[0.15] animate-float"
        />
        <div 
          className="absolute top-1/4 -right-32 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-accent rounded-full blur-[100px] opacity-[0.12] animate-float-delayed"
        />
        <div 
          className="absolute -bottom-48 left-1/4 w-[500px] h-[500px] md:w-[800px] md:h-[800px] bg-secondary-glow rounded-full blur-[140px] opacity-[0.10] animate-float-slow"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">50+ биомаркеров • AI-анализ • Забор на дому</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="block text-foreground">Ваши анализы скажут,</span>
            <span className="block mt-2 bg-gradient-hero bg-clip-text text-transparent">
              сколько вам на самом деле
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Один забор крови. Точный расчёт биологического возраста. 
            <span className="hidden sm:inline"><br /></span>
            Медсестра приедет к вам.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              onClick={() => navigate("/register")} 
              className="text-lg px-8 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
            >
              Узнать свой возраст
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
            >
              Войти в аккаунт
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <StatCard 
              icon={<Sparkles className="w-5 h-5" />}
              value="50+"
              label="биомаркеров"
            />
            <StatCard 
              icon={<Clock className="w-5 h-5" />}
              value="15 мин"
              label="забор крови"
            />
            <StatCard 
              icon={<Shield className="w-5 h-5" />}
              value="5 дней"
              label="до результата"
            />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center justify-center sm:justify-start gap-3 p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/20 transition-all duration-300 group">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="text-left">
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
