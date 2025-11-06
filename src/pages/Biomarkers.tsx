import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface BiomarkerData {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  description: string | null;
  normal_min: number | null;
  normal_max: number | null;
  latest_value: number | null;
  latest_date: string | null;
  previous_value: number | null;
  trend: "up" | "down" | "stable" | null;
}

interface GroupedBiomarkers {
  [category: string]: BiomarkerData[];
}

export default function Biomarkers() {
  const [biomarkers, setBiomarkers] = useState<GroupedBiomarkers>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBiomarkers();
  }, []);

  const loadBiomarkers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Получаем все биомаркеры
      const { data: biomarkersData, error: biomarkersError } = await supabase
        .from("biomarkers")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (biomarkersError) throw biomarkersError;

      // Для каждого биомаркера получаем последние 2 значения
      const biomarkersWithData = await Promise.all(
        (biomarkersData || []).map(async (biomarker) => {
          // Получаем последние 2 значения этого биомаркера
          const { data: valuesData } = await supabase
            .from("analysis_values")
            .select(`
              value,
              analysis_id,
              analyses!inner(date, user_id)
            `)
            .eq("biomarker_id", biomarker.id)
            .eq("analyses.user_id", user.id)
            .order("analyses(date)", { ascending: false })
            .limit(2);

          if (!valuesData || valuesData.length === 0) {
            return {
              ...biomarker,
              latest_value: null,
              latest_date: null,
              previous_value: null,
              trend: null,
            };
          }

          const latestValue = valuesData[0].value;
          const latestDate = valuesData[0].analyses.date;
          const previousValue = valuesData.length > 1 ? valuesData[1].value : null;

          let trend: "up" | "down" | "stable" | null = null;
          if (previousValue !== null) {
            const diff = latestValue - previousValue;
            const threshold = Math.abs(previousValue) * 0.05; // 5% изменение
            if (Math.abs(diff) < threshold) {
              trend = "stable";
            } else if (diff > 0) {
              trend = "up";
            } else {
              trend = "down";
            }
          }

          return {
            ...biomarker,
            latest_value: latestValue,
            latest_date: latestDate,
            previous_value: previousValue,
            trend,
          };
        })
      );

      // Группируем по категориям
      const grouped = biomarkersWithData.reduce((acc, biomarker) => {
        const category = biomarker.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(biomarker);
        return acc;
      }, {} as GroupedBiomarkers);

      setBiomarkers(grouped);
    } catch (error: any) {
      console.error("Error loading biomarkers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить маркеры",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable" | null) => {
    if (!trend) return null;
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendLabel = (trend: "up" | "down" | "stable" | null) => {
    if (!trend) return "Нет данных";
    switch (trend) {
      case "up":
        return "Рост";
      case "down":
        return "Снижение";
      case "stable":
        return "Стабильно";
    }
  };

  const isInNormalRange = (value: number | null, min: number | null, max: number | null) => {
    if (value === null) return null;
    if (min === null && max === null) return null;
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Биомаркеры
          </h2>
          <p className="text-muted-foreground">Актуальные данные по всем маркерам из анализов</p>
        </div>

        {Object.keys(biomarkers).length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Нет данных</h3>
              <p className="text-muted-foreground text-center">
                Добавьте анализы, чтобы увидеть информацию о биомаркерах
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(biomarkers)} className="space-y-4">
            {Object.entries(biomarkers).map(([category, categoryBiomarkers]) => (
              <AccordionItem 
                key={category} 
                value={category}
                className="border border-primary/20 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {categoryBiomarkers.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {categoryBiomarkers.map((biomarker) => {
                      const inRange = isInNormalRange(
                        biomarker.latest_value,
                        biomarker.normal_min,
                        biomarker.normal_max
                      );

                      return (
                        <Card
                          key={biomarker.id}
                          className={`border transition-all hover:shadow-md ${
                            inRange === false
                              ? "border-destructive/50 bg-destructive/5"
                              : inRange === true
                              ? "border-green-500/50 bg-green-500/5"
                              : "border-primary/20"
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base font-semibold">
                                {biomarker.name}
                              </CardTitle>
                              {biomarker.trend && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {getTrendIcon(biomarker.trend)}
                                  <span className="text-xs text-muted-foreground">
                                    {getTrendLabel(biomarker.trend)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{biomarker.code}</p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {biomarker.latest_value !== null ? (
                              <>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-sm text-muted-foreground">
                                    Последнее значение:
                                  </span>
                                  <span 
                                    className="text-xl font-bold"
                                    style={{
                                      color: (() => {
                                        if (biomarker.normal_min === null && biomarker.normal_max === null) {
                                          return "hsl(var(--primary))";
                                        }
                                        
                                        const min = biomarker.normal_min ?? 0;
                                        const max = biomarker.normal_max ?? biomarker.latest_value * 2;
                                        const value = biomarker.latest_value;
                                        
                                        // Расчет позиции на шкале (0-1)
                                        let position = (value - min) / (max - min);
                                        position = Math.max(0, Math.min(1, position));
                                        
                                        // Градиент: красный (0) -> зеленый (0.5) -> красный (1)
                                        // Используем квадратичную функцию для более плавного перехода
                                        let hue: number;
                                        if (position < 0.5) {
                                          // От красного (0°) к зеленому (120°)
                                          hue = position * 2 * 120;
                                        } else {
                                          // От зеленого (120°) к красному (0°)
                                          hue = 120 - (position - 0.5) * 2 * 120;
                                        }
                                        
                                        return `hsl(${hue}, 70%, 50%)`;
                                      })()
                                    }}
                                  >
                                    {biomarker.latest_value.toFixed(2)} {biomarker.unit}
                                  </span>
                                </div>
                                {biomarker.latest_date && (
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-muted-foreground">Дата:</span>
                                    <span className="text-xs text-foreground">
                                      {new Date(biomarker.latest_date).toLocaleDateString("ru-RU")}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Нет данных
                              </p>
                            )}

                            {(biomarker.normal_min !== null || biomarker.normal_max !== null) && biomarker.latest_value !== null && (
                              <div className="pt-2 border-t border-border/30">
                                <p className="text-xs text-muted-foreground mb-1">Норма:</p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-3 bg-secondary rounded-full relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-r from-destructive/70 via-green-500/70 to-destructive/70" />
                                      {(() => {
                                        const min = biomarker.normal_min ?? 0;
                                        const max = biomarker.normal_max ?? biomarker.latest_value * 2;
                                        const range = max - min;
                                        const value = biomarker.latest_value;
                                        
                                        // Расчет позиции с небольшим отступом от краев
                                        let position = ((value - min) / range) * 100;
                                        position = Math.max(2, Math.min(98, position)); // Ограничиваем 2-98%
                                        
                                        // Определяем цвет в зависимости от нормы
                                        let markerColor = "bg-green-500";
                                        if (biomarker.normal_min !== null && value < biomarker.normal_min) {
                                          markerColor = "bg-destructive";
                                        } else if (biomarker.normal_max !== null && value > biomarker.normal_max) {
                                          markerColor = "bg-destructive";
                                        }
                                        
                                        return (
                                          <div 
                                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${markerColor} border-2 border-background shadow-lg z-10`}
                                            style={{ left: `${position}%` }}
                                          />
                                        );
                                      })()}
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {biomarker.normal_min !== null && biomarker.normal_max !== null
                                        ? `${biomarker.normal_min}-${biomarker.normal_max}`
                                        : biomarker.normal_min !== null
                                        ? `> ${biomarker.normal_min}`
                                        : `< ${biomarker.normal_max}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {biomarker.description && (
                              <div className="pt-2 border-t border-border/30">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {biomarker.description}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
}
