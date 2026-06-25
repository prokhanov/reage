import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRegisterGuard } from "@/components/RegisterGuard";
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  TrendingUp,
  TrendingDown,
  Heart,
  MessageSquare,
  Lightbulb,
  FileText,
  Sparkles,
  Clock,
  BarChart3,
  HeartPulse,
  ShieldCheck,
  Droplets,
  Pill,
  Apple,
  Moon,
  Sun,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Send,
  Bot,
  User,
} from "lucide-react";

type SectionKey =
  | "dashboard"
  | "analyses"
  | "reports"
  | "state"
  | "assistant"
  | "recommendations";

const glass =
  "rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]";

const appFeatures: Record<
  SectionKey,
  {
    icon: typeof LayoutDashboard;
    title: string;
    subtitle: string;
    description: string;
    badges: string[];
    features: { icon: typeof LayoutDashboard; text: string }[];
    color: string;
  }
> = {
  dashboard: {
    icon: LayoutDashboard,
    title: "Моё здоровье",
    subtitle: "Контрольная панель",
    description:
      "Все ключевые метрики на одном экране — биологический возраст, индекс здоровья, тренды по 5 системам организма",
    badges: ["Индекс здоровья", "ИМТ"],
    features: [
      { icon: HeartPulse, text: "Биологический возраст" },
      { icon: TrendingUp, text: "Тренды по 5 системам" },
      { icon: BarChart3, text: "История изменений" },
    ],
    color: "from-blue-500 to-indigo-500",
  },
  analyses: {
    icon: FlaskConical,
    title: "Анализы",
    subtitle: "История исследований",
    description:
      "Все ваши анализы в одном разделе с удобной навигацией и динамикой показателей",
    badges: ["Карточки анализов", "Статусы", "Тренды"],
    features: [
      { icon: FileText, text: "Ваши показатели" },
      { icon: Clock, text: "Оптимальные диапазоны" },
      { icon: Activity, text: "Оцифровка результатов" },
    ],
    color: "from-emerald-500 to-teal-500",
  },
  reports: {
    icon: FileText,
    title: "Персональные отчёты",
    subtitle: "Детальный анализ",
    description:
      "Полный отчёт по каждому показателю с разбором по системам организма",
    badges: ["Биомаркеры", "Факторы риска", "PDF"],
    features: [
      { icon: FileText, text: "Разбор по системам" },
      { icon: Activity, text: "Расшифровка анализов" },
      { icon: Lightbulb, text: "Конкретные рекомендации" },
    ],
    color: "from-amber-500 to-orange-500",
  },
  state: {
    icon: Heart,
    title: "Моё состояние",
    subtitle: "Дневник симптомов",
    description:
      "Отслеживайте симптомы по 11 категориям для более точного анализа",
    badges: ["11 категорий", "История"],
    features: [
      { icon: FileText, text: "Опрос по категориям" },
      { icon: Clock, text: "История изменений" },
      { icon: TrendingUp, text: "Связь с анализами" },
    ],
    color: "from-rose-500 to-pink-500",
  },
  assistant: {
    icon: MessageSquare,
    title: "AI Ассистент",
    subtitle: "Персональный помощник 24/7",
    description:
      "Задавайте вопросы о здоровье — AI учитывает все ваши данные и анализы",
    badges: ["24/7", "AI"],
    features: [
      { icon: Sparkles, text: "Учитывает ваши данные" },
      { icon: MessageSquare, text: "Мгновенные ответы" },
      { icon: Lightbulb, text: "Персональные советы" },
    ],
    color: "from-cyan-500 to-blue-500",
  },
  recommendations: {
    icon: Lightbulb,
    title: "Рекомендации",
    subtitle: "Простое руководство к действию",
    description:
      "Персональный план по приему витаминов и минералов, питанию и образу жизни",
    badges: ["Питание", "Добавки", "Образ жизни"],
    features: [
      { icon: Sparkles, text: "Формы витаминов" },
      { icon: FileText, text: "Длительность приема" },
      { icon: Activity, text: "Дозировки" },
    ],
    color: "from-yellow-500 to-amber-500",
  },
};

