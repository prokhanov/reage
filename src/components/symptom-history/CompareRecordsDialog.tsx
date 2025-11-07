import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { GitCompare, ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SymptomRecord {
  id: string;
  category: string;
  symptom: string;
  severity: number;
  tracked_at: string;
}

interface CompareRecordsDialogProps {
  groupedByDate: Record<string, SymptomRecord[]>;
  sortedDates: string[];
}

const severityLevels = [
  { value: 0, label: "Нет", color: "text-muted-foreground" },
  { value: 1, label: "Легко", color: "text-yellow-500" },
  { value: 2, label: "Средне", color: "text-orange-500" },
  { value: 3, label: "Сильно", color: "text-red-500" }
];

export function CompareRecordsDialog({ groupedByDate, sortedDates }: CompareRecordsDialogProps) {
  const [date1, setDate1] = useState<string>("");
  const [date2, setDate2] = useState<string>("");

  const symptoms1 = date1 ? groupedByDate[date1] : [];
  const symptoms2 = date2 ? groupedByDate[date2] : [];

  // Создаем карту симптомов для сравнения
  const symptomMap1 = symptoms1.reduce((acc, s) => {
    acc[`${s.category}|${s.symptom}`] = s.severity;
    return acc;
  }, {} as Record<string, number>);

  const symptomMap2 = symptoms2.reduce((acc, s) => {
    acc[`${s.category}|${s.symptom}`] = s.severity;
    return acc;
  }, {} as Record<string, number>);

  // Все уникальные симптомы из обеих записей
  const allSymptomKeys = Array.from(new Set([
    ...Object.keys(symptomMap1),
    ...Object.keys(symptomMap2)
  ]));

  // Группируем по категориям
  const categorizedComparison = allSymptomKeys.reduce((acc, key) => {
    const [category, symptom] = key.split('|');
    if (!acc[category]) {
      acc[category] = [];
    }
    
    const severity1 = symptomMap1[key] || 0;
    const severity2 = symptomMap2[key] || 0;
    const change = severity2 - severity1;
    
    acc[category].push({
      symptom,
      severity1,
      severity2,
      change
    });
    
    return acc;
  }, {} as Record<string, Array<{ symptom: string; severity1: number; severity2: number; change: number }>>);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getSeverityLabel = (severity: number) => {
    return severityLevels[severity]?.label || "Нет";
  };

  const getSeverityColor = (severity: number) => {
    return severityLevels[severity]?.color || "text-muted-foreground";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitCompare className="h-4 w-4" />
          Сравнить записи
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Сравнение записей</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Первая запись</label>
              <Select value={date1} onValueChange={setDate1}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите дату" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), "d MMMM yyyy", { locale: ru })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Вторая запись</label>
              <Select value={date2} onValueChange={setDate2}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите дату" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), "d MMMM yyyy", { locale: ru })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {date1 && date2 && (
            <div className="space-y-4">
              {Object.entries(categorizedComparison).map(([category, symptoms]) => (
                <Card key={category} className="p-4">
                  <h3 className="font-semibold mb-3">{category}</h3>
                  <div className="space-y-2">
                    {symptoms.map(({ symptom, severity1, severity2, change }) => (
                      <div
                        key={symptom}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                      >
                        <span className="text-sm flex-1">{symptom}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={getSeverityColor(severity1)}>
                            {getSeverityLabel(severity1)}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className={getSeverityColor(severity2)}>
                            {getSeverityLabel(severity2)}
                          </Badge>
                          {getChangeIcon(change)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {(!date1 || !date2) && (
            <div className="text-center py-8 text-muted-foreground">
              Выберите две записи для сравнения
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
