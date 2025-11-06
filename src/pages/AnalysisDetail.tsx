import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string;
  category: string;
  description: string | null;
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
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    // Initialize input values from existing analysis values
    const initialValues: Record<string, string> = {};
    values.forEach((v) => {
      initialValues[v.biomarker_id] = v.value.toString();
    });
    setInputValues(initialValues);
  }, [values]);

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

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Get all biomarkers that have values entered
      const entriesToSave = Object.entries(inputValues)
        .filter(([_, value]) => value && value.trim() !== "")
        .map(([biomarkerId, value]) => ({
          analysis_id: id,
          biomarker_id: biomarkerId,
          value: parseFloat(value),
        }));

      if (entriesToSave.length === 0) {
        toast({
          title: "Нет данных",
          description: "Введите хотя бы одно значение",
          variant: "destructive",
        });
        return;
      }

      // Delete existing values for this analysis
      const { error: deleteError } = await supabase
        .from("analysis_values")
        .delete()
        .eq("analysis_id", id);

      if (deleteError) throw deleteError;

      // Insert all new values
      const { error: insertError } = await supabase
        .from("analysis_values")
        .insert(entriesToSave);

      if (insertError) throw insertError;

      toast({
        title: "Успешно!",
        description: `Сохранено ${entriesToSave.length} показателей`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить показатели",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  const getProgressValue = (value: string, biomarker: Biomarker) => {
    if (!value || biomarker.normal_min === null || biomarker.normal_max === null) return 50;
    const numValue = parseFloat(value);
    const range = biomarker.normal_max - biomarker.normal_min;
    const position = ((numValue - biomarker.normal_min) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const getProgressColor = (value: string, biomarker: Biomarker) => {
    if (!value || biomarker.normal_min === null || biomarker.normal_max === null) return "bg-muted";
    const numValue = parseFloat(value);
    if (numValue < biomarker.normal_min) return "bg-status-danger";
    if (numValue > biomarker.normal_max) return "bg-status-warning";
    return "bg-status-good";
  };

  const groupedBiomarkers = biomarkers.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) acc[biomarker.category] = [];
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  if (loading && !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
            <p className="text-sm text-muted-foreground mt-2">
              Введите значения для нужных показателей и нажмите "Сохранить всё"
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="shadow-neon-primary"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Сохранение..." : "Сохранить всё"}
            </Button>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || values.length === 0}
              className="shadow-neon-accent"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzing ? "Анализируем..." : "AI-анализ"}
            </Button>
          </div>
        </div>

        {/* Biomarkers by category */}
        <div className="space-y-6">
          {Object.entries(groupedBiomarkers).map(([category, categoryBiomarkers]) => (
            <Card
              key={category}
              className="border-primary/20 bg-gradient-to-br from-card to-primary/5"
            >
              <CardHeader>
                <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryBiomarkers.map((biomarker) => {
                    const currentValue = inputValues[biomarker.id] || "";
                    const progressValue = getProgressValue(currentValue, biomarker);
                    const progressColor = getProgressColor(currentValue, biomarker);

                    return (
                      <div
                        key={biomarker.id}
                        className="p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-all"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Info column */}
                          <div className="lg:col-span-5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-foreground">{biomarker.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{biomarker.code}</p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {biomarker.unit}
                              </span>
                            </div>
                            {biomarker.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {biomarker.description}
                              </p>
                            )}
                            {biomarker.normal_min !== null && biomarker.normal_max !== null && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Референс:</span>
                                <span className="font-medium text-status-good">
                                  {biomarker.normal_min} - {biomarker.normal_max} {biomarker.unit}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Input column */}
                          <div className="lg:col-span-3 flex items-center">
                            <div className="w-full">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Значение"
                                value={currentValue}
                                onChange={(e) =>
                                  setInputValues({
                                    ...inputValues,
                                    [biomarker.id]: e.target.value,
                                  })
                                }
                                className="w-full text-lg font-semibold text-center bg-background border-primary/30 focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Visual indicator column */}
                          <div className="lg:col-span-4 flex items-center">
                            {currentValue && biomarker.normal_min !== null && biomarker.normal_max !== null ? (
                              <div className="w-full space-y-2">
                                <div className="relative h-8 bg-muted rounded-full overflow-hidden border border-border">
                                  {/* Danger zone left */}
                                  <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-status-danger/20" />
                                  {/* Normal zone */}
                                  <div className="absolute left-[10%] top-0 bottom-0 right-[10%] bg-status-good/20" />
                                  {/* Danger zone right */}
                                  <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-status-warning/20" />
                                  
                                  {/* Value indicator */}
                                  <div
                                    className={`absolute top-0 bottom-0 w-1.5 ${progressColor} shadow-lg transition-all`}
                                    style={{ left: `${progressValue}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Низко</span>
                                  <span className="text-status-good">Норма</span>
                                  <span>Высоко</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full text-center text-sm text-muted-foreground">
                                {currentValue ? "Нет референсных значений" : "Введите значение"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
