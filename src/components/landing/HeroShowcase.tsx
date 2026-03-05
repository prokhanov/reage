import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, TrendingUp, Brain, Heart, FileText, MessageSquare, User, Home, FlaskConical, Lightbulb } from "lucide-react";

export type ShowcaseSection = "dashboard" | "analyses" | "biomarkers" | "trends" | "state" | "assistant" | "recommendations" | "prescriptions";

const sections: { id: ShowcaseSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Моё здоровье", icon: <Home className="w-4 h-4" /> },
  { id: "analyses", label: "Анализы", icon: <FlaskConical className="w-4 h-4" /> },
  { id: "biomarkers", label: "Биомаркеры", icon: <Activity className="w-4 h-4" /> },
  { id: "trends", label: "Тренды", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "state", label: "Моё состояние", icon: <Heart className="w-4 h-4" /> },
  { id: "assistant", label: "AI-ассистент", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "recommendations", label: "Рекомендации", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "prescriptions", label: "Назначения", icon: <FileText className="w-4 h-4" /> },
];

interface HeroShowcaseProps {
  onSectionChange?: (section: ShowcaseSection) => void;
}

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

function AnalysesContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">История анализов</div>
      {[
        { date: "15 фев 2026", markers: 52, status: "Обработан", statusColor: "bg-status-good" },
        { date: "10 ноя 2025", markers: 48, status: "Обработан", statusColor: "bg-status-good" },
        { date: "05 авг 2025", markers: 45, status: "Обработан", statusColor: "bg-status-good" },
      ].map((analysis) => (
        <div key={analysis.date} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/30">
          <div>
            <div className="text-sm font-medium text-foreground">{analysis.date}</div>
            <div className="text-xs text-muted-foreground">{analysis.markers} маркеров</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${analysis.statusColor}`} />
            <span className="text-xs text-muted-foreground">{analysis.status}</span>
          </div>
        </div>
      ))}
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

function StateContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">Дневник симптомов</div>
      {[
        { category: "🧠 Нервная система", symptoms: ["Головная боль", "Усталость"], severity: 2 },
        { category: "❤️ Сердце", symptoms: ["Норма"], severity: 0 },
        { category: "🦴 Опорно-двигательная", symptoms: ["Боль в спине"], severity: 1 },
      ].map((cat) => (
        <div key={cat.category} className="p-2 bg-card/50 rounded-lg border border-border/30">
          <div className="text-sm font-medium text-foreground mb-1">{cat.category}</div>
          <div className="flex flex-wrap gap-1">
            {cat.symptoms.map((s) => (
              <span key={s} className="text-xs bg-muted/50 rounded px-2 py-0.5 text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      ))}
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

function PrescriptionsContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">Назначения врача</div>
      {[
        { name: "Витамин D3", dose: "5000 МЕ/день", control: "15 мая 2026", status: "confirmed" },
        { name: "Омега-3", dose: "2000 мг/день", control: "15 мая 2026", status: "confirmed" },
        { name: "Магний B6", dose: "400 мг/день", control: "10 апр 2026", status: "on_review" },
      ].map((rx) => (
        <div key={rx.name} className="p-2 bg-card/50 rounded-lg border border-border/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-foreground">{rx.name}</span>
            <div className={`w-2 h-2 rounded-full ${rx.status === "confirmed" ? "bg-status-good" : "bg-status-warning"}`} />
          </div>
          <div className="text-xs text-muted-foreground">{rx.dose} • контроль {rx.control}</div>
        </div>
      ))}
    </div>
  );
}

const SECTION_IDS = sections.map(s => s.id);
const AUTO_INTERVAL = 4000;

export function HeroShowcase({ onSectionChange }: HeroShowcaseProps) {
  const [activeSection, setActiveSection] = useState<ShowcaseSection>("dashboard");
  const [autoPlay, setAutoPlay] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate sections
  useEffect(() => {
    if (!autoPlay) return;
    intervalRef.current = setInterval(() => {
      setActiveSection(prev => {
        const idx = SECTION_IDS.indexOf(prev);
        return SECTION_IDS[(idx + 1) % SECTION_IDS.length];
      });
    }, AUTO_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoPlay]);

  useEffect(() => {
    onSectionChange?.(activeSection);
  }, [activeSection, onSectionChange]);

  const handleManualSelect = useCallback((id: ShowcaseSection) => {
    setAutoPlay(false);
    setActiveSection(id);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardContent />;
      case "analyses": return <AnalysesContent />;
      case "biomarkers": return <BiomarkersContent />;
      case "trends": return <TrendsContent />;
      case "state": return <StateContent />;
      case "recommendations": return <RecommendationsContent />;
      case "assistant": return <AssistantContent />;
      case "prescriptions": return <PrescriptionsContent />;
    }
  };

  return (
    <div className="relative mt-16 md:mt-24 animate-fade-in" style={{ animationDelay: '0.5s' }}>
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
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 border-t-0 overflow-hidden shadow-2xl">
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
