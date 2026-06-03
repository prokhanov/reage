import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChangeUserEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string | null;
  currentEmail: string | null;
  onSuccess?: () => void;
}

export function ChangeUserEmailDialog({
  open, onOpenChange, userId, userName, currentEmail, onSuccess,
}: ChangeUserEmailDialogProps) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNewEmail("");
      setConfirmEmail("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!newEmail || !confirmEmail) {
      toast({ title: "Ошибка", description: "Введите новый email дважды", variant: "destructive" });
      return;
    }
    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      toast({ title: "Ошибка", description: "Адреса не совпадают", variant: "destructive" });
      return;
    }
    if (currentEmail && newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast({ title: "Ошибка", description: "Новый email совпадает с текущим", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-change-user-email", {
        body: { userId, newEmail: newEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Email изменён",
        description: `Новый адрес: ${data.newEmail}. Подтверждение не требуется.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Не удалось изменить email",
        description: err.message || "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Изменить email
          </DialogTitle>
          <DialogDescription>
            {userName ? <>Пользователь: <strong>{userName}</strong>. </> : null}
            Новый адрес будет сразу подтверждён, письмо верификации не отправляется.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Текущий email</Label>
            <p className="text-sm bg-muted px-3 py-2 rounded-md">{currentEmail || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">Новый email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">Подтвердите новый email</Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="flex gap-2 p-3 rounded-md bg-orange-500/10 text-sm">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <span className="text-orange-600 dark:text-orange-400">
              После изменения пользователь должен войти, используя новый email.
              Старый адрес перестанет работать. Действие будет записано в историю.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || !newEmail || !confirmEmail}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Изменить email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
