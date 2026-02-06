import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ArrowRight, Sparkles, Activity, TrendingUp, Brain, Heart, Home, FileText, MessageSquare, User, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

type Section = "dashboard" | "biomarkers" | "trends" | "recommendations" | "assistant";

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Моё здоровье", icon: <Home className="w-4 h-4" /> },
  { id: "biomarkers", label: "Биомаркеры", icon: <Activity className="w-4 h-4" /> },
  { id: "trends", label: "Тренды", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "recommendations", label: "Рекомендации", icon: <FileText className="w-4 h-4" /> },
  { id: "assistant", label: "AI-ассистент", icon: <MessageSquare className="w-4 h-4" /> },
];

function DashboardContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-primary/20 to-accent/10 rounded-xl p-5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Биологический возраст</div>
            <div className="text-4xl font-bold text-primary">32</div>
            <div className="text-xs text-status-good mt-1">−3 года от паспортного</div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center bg-primary/10">
            <Heart className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">Индекс здоровья</div>
          <div className="text-xl font-bold text-status-good">87%</div>
        </div>
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">AI-рекомендаций</div>
          <div className="text-xl font-bold text-accent">12</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Системы организма</div>
        {[
          { name: "Сердечно-сосудистая", score: 92, color: "bg-status-good" },
          { name: "Метаболизм", score: 78, color: "bg-status-warning" },
          { name: "Иммунная", score: 85, color: "bg-status-good" },
        ].map((system) => (
          <div key={system.name} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">{system.name}</span>
                <span className="text-muted-foreground">{system.score}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${system.color} rounded-full`} style={{ width: `${system.score}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BiomarkersContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">Результаты анализов</div>
      {[
        { name: "Гемоглобин", value: "145", unit: "г/л", status: "normal" },
        { name: "Глюкоза", value: "5.2", unit: "ммоль/л", status: "normal" },
        { name: "Холестерин", value: "6.1", unit: "ммоль/л", status: "warning" },
        { name: "Витамин D", value: "28", unit: "нг/мл", status: "low" },
        { name: "Ферритин", value: "89", unit: "мкг/л", status: "normal" },
      ].map((marker) => (
        <div key={marker.name} className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/30">
          <span className="text-sm text-foreground">{marker.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{marker.value}</span>
            <span className="text-xs text-muted-foreground">{marker.unit}</span>
            <div className={`w-2 h-2 rounded-full ${
              marker.status === "normal" ? "bg-status-good" : 
              marker.status === "warning" ? "bg-status-warning" : "bg-status-danger"
            }`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendsContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-medium text-foreground">Динамика показателей</div>
      <div className="h-28 flex items-end justify-between gap-1 px-2">
        {[65, 72, 68, 75, 82, 78, 85, 87].map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t"
              style={{ height: `${val}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{["Я", "Ф", "М", "А", "М", "И", "И", "А"][i]}</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-status-good">+22%</div>
        <div className="text-xs text-muted-foreground">улучшение за 8 месяцев</div>
      </div>
    </div>
  );
}

function RecommendationsContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">Персональные рекомендации</div>
      {[
        { priority: "high", text: "Увеличить витамин D до 5000 МЕ" },
        { priority: "high", text: "Снизить насыщенные жиры" },
        { priority: "medium", text: "Кардио 30 мин 3 раза в неделю" },
        { priority: "low", text: "Контроль холестерина через 3 мес" },
      ].map((rec, i) => (
        <div key={i} className="flex gap-3 p-2 bg-card/50 rounded-lg border border-border/30">
          <div className={`w-1 rounded-full ${
            rec.priority === "high" ? "bg-status-danger" :
            rec.priority === "medium" ? "bg-status-warning" : "bg-status-good"
          }`} />
          <span className="text-sm text-foreground">{rec.text}</span>
        </div>
      ))}
    </div>
  );
}

function AssistantContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">AI-ассистент</div>
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-primary/20 rounded-lg rounded-br-sm p-2 max-w-[85%]">
            <span className="text-sm">Почему низкий витамин D?</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-card/80 border border-border/50 rounded-lg rounded-bl-sm p-2 max-w-[85%]">
            <span className="text-sm">Основные причины: недостаток солнца в зимние месяцы, низкое потребление продуктов...</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
          Задайте вопрос...
        </div>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardContent />;
      case "biomarkers": return <BiomarkersContent />;
      case "trends": return <TrendsContent />;
      case "recommendations": return <RecommendationsContent />;
      case "assistant": return <AssistantContent />;
    }
  };

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {/* Theme Toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-lg"
          aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>
      )}

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
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Side - Text Content */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Новый подход к здоровью</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="block text-foreground">Ваше здоровье</span>
              <span className="block text-foreground">в</span>
              <span className="block mt-1 bg-gradient-hero bg-clip-text text-transparent">
                цифрах и динамике
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
              50 биомаркеров → биологический возраст → тренды по системам → AI-рекомендации. 
              Медсестра приедет к вам. Результат за 5 дней.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => navigate("/register")} 
                className="text-lg px-8 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
              >
                Начать сейчас
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
              >
                Войти
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">50+</div>
                  <div className="text-sm text-muted-foreground">биомаркеров</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">AI</div>
                  <div className="text-sm text-muted-foreground">персональный анализ</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - App Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {/* Glow effect behind the mockup */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl blur-2xl opacity-50" />
            
            {/* App Mockup */}
            <div className="relative">
              {/* Browser Chrome */}
              <div className="bg-card/90 backdrop-blur-xl rounded-t-2xl border border-border/50 border-b-0 p-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-status-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-status-good/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-muted/50 rounded-lg px-4 py-1.5 text-xs text-muted-foreground text-center">
                    reage.lovable.app
                  </div>
                </div>
              </div>

              {/* App Content */}
              <div className="bg-background/95 backdrop-blur-xl rounded-b-2xl border border-border/50 border-t-0 overflow-hidden shadow-2xl">
                <div className="flex min-h-[380px]">
                  {/* Sidebar */}
                  <div className="w-40 border-r border-border/30 p-2 space-y-1 hidden md:block bg-card/30">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === section.id
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        {section.icon}
                        <span className="truncate">{section.label}</span>
                      </button>
                    ))}
                    
                    {/* User Profile Mini */}
                    <div className="!mt-6 pt-4 border-t border-border/30">
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <span className="text-xs font-bold text-white">АИ</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">Александр</div>
                          <div className="text-[10px] text-muted-foreground">Premium</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Nav */}
                  <div className="md:hidden w-full">
                    <div className="flex overflow-x-auto gap-1 p-2 border-b border-border/30 bg-card/30">
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                            activeSection === section.id
                              ? "bg-primary/20 text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {section.icon}
                          {section.label}
                        </button>
                      ))}
                    </div>
                    <div className="overflow-y-auto max-h-[320px]">
                      {renderContent()}
                    </div>
                  </div>

                  {/* Content Area - Desktop */}
                  <div className="flex-1 overflow-y-auto max-h-[380px] hidden md:block">
                    {renderContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
