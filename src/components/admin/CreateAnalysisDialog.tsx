import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useState, useContext, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";

interface CreateAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAnalysisDialog({ open, onOpenChange, onSuccess }: CreateAnalysisDialogProps) {
  const { viewAsUserId, setSimPath } = useContext(ViewAsPatientContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    labName: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    console.log("CreateAnalysisDialog - viewAsUserId:", viewAsUserId);
  }, [viewAsUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!viewAsUserId) {
      console.error("CreateAnalysisDialog - no viewAsUserId available");
      toast({
        title: "Ошибка",
        description: "Не указан пациент. Закройте и откройте диалог снова.",
        variant: "destructive",
      });
      return;
    }

    console.log("Creating analysis for user:", viewAsUserId);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("analyses")
        .insert({
          user_id: viewAsUserId,
          date: formData.date,
          lab_name: formData.labName || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating analysis:", error);
        throw error;
      }

      console.log("Analysis created successfully:", data);
      toast({
        title: "Успешно!",
        description: "Анализ создан. Теперь добавьте результаты.",
      });

      onOpenChange(false);
      setSimPath(`/analyses/${data.id}`);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать анализ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
            Новый анализ для пациента
          </DialogTitle>
          <DialogDescription>
            Создайте новый анализ и добавьте показатели биомаркеров
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
  );
}
