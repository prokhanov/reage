import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SymptomRecord {
  id: string;
  category: string;
  symptom: string;
  severity: number;
  tracked_at: string;
}

interface SymptomTrendChartProps {
  symptoms: SymptomRecord[];
  selectedCategory?: string;
}

export function SymptomTrendChart({ symptoms, selectedCategory }: SymptomTrendChartProps) {
  // Фильтруем по категории если указана
  const filteredSymptoms = selectedCategory
    ? symptoms.filter(s => s.category === selectedCategory)
    : symptoms;

  // Группируем по датам
  const dateGroups = filteredSymptoms.reduce((acc, symptom) => {
    const date = format(new Date(symptom.tracked_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(symptom);
    return acc;
  }, {} as Record<string, SymptomRecord[]>);

  // Подготавливаем данные для графика
  const chartData = Object.keys(dateGroups)
    .sort()
    .map(date => {
      const daySymptoms = dateGroups[date];
      const avgSeverity = daySymptoms.reduce((sum, s) => sum + s.severity, 0) / daySymptoms.length;
      const counts = { mild: 0, moderate: 0, severe: 0 };
      
      daySymptoms.forEach(s => {
        if (s.severity === 1) counts.mild++;
        if (s.severity === 2) counts.moderate++;
        if (s.severity === 3) counts.severe++;
      });

      return {
        date,
        dateLabel: format(new Date(date), "d MMM", { locale: ru }),
        total: daySymptoms.length,
        avgSeverity: Number(avgSeverity.toFixed(2)),
        mild: counts.mild,
        moderate: counts.moderate,
        severe: counts.severe
      };
    });

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">Динамика симптомов</h3>
        <p className="text-sm text-muted-foreground">
          {selectedCategory || "Все категории"}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="dateLabel" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Всего симптомов"
            dot={{ fill: 'hsl(var(--primary))' }}
          />
          <Line 
            type="monotone" 
            dataKey="mild" 
            stroke="rgb(234, 179, 8)" 
            strokeWidth={2}
            name="Легкие"
            dot={{ fill: 'rgb(234, 179, 8)' }}
          />
          <Line 
            type="monotone" 
            dataKey="moderate" 
            stroke="rgb(249, 115, 22)" 
            strokeWidth={2}
            name="Средние"
            dot={{ fill: 'rgb(249, 115, 22)' }}
          />
          <Line 
            type="monotone" 
            dataKey="severe" 
            stroke="rgb(239, 68, 68)" 
            strokeWidth={2}
            name="Сильные"
            dot={{ fill: 'rgb(239, 68, 68)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
