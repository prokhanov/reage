import { ReactNode, useState, cloneElement, isValidElement } from "react";
import { CheckCircle2, AlertCircle, Send, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailConfirmationBadgeProps {
  email: string | null;
  isConfirmed: boolean;
  /** Allow editing email (for unconfirmed users changing their own email) */
  allowEmailChange?: boolean;
  /** Callback after email was changed */
  onEmailChanged?: () => void;
  /** Custom trigger element to replace the default badge (only used when not confirmed) */
  trigger?: ReactNode;
  /** If trigger is provided, also hide the verified-state icon */
  hideVerifiedIcon?: boolean;
  /** Admin mode: show "force confirm" button. Requires userId. */
  adminMode?: boolean;
  /** Target user id (required for adminMode) */
  userId?: string;
  /** Callback after admin force-confirmed */
  onConfirmed?: () => void;
}

export function EmailConfirmationBadge({ 
  email, 
  isConfirmed, 
  allowEmailChange = false,
  onEmailChanged,
  trigger,
  hideVerifiedIcon = false,
  adminMode = false,
  userId,
  onConfirmed,
}: EmailConfirmationBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState(email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const { toast } = useToast();

  const handleForceConfirm = async () => {
    if (!userId) return;
    setIsForcing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-force-confirm', {
        body: { userId, type: 'email' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email подтверждён без проверки" });
      setDialogOpen(false);
      onConfirmed?.();
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setIsForcing(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail) return;
    setIsSending(true);
    try {
      const emailChanged = resendEmail !== email;
      const { data, error } = await supabase.functions.invoke('resend-confirmation', {
        body: { 
          email: email, 
          ...(emailChanged ? { newEmail: resendEmail } : {})
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: emailChanged ? "Email изменён и письмо отправлено" : "Письмо отправлено",
        description: `Письмо с подтверждением отправлено на ${resendEmail}`,
      });
      setDialogOpen(false);
      if (emailChanged && onEmailChanged) {
        onEmailChanged();
      }
    } catch (err: any) {
      toast({
        title: "Ошибка отправки",
        description: err.message || "Не удалось отправить письмо",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isConfirmed) {
    if (hideVerifiedIcon) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>Email подтверждён</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResendEmail(email || "");
    setIsEditing(false);
    setDialogOpen(true);
  };

  return (
    <>
      {trigger && isValidElement(trigger) ? (
        cloneElement(trigger as any, { onClick: openDialog })
      ) : trigger ? (
        <span onClick={openDialog} className="cursor-pointer">{trigger}</span>
      ) : (
        <Badge
          variant="outline"
          className="text-xs cursor-pointer border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
          onClick={openDialog}
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Email не подтверждён
        </Badge>
      )}


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Email не подтверждён</DialogTitle>
            <DialogDescription>
              {allowEmailChange 
                ? "Вы можете изменить email или отправить повторное письмо с подтверждением."
                : "Вы можете отправить повторное письмо с подтверждением."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Email для отправки</label>
                {allowEmailChange && !isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
              {isEditing || !allowEmailChange ? (
                <Input
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="user@example.com"
                  type="email"
                  readOnly={!allowEmailChange && !isEditing}
                />
              ) : (
                <p className="text-sm bg-muted px-3 py-2 rounded-md">{email}</p>
              )}
            </div>
            {allowEmailChange && isEditing && resendEmail !== email && (
              <p className="text-xs text-orange-500">
                ⚠️ Email будет изменён на новый. Письмо подтверждения придёт на новый адрес.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Нажмите по ссылке в письме для подтверждения email.
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button onClick={handleResend} disabled={isSending || !resendEmail} className="w-full">
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isEditing && resendEmail !== email ? "Сохранить и отправить" : "Отправить повторно"}
            </Button>
            {adminMode && userId && (
              <Button
                variant="secondary"
                onClick={handleForceConfirm}
                disabled={isForcing}
                className="w-full"
              >
                {isForcing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Подтвердить без проверки
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="w-full">
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
