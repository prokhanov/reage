import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, Sparkles, Brain, LayoutGrid, CircleDot } from "lucide-react";
import type { ReportKind } from "@/lib/reportLab/types";

export type ReportMode = "standard" | "deep";

interface AnalysisStep3Props {
  data: {
    generateReport: boolean;
    mode?: ReportMode;
    reportKind?: ReportKind;
  };
  onChange: (data: { generateReport: boolean; mode: ReportMode; reportKind: ReportKind }) => void;
}

const optionClass =
  "flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors data-[state=checked]:border-primary";

export function AnalysisStep3({ data, onChange }: AnalysisStep3Props) {
  const mode: ReportMode = data.mode ?? "standard";
  const reportKind: ReportKind = data.reportKind ?? "systems";
  const emit = (patch: Partial<{ generateReport: boolean; mode: ReportMode; reportKind: ReportKind }>) =>
    onChange({ generateReport: data.generateReport, mode, reportKind, ...patch });

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="generateReport"
          checked={data.generateReport}
          onCheckedChange={(checked) => emit({ generateReport: !!checked })}
        />
        <Label htmlFor="generateReport" className="text-base font-medium cursor-pointer">
          Сгенерировать персональный отчет
        </Label>
      </div>

      {data.generateReport && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Тип отчёта</Label>
            <RadioGroup
              value={reportKind}
              onValueChange={(value) => emit({ reportKind: value as ReportKind })}
              className="gap-3"
            >
              <label htmlFor="kind-systems" className={optionClass} data-state={reportKind === "systems" ? "checked" : "unchecked"}>
                <RadioGroupItem value="systems" id="kind-systems" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="font-medium">По системам организма</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Стандартный отчёт: отдельный раздел для каждой системы.
                  </p>
                </div>
              </label>
              <label htmlFor="kind-whole" className={optionClass} data-state={reportKind === "whole_body" ? "checked" : "unchecked"}>
                <RadioGroupItem value="whole_body" id="kind-whole" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-primary" />
                    <span className="font-medium">Организм в целом</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Один общий раздел без разбивки по системам: сильные стороны и зоны внимания.
                    Без страницы данных пациента и плашек с показателями.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Глубина анализа</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => emit({ mode: value as ReportMode })}
              className="gap-3"
            >
              <label htmlFor="mode-standard" className={optionClass} data-state={mode === "standard" ? "checked" : "unchecked"}>
                <RadioGroupItem value="standard" id="mode-standard" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">Стандартный</span>
                    <span className="text-xs text-muted-foreground">~3–5 мин</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Быстрая генерация на базовой модели. Подходит для большинства анализов.
                  </p>
                </div>
              </label>

              <label htmlFor="mode-deep" className={optionClass} data-state={mode === "deep" ? "checked" : "unchecked"}>
                <RadioGroupItem value="deep" id="mode-deep" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="font-medium">Глубокий анализ</span>
                    <span className="text-xs text-muted-foreground">~8–15 мин</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Усиленная модель + расширенное «обдумывание». Глубже интерпретация,
                    меньше шаблонности, лучше связность между разделами. Требует больше
                    времени и AI-кредитов.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {mode === "deep"
                ? "Глубокий режим использует более мощную модель и расширенное обдумывание. Генерация занимает заметно дольше, но качество интерпретаций и рекомендаций выше."
                : "Генерация отчета займёт несколько минут. После завершения вы сможете отредактировать текст перед загрузкой в кабинет клиента."}
            </AlertDescription>
          </Alert>
        </>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Анализ будет создан со статусом "На проверке".</p>
        <p className="mt-2">
          Клиент увидит анализ только после того, как вы загрузите отчет в его
          кабинет.
        </p>
      </div>
    </div>
  );
}
