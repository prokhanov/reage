import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scale, Plus, TrendingDown, TrendingUp, Activity, History, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface WeightRecord {
  id: string;
  weight: number;
  measured_at: string;
}

interface Profile {
  height: number | null;
}

export function WeightTracker() {
  const { getUserId, isViewMode } = useViewAsUser();
  const [weight, setWeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [history, setHistory] = useState<WeightRecord[]>([]);
  const [height, setHeight] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const userId = await getUserId();
    if (!userId) return;

    // Fetch weight history
    const { data: weightData } = await supabase
      .from("weight_history")
      .select("*")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(10);

    // Fetch height and weight from profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("height, weight")
      .eq("id", userId)
      .single();

    if (weightData && weightData.length > 0) {
      setHistory(weightData);
      setCurrentWeight(weightData[0].weight);
    } else if (profileData?.weight) {
      // Fallback to profile weight when no history exists
      setCurrentWeight(profileData.weight);
    }

    if (profileData?.height) {
      setHeight(profileData.height);
    }
  };

  const handleSaveWeight = async () => {
    const weightValue = parseFloat(weight);
    if (!weight || weightValue <= 0 || weightValue > 500) {
      toast({
        title: "Ошибка",
        description: "Введите корректный вес (от 1 до 500 кг)",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      // Insert into history
      const { error: historyError } = await supabase
        .from("weight_history")
        .insert({ user_id: userId, weight: weightValue });

      if (historyError) throw historyError;

      // Update profile
      await supabase
        .from("profiles")
        .update({ weight: weightValue })
        .eq("id", userId);

      toast({
        title: "Успешно сохранено! ✅",
        description: "Вес добавлен в историю"
      });

      setWeight("");
      setIsDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving weight:", error);
      toast({
        title: "Ошибка сохранения",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWeight = async (id: string) => {
    try {
      const { error } = await supabase
        .from("weight_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Удалено",
        description: "Запись удалена из истории"
      });

      await fetchData();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting weight:", error);
      toast({
        title: "Ошибка удаления",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  const calculateBMI = () => {
    if (!currentWeight || !height) return null;
    const heightInMeters = height / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: "Недостаточный вес", color: "text-blue-500" };
    if (bmi < 25) return { text: "Нормальный вес", color: "text-green-500" };
    if (bmi < 30) return { text: "Избыточный вес", color: "text-yellow-500" };
    return { text: "Ожирение", color: "text-red-500" };
  };

  const getWeightTrend = () => {
    if (history.length < 2) return null;
    const diff = history[0].weight - history[1].weight;
    return diff;
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;
  const weightTrend = getWeightTrend();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Current Weight Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Текущий вес</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {currentWeight ? currentWeight.toFixed(1) : "—"}
              </span>
              <span className="text-muted-foreground">кг</span>
            </div>
            {weightTrend !== null && (
              <div className="flex items-center gap-1 mt-2">
                {weightTrend < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">
                      {Math.abs(weightTrend).toFixed(1)} кг
                    </span>
                  </>
                ) : weightTrend > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-500">
                      +{weightTrend.toFixed(1)} кг
                    </span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Без изменений</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Scale className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новое измерение веса</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Вес (кг)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="75.5"
                    step="0.1"
                    min="1"
                    max="500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveWeight} disabled={isSaving} className="flex-1">
                  {isSaving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <History className="w-4 h-4 mr-1" />
                История
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>История измерений</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto py-4">
                {history.length > 0 ? (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{record.weight} кг</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(record.measured_at), "d MMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(record.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    История измерений пуста
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя будет отменить. Запись будет удалена из истории.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDeleteWeight(deleteId)}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {/* BMI Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Индекс массы тела</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {bmi || "—"}
              </span>
            </div>
            {bmiCategory && (
              <p className={`text-sm mt-2 font-medium ${bmiCategory.color}`}>
                {bmiCategory.text}
              </p>
            )}
            {!height && (
              <p className="text-xs text-muted-foreground mt-2">
                Добавьте рост в профиле для расчета ИМТ
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
        </div>

        {bmi && (
          <div className="space-y-2">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
