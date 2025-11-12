import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryTrend {
  category: string;
  emoji: string;
  change: number;
  oldScore: number;
  newScore: number;
  text: string;
  type: 'improvement' | 'decline' | 'stable';
}

interface HealthTrendsCardProps {
  analyses?: any[];
}

export function HealthTrendsCard({ analyses }: HealthTrendsCardProps) {
  const [period, setPeriod] = useState<'3' | '6' | '12' | 'all'>('3');
  const [trends, setTrends] = useState<CategoryTrend[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from('biomarker_categories')
        .select('name, emoji')
        .order('display_order');
      
      if (data) setCategories(data);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!analyses || analyses.length < 2 || categories.length === 0) {
      setTrends([]);
      return;
    }

    calculateTrends();
  }, [period, analyses, categories]);

  const calculateTrends = () => {
    if (!analyses || analyses.length < 2) return;

    const now = new Date();
    const monthsAgo = period === 'all' ? Infinity : parseInt(period);
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate());

    // Filter analyses by period
    const filteredAnalyses = analyses.filter(a => {
      const analysisDate = new Date(a.date || a.analysis_date);
      return period === 'all' || analysisDate >= cutoffDate;
    });

    if (filteredAnalyses.length < 2) {
      setTrends([]);
      return;
    }

    // Get oldest and newest analyses in period
    const sortedAnalyses = [...filteredAnalyses].sort((a, b) => 
      new Date(a.date || a.analysis_date).getTime() - new Date(b.date || b.analysis_date).getTime()
    );
    
    const oldestAnalysis = sortedAnalyses[0];
    const newestAnalysis = sortedAnalyses[sortedAnalyses.length - 1];

    const oldScores = oldestAnalysis.biomarkers_metadata?.ai_analysis?.category_scores || {};
    const newScores = newestAnalysis.biomarkers_metadata?.ai_analysis?.category_scores || {};

    const calculatedTrends: CategoryTrend[] = [];

    categories.forEach(cat => {
      const oldScore = oldScores[cat.name];
      const newScore = newScores[cat.name];

      if (oldScore !== undefined && newScore !== undefined) {
        const change = newScore - oldScore;
        const percentChange = Math.abs((change / oldScore) * 100);

        let text = '';
        let type: 'improvement' | 'decline' | 'stable' = 'stable';

        if (percentChange < 2) {
          text = `стабильно (${oldScore} → ${newScore})`;
          type = 'stable';
        } else if (change > 0) {
          // Улучшение
          type = 'improvement';
          if (percentChange >= 15) {
            text = `значительно улучшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          } else if (percentChange >= 5) {
            text = `улучшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          } else {
            text = `слегка улучшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          }
        } else {
          // Ухудшение
          type = 'decline';
          if (percentChange >= 15) {
            text = `значительно ухудшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          } else if (percentChange >= 5) {
            text = `ухудшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          } else {
            text = `слегка ухудшилось на ${percentChange.toFixed(0)}% (${oldScore} → ${newScore})`;
          }
        }

        calculatedTrends.push({
          category: cat.name,
          emoji: cat.emoji,
          change,
          oldScore,
          newScore,
          text,
          type
        });
      }
    });

    setTrends(calculatedTrends);
  };

  const getPeriodText = () => {
    switch (period) {
      case '3': return 'За последние 3 месяца';
      case '6': return 'За последние 6 месяцев';
      case '12': return 'За последний год';
      case 'all': return 'За всё время';
    }
  };

  if (!analyses || analyses.length < 2) {
    return (
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">📊 Тренды здоровья</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Добавьте минимум 2 анализа для отслеживания трендов</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📊 Тренды здоровья</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Последние 3 месяца</SelectItem>
              <SelectItem value="6">Последние 6 месяцев</SelectItem>
              <SelectItem value="12">Последний год</SelectItem>
              <SelectItem value="all">За всё время</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Нет данных за выбранный период</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{getPeriodText()}:</p>
            <div className="space-y-3">
              {trends.map((trend, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50"
                >
                  {trend.type === 'improvement' && (
                    <CheckCircle2 className="h-5 w-5 text-status-good flex-shrink-0 mt-0.5" />
                  )}
                  {trend.type === 'decline' && (
                    <AlertTriangle className="h-5 w-5 text-status-danger flex-shrink-0 mt-0.5" />
                  )}
                  {trend.type === 'stable' && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{trend.emoji}</span>
                      <span className="text-sm font-medium text-foreground">
                        {trend.category}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      trend.type === 'improvement' ? 'text-status-good' :
                      trend.type === 'decline' ? 'text-status-danger' :
                      'text-muted-foreground'
                    }`}>
                      {trend.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
