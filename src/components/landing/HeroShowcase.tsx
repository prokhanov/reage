import { useState } from "react";
import { Activity, TrendingUp, Brain, Heart, FileText, MessageSquare, User, Home } from "lucide-react";

type Section = "dashboard" | "biomarkers" | "trends" | "recommendations" | "assistant" | "profile";

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Моё здоровье", icon: <Home className="w-4 h-4" /> },
  { id: "biomarkers", label: "Биомаркеры", icon: <Activity className="w-4 h-4" /> },
  { id: "trends", label: "Тренды", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "recommendations", label: "Рекомендации", icon: <FileText className="w-4 h-4" /> },
  { id: "assistant", label: "AI-ассистент", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "profile", label: "Профиль", icon: <User className="w-4 h-4" /> },
];


function DashboardContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-primary/20 to-accent/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Биологический возраст</div>
            <div className="text-4xl font-bold text-primary">32</div>
            <div className="text-xs text-status-good mt-1">−3 года от паспортного</div>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 flex items-center justify-center bg-primary/10">
            <Heart className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">Индекс здоровья</div>
          <div className="text-2xl font-bold text-status-good">87%</div>
        </div>
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">Биомаркеров</div>
          <div className="text-2xl font-bold text-foreground">52</div>
        </div>
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">Рекомендаций</div>
          <div className="text-2xl font-bold text-accent">12</div>
        </div>
        <div className="bg-card/80 rounded-lg p-3 border border-border/50">
          <div className="text-xs text-muted-foreground">След. анализ</div>
          <div className="text-lg font-bold text-foreground">15 мар</div>
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
      <div className="h-32 flex items-end justify-between gap-1 px-2">
        {[65, 72, 68, 75, 82, 78, 85, 87].map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t"
              style={{ height: `${val}%` }}
            />
            <span className="text-[10px] text-muted-foreground">{["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг"][i]}</span>
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
        { priority: "high", text: "Увеличить приём витамина D до 5000 МЕ/день" },
        { priority: "high", text: "Снизить потребление насыщенных жиров" },
        { priority: "medium", text: "Добавить 30 мин кардио 3 раза в неделю" },
        { priority: "low", text: "Контроль холестерина через 3 месяца" },
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
      <div className="text-sm font-medium text-foreground">AI-ассистент здоровья</div>
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-primary/20 rounded-lg rounded-br-sm p-2 max-w-[80%]">
            <span className="text-sm">Почему у меня низкий витамин D?</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-card/80 border border-border/50 rounded-lg rounded-bl-sm p-2 max-w-[80%]">
            <span className="text-sm">Основные причины дефицита витамина D: недостаток солнечного света, особенно в зимние месяцы, низкое потребление продуктов с витамином D...</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
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

function ProfileContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-xl font-bold text-white">АИ</span>
        </div>
        <div>
          <div className="font-medium text-foreground">Александр Иванов</div>
          <div className="text-sm text-muted-foreground">35 лет • Москва</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/50 rounded-lg p-3 border border-border/30">
          <div className="text-xs text-muted-foreground">Рост</div>
          <div className="text-lg font-medium">178 см</div>
        </div>
        <div className="bg-card/50 rounded-lg p-3 border border-border/30">
          <div className="text-xs text-muted-foreground">Вес</div>
          <div className="text-lg font-medium">75 кг</div>
        </div>
      </div>
      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
        <div className="text-xs text-muted-foreground mb-1">Подписка</div>
        <div className="text-sm font-medium text-primary">Premium • до 15 дек 2026</div>
      </div>
    </div>
  );
}


export function HeroShowcase() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardContent />;
      case "biomarkers": return <BiomarkersContent />;
      case "trends": return <TrendsContent />;
      case "recommendations": return <RecommendationsContent />;
      case "assistant": return <AssistantContent />;
      case "profile": return <ProfileContent />;
    }
  };

  return (
    <div className="relative mt-16 md:mt-24 animate-fade-in" style={{ animationDelay: '0.5s' }}>
      {/* Main Mockup */}
      <div className="relative max-w-4xl mx-auto px-4">
        {/* Browser Chrome */}
        <div className="bg-card/90 backdrop-blur-xl rounded-t-2xl border border-border/50 border-b-0 p-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-status-warning/60" />
            <div className="w-3 h-3 rounded-full bg-status-good/60" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-muted/50 rounded-lg px-4 py-1.5 text-xs text-muted-foreground text-center">
              reage.lovable.app/{activeSection === "dashboard" ? "" : activeSection}
            </div>
          </div>
        </div>

        {/* App Content */}
        <div className="bg-background/95 backdrop-blur-xl rounded-b-2xl border border-border/50 border-t-0 overflow-hidden shadow-2xl">
          <div className="flex min-h-[400px] md:min-h-[450px]">
            {/* Sidebar */}
            <div className="w-48 border-r border-border/30 p-3 space-y-1 hidden sm:block bg-card/30">
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
                  {section.label}
                </button>
              ))}
            </div>

            {/* Mobile Nav */}
            <div className="sm:hidden w-full">
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
              <div className="overflow-y-auto max-h-[350px]">
                {renderContent()}
              </div>
            </div>

            {/* Content Area - Desktop */}
            <div className="flex-1 overflow-y-auto max-h-[450px] hidden sm:block">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
