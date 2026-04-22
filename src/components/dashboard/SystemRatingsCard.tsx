import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryScore {
  name: string;
  emoji: string;
  score: number;
  displayOrder: number;
}

interface CategoryTrend {
  change: number;
  oldScore: number;
  newScore: number;
  text: string;
  type: 'improvement' | 'decline' | 'stable';
}

interface SystemRatingsCardProps {
  categoryScores?: Record<string, number | { score: number; impact?: string; key_markers?: string[] } | null>;
  analyses?: any[];
}

export function SystemRatingsCard({ categoryScores, analyses }: SystemRatingsCardProps) {
  const [categories, setCategories] = useState<CategoryScore[]>([]);
  const [period, setPeriod] = useState<'3' | '6' | '12' | 'all'>('3');
  const [trends, setTrends] = useState<Record<string, CategoryTrend>>({});

  useEffect(() => {
    const loadCategories = async () => {
      const { data: categoriesData, error } = await supabase
        .from('biomarker_categories')
        .select('name, emoji, display_order')
        .order('display_order');

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      if (categoriesData && categoryScores) {
        // Legacy keys для обратной совместимости со старыми анализами
        const LEGACY_KEYS: Record<string, string[]> = {
          "Метаболизм и Детоксикация": [
            "Обмен веществ и детоксикация",
            "Почки и водно-солевой баланс",
          ],
        };

        const extractScore = (raw: any): number => {
          if (raw === null || raw === undefined) return 0;
          if (typeof raw === 'object' && 'score' in raw) {
            const s = (raw as { score?: number }).score;
            return typeof s === 'number' ? s : 0;
          }
          return typeof raw === 'number' ? raw : 0;
        };

        const mappedCategories = categoriesData
          .map(cat => {
            let score = extractScore(categoryScores[cat.name]);

            // Если score не найден по новому имени — пробуем legacy-ключи
            if (score === 0 && LEGACY_KEYS[cat.name]) {
              const legacyScores = LEGACY_KEYS[cat.name]
                .map(k => extractScore(categoryScores[k]))
                .filter(s => s > 0);
              if (legacyScores.length > 0) {
                score = Math.max(...legacyScores);
              }
            }

            return {
              name: cat.name,
              emoji: cat.emoji,
              score,
              displayOrder: cat.display_order
            };
          })
          .sort((a, b) => a.displayOrder - b.displayOrder);

        setCategories(mappedCategories);
      }
    };

    loadCategories();
  }, [categoryScores]);

  useEffect(() => {
    if (!analyses || analyses.length < 2 || categories.length === 0) {
      setTrends({});
      return;
    }

    calculateTrends();
  }, [period, analyses, categories]);

  const calculateTrends = () => {
    if (!analyses || analyses.length < 2) return;

    const now = new Date();
    const monthsAgo = period === 'all' ? Infinity : parseInt(period);
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate());

    const filteredAnalyses = analyses.filter(a => {
      const analysisDate = new Date(a.date || a.analysis_date);
      return period === 'all' || analysisDate >= cutoffDate;
    });

    if (filteredAnalyses.length < 2) {
      setTrends({});
      return;
    }

    const sortedAnalyses = [...filteredAnalyses].sort((a, b) => 
      new Date(a.date || a.analysis_date).getTime() - new Date(b.date || b.analysis_date).getTime()
    );
    
    const oldestAnalysis = sortedAnalyses[0];
    const newestAnalysis = sortedAnalyses[sortedAnalyses.length - 1];

    const oldScores = oldestAnalysis.biomarkers_metadata?.ai_analysis?.category_scores || {};
    const newScores = newestAnalysis.biomarkers_metadata?.ai_analysis?.category_scores || {};

    const calculatedTrends: Record<string, CategoryTrend> = {};

    // Legacy mapping: для категории "Метаболизм и Детоксикация" учитываем
    // старые ключи из исторических анализов ("Обмен веществ и детоксикация",
    // "Почки и водно-солевой баланс"). Берём максимум из доступных значений.
    const LEGACY_KEYS: Record<string, string[]> = {
      "Метаболизм и Детоксикация": [
        "Обмен веществ и детоксикация",
        "Почки и водно-солевой баланс",
      ],
    };

    const extractScore = (raw: any): number | null => {
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'object' && 'score' in raw) {
        return typeof raw.score === 'number' ? raw.score : null;
      }
      return typeof raw === 'number' ? raw : null;
    };

    const getScoreForCategory = (
      scores: Record<string, any>,
      categoryName: string
    ): number | null => {
      const direct = extractScore(scores[categoryName]);
      if (direct !== null) return direct;

      const legacyKeys = LEGACY_KEYS[categoryName] || [];
      const legacyValues = legacyKeys
        .map(k => extractScore(scores[k]))
        .filter((v): v is number => v !== null);

      if (legacyValues.length === 0) return null;
      // Берём максимум, чтобы корректно отражать лучшее из объединённых систем
      return Math.max(...legacyValues);
    };

    categories.forEach(cat => {
      const oldScore = getScoreForCategory(oldScores, cat.name);
      const newScore = getScoreForCategory(newScores, cat.name);

      if (oldScore !== null && newScore !== null && oldScore !== 0) {
        const change = newScore - oldScore;
        const percentChange = Math.abs((change / oldScore) * 100);

        let text = '';
        let type: 'improvement' | 'decline' | 'stable' = 'stable';

        if (percentChange < 2) {
          text = `без изменений`;
          type = 'stable';
        } else if (change > 0) {
          type = 'improvement';
          if (percentChange >= 15) {
            text = `улучшилось на ${percentChange.toFixed(0)}%`;
          } else {
            text = `улучшилось на ${percentChange.toFixed(0)}%`;
          }
        } else {
          type = 'decline';
          if (percentChange >= 15) {
            text = `ухудшилось на ${percentChange.toFixed(0)}%`;
          } else {
            text = `ухудшилось на ${percentChange.toFixed(0)}%`;
          }
        }

        calculatedTrends[cat.name] = {
          change,
          oldScore,
          newScore,
          text,
          type
        };
      }
    });

    setTrends(calculatedTrends);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-status-optimal";
    if (score >= 70) return "text-status-acceptable";
    if (score >= 50) return "text-status-risk";
    return "text-status-critical";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Оптимально";
    if (score >= 70) return "Допустимо";
    if (score >= 50) return "Риск";
    return "Критично";
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return "bg-status-optimal";
    if (score >= 70) return "bg-status-acceptable";
    if (score >= 50) return "bg-status-risk";
    return "bg-status-critical";
  };

  if (!categoryScores || categories.length === 0) {
    return (
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🏥 Рейтинг систем организма
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    AI анализирует состояние каждой системы организма и показывает изменения за выбранный период
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Добавьте анализ для оценки систем организма
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🏥 Рейтинг систем организма
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    AI анализирует состояние каждой системы организма и показывает изменения за выбранный период
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          {analyses && analyses.length >= 2 && (
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 месяца</SelectItem>
                <SelectItem value="6">6 месяцев</SelectItem>
                <SelectItem value="12">1 год</SelectItem>
                <SelectItem value="all">Всё время</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category, index) => {
            const trend = trends[category.name];
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.emoji}</span>
                    <span className="text-sm font-medium text-foreground">
                      {category.name}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(category.score)}`}>
                            {category.score}
                          </span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getScoreLabel(category.score)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(category.score)}`}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                
                {trend && (
                  <div className="flex items-center gap-2 text-xs">
                    {trend.type === 'improvement' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-good flex-shrink-0" />
                    )}
                    {trend.type === 'decline' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-status-danger flex-shrink-0" />
                    )}
                    {trend.type === 'stable' && (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`${
                      trend.type === 'improvement' ? 'text-status-good' :
                      trend.type === 'decline' ? 'text-status-danger' :
                      'text-muted-foreground'
                    }`}>
                      {trend.text}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
