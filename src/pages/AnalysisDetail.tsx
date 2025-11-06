import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Sparkles, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBiomarker, setEditingBiomarker] = useState<Biomarker | null>(null);
  const [editValue, setEditValue] = useState("");
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

  const openEditDialog = (biomarker: Biomarker) => {
    const existingValue = values.find((v) => v.biomarker_id === biomarker.id);
    setEditingBiomarker(biomarker);
    setEditValue(existingValue ? existingValue.value.toString() : "");
    setEditDialogOpen(true);
  };

  const handleSaveValue = async () => {
    if (!editingBiomarker || !editValue) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const existingValue = values.find((v) => v.biomarker_id === editingBiomarker.id);

      if (existingValue) {
        // Update existing value
        const { error } = await supabase
          .from("analysis_values")
          .update({ value: parseFloat(editValue) })
          .eq("id", existingValue.id);

        if (error) throw error;
      } else {
        // Insert new value
        const { error } = await supabase
          .from("analysis_values")
          .insert({
            analysis_id: id,
            biomarker_id: editingBiomarker.id,
            value: parseFloat(editValue),
          });

        if (error) throw error;
      }

      toast({
        title: "Успешно!",
        description: "Значение сохранено",
      });

      setEditDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить значение",
        variant: "destructive",
      });
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

  const getGaugeAngle = (value: number, biomarker: Biomarker) => {
    if (biomarker.normal_min === null || biomarker.normal_max === null) return 90;
    const range = biomarker.normal_max - biomarker.normal_min;
    const extendedMin = biomarker.normal_min - range * 0.5;
    const extendedMax = biomarker.normal_max + range * 0.5;
    const extendedRange = extendedMax - extendedMin;
    const position = ((value - extendedMin) / extendedRange) * 180;
    return Math.max(0, Math.min(180, position));
  };

  const getGaugeColor = (value: number, biomarker: Biomarker) => {
    if (biomarker.normal_min === null || biomarker.normal_max === null) return "text-muted";
    if (value < biomarker.normal_min) return "text-status-danger";
    if (value > biomarker.normal_max) return "text-status-warning";
    return "text-status-good";
  };

  const filteredBiomarkers = biomarkers.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBiomarkers = filteredBiomarkers.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) acc[biomarker.category] = [];
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

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
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || values.length === 0}
            className="shadow-neon-accent"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzing ? "Анализируем..." : "AI-анализ"}
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, коду или категории..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary/30"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="entered" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="entered">
              Введенные значения ({values.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              Все показатели ({filteredBiomarkers.length})
            </TabsTrigger>
          </TabsList>

          {/* Entered Values Tab */}
          <TabsContent value="entered" className="space-y-6">
            {values.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground text-center">
                    Пока нет введенных значений
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedValues).map(([category, categoryValues]) => (
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
                    <div className="space-y-3">
                      {categoryValues.map((value) => {
                        const color = getGaugeColor(value.value, value.biomarkers);

                        return (
                          <div
                            key={value.id}
                            className="p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-foreground">{value.biomarkers.name}</h4>
                                    <p className="text-xs text-muted-foreground">{value.biomarkers.code}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-2xl font-bold ${color}`}>
                                      {value.value} {value.biomarkers.unit}
                                    </p>
                                  </div>
                                </div>
                                {value.biomarkers.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {value.biomarkers.description}
                                  </p>
                                )}
                                {value.biomarkers.normal_min !== null && value.biomarkers.normal_max !== null && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Референс:</span>
                                    <span className="font-medium text-status-good">
                                      {value.biomarkers.normal_min} - {value.biomarkers.normal_max} {value.biomarkers.unit}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(value.biomarkers)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteValue(value.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Biomarkers Tab */}
          <TabsContent value="all" className="space-y-6">
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
                  <div className="space-y-3">
                    {categoryBiomarkers.map((biomarker) => {
                      const existingValue = values.find((v) => v.biomarker_id === biomarker.id);

                      return (
                        <div
                          key={biomarker.id}
                          className="p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-foreground">{biomarker.name}</h4>
                                  <p className="text-xs text-muted-foreground">{biomarker.code}</p>
                                </div>
                                {existingValue && (
                                  <span className="text-lg font-bold text-primary">
                                    {existingValue.value} {biomarker.unit}
                                  </span>
                                )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(biomarker)}
                              className="border-primary/30 hover:bg-primary/10"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              {existingValue ? "Редактировать" : "Добавить"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
                {editingBiomarker?.name}
              </DialogTitle>
            </DialogHeader>
            {editingBiomarker && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">Код:</span> {editingBiomarker.code}</p>
                  <p><span className="font-medium">Единица измерения:</span> {editingBiomarker.unit}</p>
                  {editingBiomarker.normal_min !== null && editingBiomarker.normal_max !== null && (
                    <p>
                      <span className="font-medium">Референсные значения:</span>{" "}
                      {editingBiomarker.normal_min} - {editingBiomarker.normal_max}
                    </p>
                  )}
                  {editingBiomarker.description && (
                    <p className="mt-2">{editingBiomarker.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-value">Значение</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Введите значение"
                    className="text-lg"
                  />
                </div>
                <Button
                  onClick={handleSaveValue}
                  className="w-full"
                  disabled={!editValue}
                >
                  Сохранить
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
