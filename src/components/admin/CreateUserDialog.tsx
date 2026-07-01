import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { Copy, Check } from "lucide-react";


interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  const [formData, setFormData] = useState({

    email: "",
    password: "",
    firstName: "",
    lastName: "",
    gender: "male",
    birthDate: undefined as Date | undefined,
    selectedRoles: [] as string[],
  });

  const { data: roles } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_name");
      
      if (error) throw error;
      // Фильтруем роль "user" (Пациент) - она не для административного персонала
      return data?.filter(role => role.name !== "user") || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.birthDate) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, укажите дату рождения",
        variant: "destructive",
      });
      return;
    }

    if (formData.selectedRoles.length === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите хотя бы одну роль",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Проверить, существует ли email в базе
      const { data: emailCheck, error: checkError } = await supabase.functions.invoke(
        'check-email-exists',
        { body: { email: formData.email } }
      );

      if (checkError) {
        console.error('Email check error:', checkError);
        toast({
          title: "Ошибка проверки",
          description: "Не удалось проверить email. Попробуйте снова.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (emailCheck?.exists) {
        toast({
          title: "Email уже используется",
          description: emailCheck.message || "Этот email уже зарегистрирован в системе",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("Не авторизован");

      const token = crypto.randomUUID();
      const registerUrl = `/register-staff?invite=${token}`;
      const fullUrl = `${window.location.origin}${registerUrl}`;

      const metadata = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        birth_date: formData.birthDate.toISOString().split('T')[0],
        roles: formData.selectedRoles,
      };

      // Создать приглашение с metadata
      const { error: inviteError } = await supabase
        .from("invite_tokens")
        .insert({
          token,
          role: formData.selectedRoles[0],
          invited_email: formData.email,
          created_by: currentUser.user.id,
          metadata,
        });

      if (inviteError) throw inviteError;

      toast({
        title: "Приглашение создано",
        description: "Ссылка готова — нажмите кнопку копирования рядом с полем",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["invite-tokens"] });

      setGeneratedUrl(fullUrl);
      setJustCopied(false);

      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        gender: "male",
        birthDate: undefined,
        selectedRoles: [],
      });

    } catch (error: any) {
      console.error("Create invite error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать приглашение",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (roleName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleName)
        ? prev.selectedRoles.filter(r => r !== roleName)
        : [...prev.selectedRoles, roleName]
    }));
  };

  return (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{generatedUrl ? "Приглашение создано" : "Добавить пользователя"}</DialogTitle>
        <DialogDescription>
          {generatedUrl
            ? "Отправьте эту ссылку сотруднику. Она открывает форму регистрации по приглашению."
            : "Введите данные пользователя. После создания появится ссылка для регистрации."}
        </DialogDescription>
      </DialogHeader>

      {generatedUrl ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-url">Ссылка приглашения</Label>
            <div className="flex gap-2">
              <Input
                id="invite-url"
                readOnly
                value={generatedUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const ok = await copyToClipboard(generatedUrl);
                  setJustCopied(ok);
                  toast({
                    title: ok ? "Скопировано" : "Скопируйте вручную",
                    description: ok ? "Ссылка в буфере обмена" : "Выделите поле и нажмите Ctrl/⌘+C",
                  });
                }}
              >
                {justCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ссылка одноразовая и действует до её использования.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setGeneratedUrl(null);
                setJustCopied(false);
              }}
            >
              Создать ещё
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                setGeneratedUrl(null);
                setJustCopied(false);
                onOpenChange(false);
              }}
            >
              Готово
            </Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">Имя *</Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Фамилия *</Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Пол *</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Мужской</SelectItem>
              <SelectItem value="female">Женский</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Дата рождения *</Label>
          <BirthDatePicker
            value={formData.birthDate}
            onChange={(date) => setFormData({ ...formData, birthDate: date })}
          />
        </div>

        <div className="space-y-2">
          <Label>Роли *</Label>
          <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
            {roles?.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.selectedRoles.includes(role.name)}
                  onCheckedChange={() => toggleRole(role.name)}
                />
                <Label
                  htmlFor={`role-${role.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {role.display_name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <ButtonSpinner className="mr-2" />}{isSubmitting ? "Создание..." : "Создать приглашение"}
          </Button>
        </div>
      </form>
      )}
    </DialogContent>

  );
}
