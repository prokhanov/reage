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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

    // Скопировать ссылку в буфер (с fallback для старых браузеров)
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Приглашение создано",
        description: "Ссылка скопирована в буфер обмена",
      });
    } catch (clipboardError) {
      // Fallback: показать ссылку для ручного копирования
      toast({
        title: "Приглашение создано",
        description: fullUrl,
        duration: 10000,
      });
    }

      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["invite-tokens"] });
      onOpenChange(false);

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
        <DialogTitle>Добавить пользователя</DialogTitle>
        <DialogDescription>
          Введите данные пользователя. Ссылка для регистрации будет скопирована в буфер обмена.
        </DialogDescription>
      </DialogHeader>

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
            {isSubmitting ? "Создание..." : "Создать приглашение"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
