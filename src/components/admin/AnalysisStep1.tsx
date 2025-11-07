import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AnalysisStep1Props {
  data: {
    date: string;
    labName: string;
  };
  onChange: (data: any) => void;
}

export function AnalysisStep1({ data, onChange }: AnalysisStep1Props) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="date">Дата анализа</Label>
        <Input
          id="date"
          type="date"
          value={data.date}
          onChange={(e) => onChange({ ...data, date: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labName">Лаборатория (опционально)</Label>
        <Input
          id="labName"
          type="text"
          placeholder="Инвитро, KDL и т.д."
          value={data.labName}
          onChange={(e) => onChange({ ...data, labName: e.target.value })}
        />
      </div>
    </div>
  );
}
