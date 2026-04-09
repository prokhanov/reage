import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, TrendingUp, Brain, Heart, FileText, MessageSquare, User, Home, FlaskConical, Lightbulb, Download, X } from "lucide-react";


export type ShowcaseSection = "dashboard" | "analyses" | "reports" | "trends" | "state" | "assistant" | "recommendations";

const sections: { id: ShowcaseSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Моё здоровье", icon: <Home className="w-4 h-4" /> },
  { id: "analyses", label: "Анализы", icon: <FlaskConical className="w-4 h-4" /> },
  { id: "reports", label: "Персональные отчёты", icon: <FileText className="w-4 h-4" /> },
  { id: "trends", label: "Тренды", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "state", label: "Моё состояние", icon: <Heart className="w-4 h-4" /> },
  { id: "assistant", label: "AI-ассистент", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "recommendations", label: "Рекомендации", icon: <Lightbulb className="w-4 h-4" /> },
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

function ReportsContent() {
  const reportSections = [
    "Данные пациента",
    "Общее резюме",
    "Почки и водно-солевой баланс",
    "Сердечно-сосудистая система",
    "Воспалительная и иммунная система",
    "Эндокринная и стрессовая система",
    "Обмен веществ и детоксикация",
    "Энергия и восстановление",
    "Назначения",
  ];

  return (
    <div className="flex h-full min-h-[400px]">
      {/* Report Sidebar */}
      <div className="w-[160px] border-r border-border/30 p-3 space-y-1 overflow-y-auto flex-shrink-0 hidden md:block">
        <div className="text-xs font-semibold text-primary mb-1">Содержание</div>
        <div className="text-[10px] text-muted-foreground mb-2">23 марта 2026</div>
        {reportSections.map((section, i) => (
          <div
            key={section}
            className={`text-[11px] py-1 px-1.5 rounded cursor-default leading-tight ${
              i === 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {section}
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Report Header */}
        <div className="flex items-start justify-between p-4 pb-2">
          <div>
            <h3 className="text-base font-semibold text-primary">Персональный отчёт</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Детальный анализ здоровья • 8 разделов</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-primary cursor-default">
              <Download className="w-3 h-3" />
              <span>Скачать PDF</span>
            </div>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Patient Data Card */}
        <div className="px-4 pb-4">
          <div className="bg-card/60 border border-border/40 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Данные пациента</h4>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-foreground">Персональная информация</h5>
              <div className="space-y-1 text-xs">
                <div><span className="font-semibold text-foreground">Имя:</span> <span className="text-muted-foreground">Алина Дарбинян</span></div>
                <div><span className="font-semibold text-foreground">Возраст:</span> <span className="text-muted-foreground">38 лет</span></div>
                <div><span className="font-semibold text-foreground">Пол:</span> <span className="text-muted-foreground">Женский</span></div>
                <div><span className="font-semibold text-foreground">Рост:</span> <span className="text-muted-foreground">164 см</span></div>
                <div><span className="font-semibold text-foreground">Вес:</span> <span className="text-muted-foreground">51 кг</span></div>
                <div><span className="font-semibold text-foreground">Индекс массы тела (BMI):</span> <span className="text-muted-foreground">19.0 (норма)</span></div>
              </div>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Медицинская история</h5>
              <p className="text-xs text-muted-foreground">Не указана</p>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Основные жалобы и симптомы</h5>
              <p className="text-xs text-muted-foreground">Не указаны</p>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Образ жизни</h5>
              <p className="text-xs text-muted-foreground">Не указан</p>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-foreground">Цели</h5>
              <p className="text-xs text-muted-foreground">Не указаны</p>
            </div>
          </div>
        </div>
      </div>
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
    <div className="p-4 space-y-3 overflow-y-auto max-h-[420px] text-left">
      <div className="text-sm font-medium text-foreground mb-2">Персональные рекомендации</div>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary leading-snug">Витамин D3</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Форма:</span> холекальциферол
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Дозировка:</span> 5000 МЕ
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Как принимать:</span> 1 капсула ежедневно утром с жирной пищей
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Длительность:</span> 3 месяца
        </p>
        <div className="p-3 rounded-md bg-primary/5 border border-primary/10 mt-2">
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-medium">Причина:</span> Витамин D (25-OH D): 44.12 нг/мл (оптимум: 40–70) — Текущий уровень витамина D находится в допустимой зоне, но ближе к нижней границе оптимума. Для поддержания иммунитета, борьбы с усталостью и улучшения общего состояния необходима превентивная поддержка.
          </p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          <span className="font-medium text-foreground">На что это влияет:</span> Витамин D3 играет ключевую роль в регуляции иммунной системы, поддерживает здоровье костей, участвует в энергетическом метаболизме и снижает хроническую усталость. Поддержание оптимального уровня витамина D способствует укреплению иммунитета и улучшению настроения. Холекальциферол в масляной форме обеспечивает максимальное усвоение, поскольку является жирорастворимым витамином. Первые улучшения в самочувствии могут быть заметны через 1-2 месяца.
        </p>
      </div>
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
      case "reports": return <ReportsContent />;
      case "trends": return <TrendsContent />;
      case "state": return <StateContent />;
      case "recommendations": return <RecommendationsContent />;
      case "assistant": return <AssistantContent />;
      
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
              reage.life/{activeSection === "dashboard" ? "" : activeSection}
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
                  onClick={() => handleManualSelect(section.id)}
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
                    onClick={() => handleManualSelect(section.id)}
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
