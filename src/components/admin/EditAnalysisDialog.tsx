import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EditAnalysisDialogProps {
  analysisId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditAnalysisDialog({ analysisId, open, onOpenChange, onSuccess }: EditAnalysisDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    lab_name: "",
    status: "on_review" as "on_review" | "processed",
    health_index: "",
    biological_age: "",
    note: "",
  });

  useEffect(() => {
    if (open && analysisId) {
      loadAnalysisData();
    }
  }, [open, analysisId]);

  const loadAnalysisData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (error) throw error;

      setFormData({
        date: format(new Date(data.date), "yyyy-MM-dd"),
        lab_name: data.lab_name || "",
        status: data.status,
        health_index: data.health_index?.toString() || "",
        biological_age: data.biological_age?.toString() || "",
        note: data.note || "",
      });
    } catch (error: any) {
      console.error("Error loading analysis:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные анализа",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        date: formData.date,
        lab_name: formData.lab_name || null,
        status: formData.status,
        note: formData.note || null,
      };

      // Добавляем числовые поля только если они заполнены
      if (formData.health_index) {
        updateData.health_index = parseFloat(formData.health_index);
      }
      if (formData.biological_age) {
        updateData.biological_age = parseFloat(formData.biological_age);
      }

      const { error } = await supabase
        .from("analyses")
        .update(updateData)
        .eq("id", analysisId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Анализ обновлен",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating analysis:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить анализ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать анализ</DialogTitle>
          <DialogDescription>
            Измените основные параметры анализа
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата анализа</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab_name">Лаборатория</Label>
              <Input
                id="lab_name"
                placeholder="Название лаборатории"
                value={formData.lab_name}
                onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "on_review" | "processed") => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_review">На проверке</SelectItem>
                  <SelectItem value="processed">Обработан</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_index">Индекс здоровья (%)</Label>
              <Input
                id="health_index"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0-100"
                value={formData.health_index}
                onChange={(e) => setFormData({ ...formData, health_index: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biological_age">Биологический возраст (лет)</Label>
              <Input
                id="biological_age"
                type="number"
                min="0"
                max="150"
                step="0.1"
                placeholder="Возраст"
                value={formData.biological_age}
                onChange={(e) => setFormData({ ...formData, biological_age: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Примечание</Label>
              <Input
                id="note"
                placeholder="Дополнительная информация"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
