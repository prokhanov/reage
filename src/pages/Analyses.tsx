import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Analysis {
  id: string;
  date: string;
  lab_name: string | null;
  health_index: number | null;
  biological_age: number | null;
  biomarkers_count?: number;
}

export default function Analyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    labName: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      
      // Получаем количество биомаркеров для каждого анализа
      const analysesWithCounts = await Promise.all(
        (data || []).map(async (analysis) => {
          const { count } = await supabase
            .from("analysis_values")
            .select("*", { count: "exact", head: true })
            .eq("analysis_id", analysis.id);
          
          return {
            ...analysis,
            biomarkers_count: count || 0,
          };
        })
      );
      
      setAnalyses(analysesWithCounts);
    } catch (error: any) {
      console.error("Error loading analyses:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить анализы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          date: formData.date,
          lab_name: formData.labName || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Анализ создан. Теперь добавьте результаты.",
      });

      setDialogOpen(false);
      navigate(`/analyses/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать анализ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              История анализов
            </h2>
            <p className="text-muted-foreground">Отслеживайте динамику своих показателей</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-neon-primary hover:scale-105 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Добавить анализ
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
                  Новый анализ
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAnalysis} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Дата анализа</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labName">Лаборатория (опционально)</Label>
                  <Input
                    id="labName"
                    type="text"
                    placeholder="Инвитро, KDL и т.д."
                    value={formData.labName}
                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Создание..." : "Создать и добавить показатели"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {analyses.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FlaskConical className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Пока нет анализов</h3>
              <p className="text-muted-foreground text-center mb-6">
                Добавьте свой первый анализ, чтобы начать отслеживать показатели здоровья
              </p>
              <Button onClick={() => setDialogOpen(true)} className="shadow-neon-primary">
                <Plus className="mr-2 h-4 w-4" />
                Добавить первый анализ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="hover:shadow-neon-primary hover:border-primary/50 transition-all cursor-pointer border-primary/20 bg-gradient-to-br from-card to-primary/5 group"
                onClick={() => navigate(`/analyses/${analysis.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      {new Date(analysis.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </CardTitle>
                    {analysis.biomarkers_count !== undefined && analysis.biomarkers_count > 0 && (
                      <Badge 
                        className="text-xs bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-sm"
                      >
                        {analysis.biomarkers_count} маркеров
                      </Badge>
                    )}
                  </div>
                  {analysis.lab_name && (
                    <p className="text-sm text-muted-foreground">{analysis.lab_name}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {analysis.health_index !== null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Индекс здоровья:</span>
                        <span className="text-2xl font-bold text-primary">
                          {analysis.health_index}
                        </span>
                      </div>
                      {analysis.biological_age !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Био. возраст:</span>
                          <span className="text-lg font-semibold text-foreground">
                            {analysis.biological_age} лет
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Нажмите, чтобы добавить показатели
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
