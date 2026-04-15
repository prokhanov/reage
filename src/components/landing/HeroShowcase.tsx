import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, TrendingUp, Brain, Heart, FileText, MessageSquare, User, Home, FlaskConical, Lightbulb, Download, X } from "lucide-react";


export type ShowcaseSection = "dashboard" | "analyses" | "reports" | "recommendations" | "state" | "assistant";

const sections: { id: ShowcaseSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Моё здоровье", icon: <Home className="w-4 h-4" /> },
  { id: "analyses", label: "Анализы", icon: <FlaskConical className="w-4 h-4" /> },
  { id: "reports", label: "Отчёты", icon: <FileText className="w-4 h-4" /> },
  { id: "recommendations", label: "Рекомендации", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "state", label: "Моё состояние", icon: <Heart className="w-4 h-4" /> },
  { id: "assistant", label: "AI-ассистент", icon: <MessageSquare className="w-4 h-4" /> },
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

function RangeBar({ segments, markerPos }: { segments: { color: string; flex: number }[]; markerPos: number }) {
  return (
    <div className="relative h-2 rounded-full overflow-hidden flex">
      {segments.map((s, i) => (
        <div key={i} className={`h-full ${s.color}`} style={{ flex: s.flex }} />
      ))}
      <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-foreground border-2 border-background shadow" style={{ left: `${markerPos}%` }} />
    </div>
  );
}

const biomarkers = [
  { name: "Витамин A (ретинол)", code: "VitA", value: "0.35", unit: "мг/л", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "0.3-0.7 мг/л", markerPos: 28 },
  { name: "Малоновый диальдегид", code: "MDA", value: "2.86", unit: "мкмоль/л", status: "Риск", statusColor: "bg-status-risk", textColor: "text-status-risk", range: "0-2.5 мкмоль/л", markerPos: 72 },
  { name: "Селен", code: "Se", value: "87.07", unit: "мкг/л", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "70-150 мкг/л", markerPos: 30 },
  { name: "Глюкоза", code: "GLU", value: "4.76", unit: "ммоль/л", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "3.5-5 ммоль/л", markerPos: 45 },
  { name: "Витамин B12", code: "B12", value: "1338.7", unit: "пг/мл", status: "Критично", statusColor: "bg-status-critical", textColor: "text-status-critical", range: "200-900 пг/мл", markerPos: 88 },
  { name: "Индекс Каро", code: "Caro", value: "0.35", unit: "индекс", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "> 0.33 индекс", markerPos: 38 },
  { name: "Инсулин", code: "INS", value: "8.85", unit: "мкМЕ/мл", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "2.5-12 мкМЕ/мл", markerPos: 48 },
  { name: "Фолиевая кислота", code: "B9", value: "3.16", unit: "нг/мл", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "3-17 нг/мл", markerPos: 22 },
  { name: "Альбумин", code: "ALB", value: "36.24", unit: "г/л", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "35-52 г/л", markerPos: 25 },
  { name: "Коэнзим Q10", code: "CoQ10", value: "0.63", unit: "мкг/мл", status: "Допустимо", statusColor: "bg-status-warning", textColor: "text-status-warning", range: "0.5-2.5 мкг/мл", markerPos: 24 },
  { name: "Индекс инсулинорезистентности", code: "HOMA-IR", value: "0.08", unit: "индекс", status: "Оптимально", statusColor: "bg-status-good", textColor: "text-status-good", range: "0-2.7 индекс", markerPos: 15 },
];

function getSegments(status: string) {
  if (status === "Критично") return [
    { color: "bg-status-critical", flex: 1 }, { color: "bg-status-risk", flex: 1 }, { color: "bg-status-warning", flex: 1 }, { color: "bg-status-good", flex: 2 }, { color: "bg-status-warning", flex: 1 }, { color: "bg-status-risk", flex: 1 }, { color: "bg-status-critical", flex: 1 },
  ];
  return [
    { color: "bg-status-critical", flex: 1 }, { color: "bg-status-risk", flex: 1 }, { color: "bg-status-warning", flex: 1 }, { color: "bg-status-good", flex: 2 }, { color: "bg-status-warning", flex: 1 }, { color: "bg-status-risk", flex: 1 }, { color: "bg-status-critical", flex: 1 },
  ];
}

function AnalysesContent() {
  return (
    <div className="p-4 space-y-0 text-left">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Энергия и восстановление</span>
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">19</span>
      </div>
      {/* Table header */}
      <div className="grid grid-cols-[minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(60px,0.6fr)_minmax(80px,1fr)] gap-x-4 px-3 py-2 text-[10px] text-primary font-semibold border-b border-border/50 uppercase tracking-wide">
        <span>Название</span>
        <span>Значение</span>
        <span>Статус</span>
        <span>Шкала</span>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/30">
        {biomarkers.map((b) => (
          <div key={b.code} className="grid grid-cols-[minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(60px,0.6fr)_minmax(80px,1fr)] gap-x-4 items-center px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-foreground leading-tight truncate">{b.name}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{b.code}</div>
            </div>
            <div className="text-[12px] font-bold text-foreground whitespace-nowrap">
              {b.value} <span className="font-normal text-muted-foreground text-[10px]">{b.unit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${b.statusColor} shrink-0`} />
              <span className={`text-[10px] font-medium ${b.textColor} whitespace-nowrap`}>{b.status}</span>
            </div>
            <div className="space-y-0.5">
              <RangeBar segments={getSegments(b.status)} markerPos={b.markerPos} />
              <div className="text-[8px] text-muted-foreground">{b.range}</div>
            </div>
          </div>
        ))}
      </div>
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
      <div className="w-[160px] border-r border-border/30 p-3 space-y-1 overflow-y-auto flex-shrink-0 hidden md:block text-left">
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
      <div className="flex-1 overflow-y-auto text-left">
        {/* Report Header */}
        <div className="p-4 pb-2">
          <h3 className="text-base font-semibold text-primary">Персональный отчёт</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Детальный анализ здоровья • 8 разделов</p>
        </div>

        {/* Patient Data Card */}
        <div className="px-4 pb-4">
          <div className="bg-card/60 border border-border/40 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Данные пациента</h4>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-foreground">Персональная информация</h5>
              <div className="space-y-1 text-xs">
                <div><span className="font-semibold text-foreground">Имя:</span> <span className="text-muted-foreground">Елена</span></div>
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


function StateContent() {
  const severityOptions = ["Нет", "Легко", "Средне", "Сильно"];
  const symptoms = [
    { name: "Тревожность", selected: 1 },
    { name: "Раздражительность", selected: 1 },
    { name: "Депрессия", selected: 0 },
    { name: "Стресс", selected: 3 },
  ];

  return (
    <div className="p-4 space-y-3 text-left">
      {/* Tabs */}
      <div className="flex gap-0 rounded-full overflow-hidden border border-border/40 w-fit mx-auto">
        <div className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">Опросник</div>
        <div className="px-4 py-1.5 text-xs text-muted-foreground">История</div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Шаг 4 из 6</span>
        <span>67%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: "67%" }} />
      </div>

      {/* Category Header */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-lg">😊</span>
        <div>
          <div className="text-sm font-semibold text-foreground">Настроение</div>
          <div className="text-[11px] text-muted-foreground">Отметьте все симптомы, которые вы испытываете</div>
        </div>
      </div>

      {/* Symptom Rows */}
      <div className="space-y-2.5">
        {symptoms.map((symptom) => (
          <div key={symptom.name} className="border border-border/40 rounded-lg p-2.5">
            <div className="text-xs font-medium text-foreground mb-2">{symptom.name}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {severityOptions.map((option, i) => (
                <div
                  key={option}
                  className={`text-center py-1.5 rounded-md text-[11px] border ${
                    i === symptom.selected
                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                      : "border-border/30 text-muted-foreground"
                  }`}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground">
          <span>‹</span> Назад
        </div>
        <div className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
          Далее <span>›</span>
        </div>
      </div>
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
  const [activeSection, setActiveSection] = useState<ShowcaseSection>("analyses");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onSectionChange?.(activeSection);
  }, [activeSection, onSectionChange]);

  const handleManualSelect = useCallback((id: ShowcaseSection) => {
    setActiveSection(id);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardContent />;
      case "analyses": return <AnalysesContent />;
      case "reports": return <ReportsContent />;
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
