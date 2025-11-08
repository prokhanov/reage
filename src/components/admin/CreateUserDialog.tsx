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
    name: "",
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
      return data;
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

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          name: formData.name
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Не удалось создать пользователя");

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          name: formData.name,
          gender: formData.gender,
          birth_date: formData.birthDate.toISOString().split('T')[0],
        });

      if (profileError) throw profileError;

      const roleInserts = formData.selectedRoles.map(role => ({
        user_id: authData.user.id,
        role: role as any,
      }));

      const { error: rolesError } = await supabase
        .from("user_roles")
        .insert(roleInserts);

      if (rolesError) throw rolesError;

      toast({
        title: "Успешно",
        description: "Пользователь создан",
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      
      setFormData({
        email: "",
        password: "",
        name: "",
        gender: "male",
        birthDate: undefined,
        selectedRoles: [],
      });
    } catch (error: any) {
      console.error("Create user error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пользователя",
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
          Создайте нового пользователя с полным доступом
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
          <Label htmlFor="password">Пароль *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
            placeholder="Минимум 6 символов"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">ФИО *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            {isSubmitting ? "Создание..." : "Создать"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
