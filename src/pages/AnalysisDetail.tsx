import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string;
  category: string;
  normal_min: number | null;
  normal_max: number | null;
}

interface AnalysisValue {
  id: string;
  biomarker_id: string;
  value: number;
  biomarkers: Biomarker;
}

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [values, setValues] = useState<AnalysisValue[]>([]);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState("");
  const [biomarkerValue, setBiomarkerValue] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Load analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (analysisError) throw analysisError;
      setAnalysis(analysisData);

      // Load values
      const { data: valuesData, error: valuesError } = await supabase
        .from("analysis_values")
        .select(`
          *,
          biomarkers (*)
        `)
        .eq("analysis_id", id);

      if (valuesError) throw valuesError;
      setValues(valuesData || []);

      // Load all biomarkers
      const { data: biomarkersData, error: biomarkersError } = await supabase
        .from("biomarkers")
        .select("*")
        .order("category")
        .order("name");

      if (biomarkersError) throw biomarkersError;
      setBiomarkers(biomarkersData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddValue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { error } = await supabase.from("analysis_values").insert({
        analysis_id: id,
        biomarker_id: selectedBiomarker,
        value: parseFloat(biomarkerValue),
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Показатель добавлен",
      });

      setDialogOpen(false);
      setSelectedBiomarker("");
      setBiomarkerValue("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить показатель",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    try {
      const { error } = await supabase
        .from("analysis_values")
        .delete()
        .eq("id", valueId);

      if (error) throw error;

      toast({
        title: "Удалено",
        description: "Показатель удален",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить показатель",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async () => {
    if (values.length === 0) {
      toast({
        title: "Недостаточно данных",
        description: "Добавьте хотя бы один показатель для анализа",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-biomarkers", {
        body: { analysisId: id },
      });

      if (error) throw error;

      toast({
        title: "Анализ завершен!",
        description: `Индекс здоровья: ${data.health_index}. Биологический возраст: ${data.biological_age} лет`,
      });

      loadData();
      navigate("/recommendations");
    } catch (error: any) {
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось выполнить AI-анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatus = (value: number, biomarker: Biomarker) => {
    if (biomarker.normal_min === null || biomarker.normal_max === null) return "unknown";
    if (value < biomarker.normal_min) return "low";
    if (value > biomarker.normal_max) return "high";
    return "normal";
  };

  const statusColors = {
    low: "text-status-danger",
    high: "text-status-warning",
    normal: "text-status-good",
    unknown: "text-muted-foreground",
  };

  const statusLabels = {
    low: "Ниже нормы",
    high: "Выше нормы",
    normal: "В норме",
    unknown: "Нет нормы",
  };

  const groupedValues = values.reduce((acc, value) => {
    const category = value.biomarkers.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(value);
    return acc;
  }, {} as Record<string, AnalysisValue[]>);

  if (loading && !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/analyses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Детали анализа
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              {analysis && new Date(analysis.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
            {analysis?.lab_name && (
              <p className="text-muted-foreground">Лаборатория: {analysis.lab_name}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-neon-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить показатель
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-primary/30">
                <DialogHeader>
                  <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
                    Новый показатель
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddValue} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="biomarker">Биомаркер</Label>
                    <select
                      id="biomarker"
                      value={selectedBiomarker}
                      onChange={(e) => setSelectedBiomarker(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Выберите показатель</option>
                      {biomarkers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Значение</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={biomarkerValue}
                      onChange={(e) => setBiomarkerValue(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Добавление..." : "Добавить"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || values.length === 0}
              className="shadow-neon-secondary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzing ? "Анализируем..." : "AI-анализ"}
            </Button>
          </div>
        </div>

        {/* Values by category */}
        {Object.keys(groupedValues).length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-center mb-6">
                Пока нет добавленных показателей
              </p>
              <Button onClick={() => setDialogOpen(true)} className="shadow-neon-primary">
                <Plus className="mr-2 h-4 w-4" />
                Добавить первый показатель
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedValues).map(([category, categoryValues]) => (
              <Card
                key={category}
                className="border-primary/20 bg-gradient-to-br from-card to-primary/5"
              >
                <CardHeader>
                  <CardTitle className="text-xl">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryValues.map((value) => {
                      const status = getStatus(value.value, value.biomarkers);
                      return (
                        <div
                          key={value.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-all group"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold">{value.biomarkers.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {value.biomarkers.normal_min !== null &&
                                value.biomarkers.normal_max !== null &&
                                `Норма: ${value.biomarkers.normal_min}-${value.biomarkers.normal_max} ${value.biomarkers.unit}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                {value.value} {value.biomarkers.unit}
                              </p>
                              <p className={`text-sm font-medium ${statusColors[status]}`}>
                                {statusLabels[status]}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteValue(value.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
