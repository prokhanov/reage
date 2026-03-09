import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface AnalysisStep3Props {
  data: {
    generateReport: boolean;
  };
  onChange: (data: any) => void;
}

export function AnalysisStep3({ data, onChange }: AnalysisStep3Props) {
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="generateReport"
          checked={data.generateReport}
          onCheckedChange={(checked) =>
            onChange({ generateReport: checked })
          }
        />
        <Label
          htmlFor="generateReport"
          className="text-base font-medium cursor-pointer"
        >
          Сгенерировать персональный отчет
        </Label>
      </div>

      {data.generateReport && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Генерация отчета может занять 1-2 минуты. После завершения вы
            сможете отредактировать текст отчета перед загрузкой в кабинет
            клиента.
          </AlertDescription>
        </Alert>
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
