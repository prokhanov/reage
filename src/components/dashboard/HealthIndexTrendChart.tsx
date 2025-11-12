import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Legend } from "recharts";
import { format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";

interface HealthIndexTrendChartProps {
  analyses: any[];
}

export function HealthIndexTrendChart({ analyses }: HealthIndexTrendChartProps) {
  const [period, setPeriod] = useState<'3' | '6' | '12' | 'all'>('all');

  const chartData = useMemo(() => {
    if (!analyses || analyses.length === 0) return [];

    // Filter analyses with health_index
    const validAnalyses = analyses.filter(a => a.health_index !== null && a.health_index !== undefined);
    
    if (validAnalyses.length === 0) return [];

    // Sort by date
    const sorted = [...validAnalyses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by period
    let filtered = sorted;
    if (period !== 'all') {
      const monthsAgo = subMonths(new Date(), parseInt(period));
      filtered = sorted.filter(a => new Date(a.date) >= monthsAgo);
    }

    // Calculate change from previous
    return filtered.map((analysis, index) => {
      const previousIndex = Math.max(0, index - 1);
      const previousValue = index > 0 ? filtered[previousIndex].health_index : analysis.health_index;
      const change = analysis.health_index - previousValue;

      let status = "Требует внимания";
      if (analysis.health_index >= 85) status = "Отлично";
      else if (analysis.health_index >= 70) status = "Хорошо";
      else if (analysis.health_index >= 50) status = "Умеренно";

      return {
        date: new Date(analysis.date),
        dateFormatted: format(new Date(analysis.date), 'd MMM yyyy', { locale: ru }),
        health_index: Math.round(analysis.health_index),
        change: index > 0 ? Math.round(change) : 0,
        status,
      };
    });
  }, [analyses, period]);

  const getStrokeColor = (value: number) => {
    if (value >= 85) return 'hsl(142, 76%, 36%)'; // green
    if (value >= 70) return 'hsl(45, 93%, 47%)'; // yellow
    if (value >= 50) return 'hsl(25, 95%, 53%)'; // orange
    return 'hsl(0, 84%, 60%)'; // red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const changeColor = data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-muted-foreground';
    const changeSign = data.change > 0 ? '+' : '';

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{data.dateFormatted}</p>
        <div className="space-y-1 text-sm">
          <p className="text-primary">
            Индекс: <span className="font-semibold">{data.health_index}/100</span>
          </p>
          <p className="text-muted-foreground">
            Оценка: <span className="font-semibold">{data.status}</span>
          </p>
          {data.change !== 0 && (
            <p className={changeColor}>
              Изменение: <span className="font-semibold">{changeSign}{data.change} пунктов</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!analyses || analyses.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">
          Добавьте минимум 2 анализа для отслеживания динамики
        </p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          Ваши анализы не содержат данных об индексе здоровья.<br />
          Добавьте лабораторные данные для расчета.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">Индекс здоровья</CardTitle>
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
              <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            
            {/* Reference zones */}
            <ReferenceArea y1={85} y2={100} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
            <ReferenceArea y1={70} y2={85} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
            <ReferenceArea y1={50} y2={70} fill="hsl(25, 95%, 53%)" fillOpacity={0.1} />
            <ReferenceArea y1={0} y2={50} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
            
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
              domain={[0, 100]}
              label={{ value: 'Индекс (0-100)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone"
              dataKey="health_index"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={4} 
                    fill={getStrokeColor(payload.health_index)}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6 }}
              name="Индекс здоровья"
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Legend for zones */}
        <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }}></div>
            <span>85-100 Отлично</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }}></div>
            <span>70-85 Хорошо</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }}></div>
            <span>50-70 Умеренно</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }}></div>
            <span>&lt;50 Требует внимания</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
