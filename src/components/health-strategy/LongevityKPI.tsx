import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Activity, Heart, TrendingUp, Info } from "lucide-react";

interface Props {
  bioAge: number | null;
  chronoAge: number | null;
  healthIndex: number | null;
  cohortPercentile: number | null;
  cohortLabel: string | null;
}

export function LongevityKPI({ bioAge, chronoAge, healthIndex, cohortPercentile, cohortLabel }: Props) {
  const [open, setOpen] = useState(false);
  const delta = bioAge != null && chronoAge != null ? +(chronoAge - bioAge).toFixed(1) : null;

  const indexTier = (() => {
    if (healthIndex == null) return null;
    if (healthIndex >= 85) return { label: "Отлично", cls: "text-status-good bg-status-good/15" };
    if (healthIndex >= 70) return { label: "Хорошо", cls: "text-status-moderate bg-status-moderate/15" };
    if (healthIndex >= 50) return { label: "Умеренно", cls: "text-status-warning bg-status-warning/15" };
    return { label: "Внимание", cls: "text-status-danger bg-status-danger/15" };
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Биологический возраст */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Card className="cursor-pointer group bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60 hover:scale-[1.02] transition-transform">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm dark:text-white/60 text-slate-500 font-medium">Биологический возраст</span>
                <Activity className="h-4 w-4 dark:text-violet-300 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold dark:text-white text-indigo-900">{bioAge != null ? bioAge.toFixed(1) : "—"}</span>
                <span className="text-sm dark:text-white/50 text-slate-500">лет</span>
              </div>
              {delta != null && (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  delta > 0 ? "bg-status-good/15 text-status-good" : delta < 0 ? "bg-status-danger/15 text-status-danger" : "bg-muted text-muted-foreground"
                }`}>
                  {delta > 0 ? `−${delta} к паспортному` : delta < 0 ? `+${Math.abs(delta)} к паспортному` : "= паспортному"}
                </div>
              )}
              <p className="text-[11px] dark:text-white/40 text-slate-500 inline-flex items-center gap-1">
                <Info className="h-3 w-3" /> Как мы считали
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Как мы считали биологический возраст</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-3 text-foreground/80 leading-relaxed">
            <p><strong>Гибридная формула.</strong> Базовая модель оценивает возраст по 30+ маркерам: HbA1c, креатинин, альбумин, лимфоциты, СРБ, ферритин, витамин D и др. — каждый с собственным «весом старения».</p>
            <p><strong>AI-поправка (Gemini).</strong> На втором шаге AI учитывает контекст: пол, возраст, сочетания отклонений, тяжесть рисков и приверженность назначениям. Корректировка ограничена ±3 года от базы.</p>
            <p><strong>Накопительный режим.</strong> При появлении нового анализа в течение 4 месяцев маркеры суммируются — это даёт более полную картину.</p>
            <p className="text-xs text-muted-foreground">Точность ±2 года при наличии 30+ биомаркеров.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Индекс здоровья */}
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white/60 text-slate-500 font-medium">Индекс здоровья</span>
            <Heart className="h-4 w-4 dark:text-fuchsia-300 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold dark:text-white text-indigo-900">{healthIndex ?? "—"}</span>
            <span className="text-sm dark:text-white/50 text-slate-500">/100</span>
          </div>
          {indexTier && (
            <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${indexTier.cls}`}>
              {indexTier.label}
            </div>
          )}
          <p className="text-[11px] dark:text-white/40 text-slate-500">Доля маркеров в зоне «оптимум»</p>
        </CardContent>
      </Card>

      {/* Перцентиль когорты */}
      <Card className="bg-card/40 backdrop-blur-xl dark:border-white/10 border-slate-200/60 dark:shadow-none shadow-xl shadow-slate-200/60">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white/60 text-slate-500 font-medium">Перцентиль когорты</span>
            <TrendingUp className="h-4 w-4 dark:text-blue-300 text-blue-600" />
          </div>
          {cohortPercentile != null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold dark:text-white text-indigo-900">{cohortPercentile}%</span>
              </div>
              <p className="text-xs dark:text-white/60 text-slate-600 leading-snug">
                Вы здоровее, чем {cohortPercentile}% {cohortLabel || "людей вашего возраста"}
              </p>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold dark:text-white/40 text-slate-400">—</span>
              <p className="text-xs dark:text-white/40 text-slate-500">Недостаточно данных</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