const order: SectionKey[] = [
  "dashboard",
  "analyses",
  "reports",
  "state",
  "assistant",
  "recommendations",
];

/* =================== WIDGETS =================== */

function DashboardWidgets() {
  const systems = [
    { label: "Сердце", value: 92, icon: Heart, token: "--status-optimal" },
    { label: "Метаболизм", value: 78, icon: Activity, token: "--status-acceptable" },
    { label: "Иммунитет", value: 84, icon: ShieldCheck, token: "--status-optimal" },
    { label: "Печень и почки", value: 71, icon: Droplets, token: "--status-acceptable" },
    { label: "Гормоны", value: 58, icon: FlaskConical, token: "--status-risk" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Bio age */}
      <div className={`${glass} p-4 col-span-2 sm:col-span-1`}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Биологический возраст
        </div>
        <div className="flex items-end gap-2">
          <div className="text-4xl font-bold tabular-nums">34.5</div>
          <div className="text-sm text-muted-foreground mb-1">из 38 хроно</div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-status-optimal font-medium">
          <TrendingDown className="w-3.5 h-3.5" /> −1.2 за 6 мес
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: "78%" }} />
        </div>
      </div>

      {/* Health index */}
      <div className={`${glass} p-4 col-span-2 sm:col-span-1`}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Индекс здоровья
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${82 * 0.94} 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-base font-bold">82</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground/80">Лучше, чем у 87% людей вашего возраста</div>
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-status-optimal font-medium">
              <TrendingUp className="w-3 h-3" /> +4 пункта
            </div>
          </div>
        </div>
      </div>

      {/* Systems */}
      <div className={`${glass} p-4 col-span-2`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            5 систем организма
          </span>
          <span className="text-[11px] text-primary font-semibold">общий 77%</span>
        </div>
        <div className="space-y-2">
          {systems.map((s) => {
            const Icon = s.icon;
            const color = `hsl(var(${s.token}))`;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                <span className="text-xs text-foreground/90 flex-1 truncate">{s.label}</span>
                <span className="text-[11px] font-semibold tabular-nums w-9 text-right">{s.value}%</span>
                <div className="w-24 sm:w-32 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnalysesWidgets() {
  const biomarkers = [
    { name: "Глюкоза", value: "4.72", unit: "ммоль/л", status: "optimal", pos: 35 },
    { name: "HOMA-IR", value: "2.18", unit: "", status: "acceptable", pos: 62 },
    { name: "Тестостерон", value: "12.4", unit: "нмоль/л", status: "risk", pos: 20 },
    { name: "Витамин D", value: "28", unit: "нг/мл", status: "acceptable", pos: 45 },
    { name: "Гомоцистеин", value: "11.2", unit: "мкмоль/л", status: "risk", pos: 75 },
  ];
  const tokenMap: Record<string, string> = {
    optimal: "--status-optimal",
    acceptable: "--status-acceptable",
    risk: "--status-risk",
  };
  return (
    <div className="space-y-3">
      <div className={`${glass} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Последний анализ • 15 марта 2026
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">112 показателей</span>
        </div>
        <div className="space-y-2.5">
          {biomarkers.map((b) => {
            const color = `hsl(var(${tokenMap[b.status]}))`;
            return (
              <div key={b.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium flex-1 truncate">{b.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                  {b.value} <span className="opacity-70">{b.unit}</span>
                </span>
                <div className="relative w-24 sm:w-32 h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-status-risk/40 via-status-optimal/40 to-status-risk/40">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2.5 rounded-sm border border-background"
                    style={{ left: `calc(${b.pos}% - 4px)`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { date: "март 2026", count: 112 },
          { date: "ноябрь 2025", count: 98 },
          { date: "июнь 2025", count: 84 },
        ].map((a) => (
          <div key={a.date} className={`${glass} p-2.5 text-center`}>
            <div className="text-[10px] text-muted-foreground">{a.date}</div>
            <div className="text-sm font-bold mt-0.5">{a.count}</div>
            <div className="text-[10px] text-muted-foreground">показателей</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsWidgets() {
  const sections = [
    { title: "Метаболизм и энергия", n: "01", status: "Требует внимания", risk: true },
    { title: "Сердечно-сосудистая", n: "02", status: "Оптимально", risk: false },
    { title: "Иммунитет и воспаление", n: "03", status: "Норма", risk: false },
    { title: "Эндокринная система", n: "04", status: "Зона риска", risk: true },
  ];
  return (
    <div className="space-y-3">
      <div className={`${glass} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Отчёт от 15.03.2026
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">PDF</span>
        </div>
        <div className="text-sm text-foreground/85 leading-relaxed">
          <span className="font-semibold">Резюме врача:</span> в целом картина благоприятная. Основной фокус —
          инсулинорезистентность и дефицит витамина D. Уровень гомоцистеина указывает на нагрузку
          сердечно-сосудистой системы.
        </div>
      </div>

      <div className={`${glass} p-3`}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
          Разделы отчёта
        </div>
        <div className="space-y-1.5">
          {sections.map((s) => (
            <div key={s.n} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition">
              <span className="text-[10px] font-mono text-muted-foreground w-5">{s.n}</span>
              <span className="text-xs font-medium flex-1 truncate">{s.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                s.risk
                  ? "bg-status-risk/15 text-status-risk"
                  : "bg-status-optimal/15 text-status-optimal"
              }`}>
                {s.status}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StateWidgets() {
  const categories = [
    { icon: Brain, label: "Энергия и сон", value: "Хорошо", color: "text-status-optimal" },
    { icon: Activity, label: "Физическая активность", value: "3 раза/нед", color: "text-status-optimal" },
    { icon: Moon, label: "Качество сна", value: "Прерывистый", color: "text-status-acceptable" },
    { icon: Heart, label: "Настроение и стресс", value: "Тревожность", color: "text-status-risk" },
    { icon: Apple, label: "Питание", value: "Нерегулярное", color: "text-status-acceptable" },
  ];
  return (
    <div className="space-y-3">
      <div className={`${glass} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Дневник • эта неделя
          </div>
          <span className="text-[11px] text-primary font-semibold">5 из 11 заполнено</span>
        </div>
        <div className="space-y-2">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-center gap-3 py-1">
                <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                </div>
                <span className="text-xs font-medium flex-1 truncate">{c.label}</span>
                <span className={`text-[11px] font-medium ${c.color}`}>{c.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${glass} p-3 flex items-center gap-3`}>
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <div className="text-xs text-foreground/85">
          <span className="font-semibold">Связь с анализами:</span> прерывистый сон коррелирует с
          повышенным кортизолом
        </div>
      </div>
    </div>
  );
}

function AssistantWidgets() {
  const messages = [
    { from: "user", text: "Почему у меня низкий витамин D, если я живу на юге?" },
    {
      from: "bot",
      text:
        "По вашему анализу от 15.03.2026: 25(OH)D = 28 нг/мл — дефицит. Даже на юге без добавок поддерживать норму сложно: солнце эффективно только летом в 11–15 ч, а смуглая кожа и SPF снижают синтез. Рекомендую D3 5000 МЕ ежедневно с жирной пищей.",
    },
    { from: "user", text: "А как это связано с моим тестостероном?" },
  ];
  return (
    <div className="space-y-3">
      <div className={`${glass} p-4`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold">ReAge Ассистент</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-optimal" /> онлайн
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              {m.from === "bot" && (
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] text-xs leading-relaxed px-3 py-2 rounded-2xl ${
                  m.from === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted/60 text-foreground rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
              {m.from === "user" && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-muted/60 px-3 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground flex-1">Спросите о своих показателях…</span>
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Send className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationsWidgets() {
  const supplements = [
    { name: "Витамин D3", dose: "5000 МЕ", time: "утром с едой", color: "bg-amber-500" },
    { name: "Магний глицинат", dose: "400 мг", time: "вечером", color: "bg-emerald-500" },
    { name: "Омега-3", dose: "2 г EPA+DHA", time: "с обедом", color: "bg-blue-500" },
    { name: "Метилфолат B9", dose: "400 мкг", time: "утром", color: "bg-rose-500" },
  ];
  return (
    <div className="space-y-3">
      <div className={`${glass} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            План добавок • 3 месяца
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            <Pill className="w-3 h-3 inline mr-1" />4 препарата
          </span>
        </div>
        <div className="space-y-2">
          {supplements.map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className={`w-2 h-8 rounded-full ${s.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">{s.time}</div>
              </div>
              <div className="text-xs font-semibold tabular-nums">{s.dose}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`${glass} p-3 flex items-start gap-2`}>
          <Apple className="w-4 h-4 text-status-optimal shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold">Питание</div>
            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              +жирная рыба 2× в нед, листовая зелень ежедневно
            </div>
          </div>
        </div>
        <div className={`${glass} p-3 flex items-start gap-2`}>
          <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold">Образ жизни</div>
            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Силовые 2× в нед, сон 23:00, шаги 8000+
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const widgetMap: Record<SectionKey, () => JSX.Element> = {
  dashboard: DashboardWidgets,
  analyses: AnalysesWidgets,
  reports: ReportsWidgets,
  state: StateWidgets,
  assistant: AssistantWidgets,
  recommendations: RecommendationsWidgets,
};

export function AppFeaturesSection() {
  const { requestRegister } = useRegisterGuard();
  const [active, setActive] = useState<SectionKey>("dashboard");
  const feature = appFeatures[active];
  const Icon = feature.icon;
  const Widgets = widgetMap[active];

  return (
    <section className="relative py-14 md:py-20 overflow-hidden bg-muted/30">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Полный контроль в вашем </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              личном кабинете
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto whitespace-pre-line">
            6 разделов для управления вашим здоровьем — от расшифровки анализов до
            {"\n"}AI-ассистента
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-10 max-w-6xl mx-auto">
          {/* LEFT: vertical menu */}
          <div className="space-y-2">
            {order.map((key) => {
              const f = appFeatures[key];
              const FIcon = f.icon;
              const isActive = key === active;
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`w-full text-left rounded-2xl border transition-all p-4 flex items-start gap-3 group ${
                    isActive
                      ? "bg-card/80 border-primary/50 shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]"
                      : "bg-card/40 border-border/40 hover:bg-card/60 hover:border-border/80"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md shrink-0 transition-transform ${
                      isActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                  >
                    <FIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground leading-tight truncate">
                        {f.title}
                      </h3>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-all ${
                          isActive
                            ? "text-primary translate-x-0.5"
                            : "text-muted-foreground/50"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT: floating widgets + description */}
          <div className="relative min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      {feature.subtitle}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                      {feature.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                  {feature.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {feature.badges.map((b) => (
                    <Badge key={b} variant="secondary" className="text-xs px-2.5 py-0.5">
                      {b}
                    </Badge>
                  ))}
                </div>

                {/* Floating widgets */}
                <div className="relative">
                  <Widgets />
                </div>

                {/* Feature highlights */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {feature.features.map((f, i) => {
                    const FIcon = f.icon;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <FIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground/90">{f.text}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-10 text-center animate-fade-in">
          <Button size="lg" className="rounded-full px-8" onClick={requestRegister}>
            Попробовать демо бесплатно
          </Button>
        </div>
      </div>
    </section>
  );
}
