import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportFields, isPassportValid } from "./PassportFields";

interface PassportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function PassportDataDialog({ open, onOpenChange, onSaved }: PassportDataDialogProps) {
  const { getUserId } = useViewAsUser();
  const { toast } = useToast();
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const userId = await getUserId();
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("passport_series, passport_number")
        .eq("id", userId)
        .maybeSingle();
      setSeries((data as any)?.passport_series || "");
      setNumber((data as any)?.passport_number || "");
    })();
  }, [open, getUserId]);

  const handleSave = async () => {
    if (!isPassportValid(series, number)) {
      toast({
        title: "Проверьте данные",
        description: "Серия — 4 цифры, номер — 6 цифр",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не удалось определить пользователя");
      const { error } = await supabase
        .from("profiles")
        .update({ passport_series: series, passport_number: number } as any)
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "Данные сохранены" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Паспортные данные</DialogTitle>
          <DialogDescription>
            Нужны для оформления забора анализов в лаборатории. Заполняются один раз.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <PassportFields
            series={series}
            number={number}
            onSeriesChange={setSeries}
            onNumberChange={setNumber}
            showIcon={false}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading || !isPassportValid(series, number)}>
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
