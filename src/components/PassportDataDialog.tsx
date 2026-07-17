import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportFields, isPassportDataComplete } from "./PassportFields";

interface PassportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function PassportDataDialog({ open, onOpenChange, onSaved }: PassportDataDialogProps) {
  const { getUserId } = useViewAsUser();
  const { toast } = useToast();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
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
        .select("first_name, last_name, middle_name, passport_series, passport_number")
        .eq("id", userId)
        .maybeSingle();
      setLastName((data as any)?.last_name || "");
      setFirstName((data as any)?.first_name || "");
      setMiddleName((data as any)?.middle_name || "");
      setSeries((data as any)?.passport_series || "");
      setNumber((data as any)?.passport_number || "");
    })();
  }, [open, getUserId]);

  const complete = isPassportDataComplete({
    firstName,
    lastName,
    middleName,
    series,
    number,
  });

  const handleSave = async () => {
    if (!complete) {
      toast({
        title: "Проверьте данные",
        description:
          "Заполните фамилию, имя, отчество, серию (4 цифры) и номер (6 цифр)",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не удалось определить пользователя");
      const fn = firstName.trim();
      const ln = lastName.trim();
      const mn = middleName.trim();
      const fullName = [ln, fn, mn].filter(Boolean).join(" ");
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: fn,
          last_name: ln,
          middle_name: mn || null,
          name: fullName,
          passport_series: series,
          passport_number: number,
        } as any)
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
      <DialogContent className="sm:max-w-[480px] max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-4">
        <DialogHeader className="text-left space-y-1.5">
          <DialogTitle className="text-lg">Паспортные данные</DialogTitle>
          <DialogDescription className="text-sm">
            Проверьте ФИО и серию/номер — эти данные уйдут в лабораторию для оформления забора.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">ФИО (как в паспорте)</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Фамилия</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Иванов"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Имя</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Иван"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Отчество</Label>
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Иванович"
                  className="h-11 text-base"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Серия и номер паспорта</p>
            <PassportFields
              series={series}
              number={number}
              onSeriesChange={setSeries}
              onNumberChange={setNumber}
              showIcon={false}
              hideHeader
              hideHint
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 rounded-xl w-full sm:w-auto"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !complete}
            className="h-11 rounded-xl bg-gradient-primary shadow-neon-primary w-full sm:w-auto"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
