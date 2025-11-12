import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryScore {
  name: string;
  emoji: string;
  score: number;
  displayOrder: number;
}

interface SystemRatingsCardProps {
  categoryScores?: Record<string, number>;
}

export function SystemRatingsCard({ categoryScores }: SystemRatingsCardProps) {
  const [categories, setCategories] = useState<CategoryScore[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from('biomarker_categories')
        .select('name, emoji, display_order')
        .order('display_order');

      if (data && categoryScores) {
        const scores = data.map(cat => ({
          name: cat.name,
          emoji: cat.emoji,
          score: categoryScores[cat.name] || 0,
          displayOrder: cat.display_order
        }));
        setCategories(scores);
      }
    };

    loadCategories();
  }, [categoryScores]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-status-good";
    if (score >= 70) return "text-[hsl(45,90%,55%)]";
    if (score >= 50) return "text-status-warning";
    return "text-status-danger";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Отличное состояние";
    if (score >= 70) return "Хорошее состояние";
    if (score >= 50) return "Требует внимания";
    return "Критично";
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return "bg-status-good";
    if (score >= 70) return "bg-[hsl(45,90%,55%)]";
    if (score >= 50) return "bg-status-warning";
    return "bg-status-danger";
  };

  if (!categoryScores || categories.length === 0) {
    return (
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💯 Рейтинг систем организма
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    AI анализирует состояние каждой системы организма на основе ваших биомаркеров 
                    и присваивает оценку от 0 до 100 баллов.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Добавьте анализ для получения рейтинга систем</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          💯 Рейтинг систем организма
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  AI анализирует состояние каждой системы организма на основе ваших биомаркеров 
                  и присваивает оценку от 0 до 100 баллов.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((cat, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(cat.score)}`}>
                  {cat.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${getProgressColor(cat.score)}`}
                style={{ width: `${cat.score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {getScoreLabel(cat.score)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
