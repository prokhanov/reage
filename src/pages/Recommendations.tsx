import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Utensils, Moon, Dumbbell, Pill, Brain, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  created_at: string;
}

const categoryIcons: Record<string, any> = {
  "Питание": Utensils,
  "Сон": Moon,
  "Активность": Dumbbell,
  "Добавки": Pill,
  "Стресс": Brain,
  "Образ жизни": Heart,
  "Общее резюме": Brain,
};

const categoryColors: Record<string, string> = {
  "Питание": "primary",
  "Сон": "secondary",
  "Активность": "accent",
  "Добавки": "primary",
  "Стресс": "secondary",
  "Образ жизни": "accent",
  "Общее резюме": "primary",
};

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить рекомендации",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(recommendations.map((r) => r.type)));
  const filteredRecommendations = selectedCategory
    ? recommendations.filter((r) => r.type === selectedCategory)
    : recommendations;

  const groupedRecommendations = filteredRecommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) {
      acc[rec.type] = [];
    }
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

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
            Персональные рекомендации
          </h2>
          <p className="text-muted-foreground">
            AI-генерированные советы на основе ваших анализов
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={
                selectedCategory === null
                  ? "shadow-neon-primary"
                  : "border-primary/30 hover:border-primary hover:shadow-neon-primary"
              }
            >
              Все
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "shadow-neon-primary"
                    : "border-primary/30 hover:border-primary hover:shadow-neon-primary"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {recommendations.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Рекомендации появятся скоро</h3>
              <p className="text-muted-foreground text-center mb-6">
                Добавьте анализы, и AI сгенерирует персональные рекомендации для вас
              </p>
              <Button onClick={() => navigate("/analyses")} className="shadow-neon-primary">
                Добавить анализ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRecommendations).map(([type, recs]) => {
              const Icon = categoryIcons[type] || Brain;
              const colorClass = categoryColors[type] || "primary";
              
              return (
                <div key={type}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-${colorClass}/10 border border-${colorClass}/30 flex items-center justify-center group-hover:shadow-neon-${colorClass} transition-all`}
                    >
                      <Icon className={`h-6 w-6 text-${colorClass}`} />
                    </div>
                    <h3 className="text-2xl font-bold">{type}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {recs.map((rec) => (
                      <Card
                        key={rec.id}
                        className={`hover:shadow-neon-${colorClass} hover:border-${colorClass}/50 transition-all border-${colorClass}/20 bg-gradient-to-br from-card to-${colorClass}/5`}
                      >
                        <CardContent className="pt-6">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {rec.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-4">
                            {new Date(rec.created_at).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
