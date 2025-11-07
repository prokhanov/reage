import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisStep1Props {
  data: {
    date: string;
    labName: string;
  };
  onChange: (data: any) => void;
  analysisId?: string;
  currentStatus?: "on_review" | "processed";
  onStatusChange?: (status: "on_review" | "processed") => void;
}

export function AnalysisStep1({ data, onChange, analysisId, currentStatus, onStatusChange }: AnalysisStep1Props) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"on_review" | "processed" | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus as "on_review" | "processed");
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !analysisId || !onStatusChange) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("analyses")
        .update({ status: pendingStatus })
        .eq("id", analysisId);

      if (error) throw error;

      onStatusChange(pendingStatus);
      
      toast({
        title: "Успешно!",
        description: pendingStatus === "processed" 
          ? "Отчет загружен в кабинет клиента" 
          : "Статус изменен на 'На проверке'",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setShowConfirmDialog(false);
      setPendingStatus(null);
    }
  };
  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="date">Дата анализа</Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="labName">Лаборатория (опционально)</Label>
          <Input
            id="labName"
            type="text"
            placeholder="Инвитро, KDL и т.д."
            value={data.labName}
            onChange={(e) => onChange({ ...data, labName: e.target.value })}
          />
        </div>
        {analysisId && currentStatus && (
          <div className="space-y-2">
            <Label htmlFor="status">Статус отчета</Label>
            <Select 
              value={currentStatus} 
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_review">На проверке</SelectItem>
                <SelectItem value="processed">Подтвержден</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {currentStatus === "processed" 
                ? "Отчет виден клиенту в личном кабинете" 
                : "Отчет скрыт от клиента"}
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изменить статус отчета?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "processed" 
                ? "Отчет станет доступен клиенту в личном кабинете. Убедитесь, что все данные проверены." 
                : "Отчет будет скрыт от клиента и помечен как находящийся на проверке."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={updating}
            >
              {updating ? "Изменение..." : "Подтвердить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
