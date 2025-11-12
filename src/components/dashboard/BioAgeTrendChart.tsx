import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";

interface BioAgeTrendChartProps {
  analyses: any[];
  birthDate: string;
}

export function BioAgeTrendChart({ analyses, birthDate }: BioAgeTrendChartProps) {
  const [period, setPeriod] = useState<'3' | '6' | '12' | 'all'>('all');

  const chartData = useMemo(() => {
    if (!analyses || analyses.length === 0) return [];

    // Filter analyses with biological_age
    const validAnalyses = analyses.filter(a => a.biological_age !== null && a.biological_age !== undefined);
    
    if (validAnalyses.length === 0) return [];

    // Sort by date
    const sorted = [...validAnalyses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by period
    let filtered = sorted;
    if (period !== 'all') {
      const monthsAgo = subMonths(new Date(), parseInt(period));
      filtered = sorted.filter(a => new Date(a.date) >= monthsAgo);
    }

    // Calculate chronological age at each analysis date
    return filtered.map(analysis => {
      const analysisDate = new Date(analysis.date);
      const birthDateObj = new Date(birthDate);
      const ageInYears = (analysisDate.getTime() - birthDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const chronologicalAge = Math.round(ageInYears * 10) / 10;
      
      const difference = analysis.biological_age - chronologicalAge;
      const agingRate = analysis.biomarkers_metadata?.ai_analysis?.aging_rate;

      return {
        date: analysisDate,
        dateFormatted: format(analysisDate, 'd MMM yyyy', { locale: ru }),
        biological_age: Math.round(analysis.biological_age * 10) / 10,
        chronological_age: chronologicalAge,
        difference: Math.round(difference * 10) / 10,
        aging_rate: agingRate ? Math.round(agingRate * 100) / 100 : null,
      };
    });
  }, [analyses, birthDate, period]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const diffColor = data.difference < 0 ? 'text-green-600' : 'text-red-600';
    const diffSign = data.difference > 0 ? '+' : '';

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{data.dateFormatted}</p>
        <div className="space-y-1 text-sm">
          <p className="text-primary">
            Биологический: <span className="font-semibold">{data.biological_age} лет</span>
          </p>
          <p className="text-muted-foreground">
            Хронологический: <span className="font-semibold">{data.chronological_age} лет</span>
          </p>
          <p className={diffColor}>
            Разница: <span className="font-semibold">{diffSign}{data.difference} лет</span>
          </p>
          {data.aging_rate && (
            <p className="text-muted-foreground">
              Темп старения: <span className="font-semibold">{data.aging_rate}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!analyses || analyses.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 Динамика биологического возраста</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Добавьте минимум 2 анализа для отслеживания динамики
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 Динамика биологического возраста</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              Ваши анализы не содержат данных о биологическом возрасте.<br />
              Добавьте лабораторные данные для расчета.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">📈 Динамика биологического возраста</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 месяца</SelectItem>
              <SelectItem value="6">6 месяцев</SelectItem>
              <SelectItem value="12">1 год</SelectItem>
              <SelectItem value="all">Всё время</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="dateFormatted" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
              label={{ value: 'Возраст (лет)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Area
              type="monotone"
              dataKey="biological_age"
              fill="url(#areaGradient)"
              stroke="none"
            />
            <Line 
              type="monotone"
              dataKey="biological_age"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name="Биологический возраст"
            />
            <Line 
              type="monotone"
              dataKey="chronological_age"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
              name="Хронологический возраст"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
