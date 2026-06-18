import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";

interface EditPendingUserDialogProps {
  inviteToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPendingUserDialog({ inviteToken, open, onOpenChange }: EditPendingUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    gender: "male",
    birthDate: undefined as Date | undefined,
    selectedRoles: [] as string[],
  });

  // Загрузить данные приглашения
  const { data: inviteData, isLoading: isLoadingInvite } = useQuery({
    queryKey: ["invite-token", inviteToken],
    queryFn: async () => {
      if (!inviteToken) return null;
      
      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", inviteToken)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inviteToken && open,
  });

  // Загрузить список ролей
  const { data: roles } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_name");
      
      if (error) throw error;
      return data?.filter(role => role.name !== "user") || [];
    },
  });

  // Заполнить форму при загрузке данных
  useEffect(() => {
    if (inviteData) {
      const metadata = (inviteData.metadata || {}) as Record<string, any>;
      setFormData({
        email: inviteData.invited_email || "",
        firstName: (metadata.firstName as string) || "",
        lastName: (metadata.lastName as string) || "",
        gender: (metadata.gender as string) || "male",
        birthDate: metadata.birth_date ? new Date(metadata.birth_date as string) : undefined,
        selectedRoles: (metadata.roles as string[]) || [inviteData.role],
      });
    }
  }, [inviteData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!inviteToken || !formData.birthDate) {
        throw new Error("Недостаточно данных");
      }

      const metadata = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        birth_date: formData.birthDate.toISOString().split('T')[0],
        roles: formData.selectedRoles,
      };

      const { error } = await supabase
        .from("invite_tokens")
        .update({
          invited_email: formData.email,
          role: formData.selectedRoles[0],
          metadata,
        })
        .eq("token", inviteToken);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Данные обновлены",
        description: "Информация о приглашении успешно изменена",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["invite-tokens"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить данные",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    updateMutation.mutate();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать приглашение</DialogTitle>
          <DialogDescription>
            Измените данные приглашения. Ссылка останется прежней.
          </DialogDescription>
        </DialogHeader>

        {isLoadingInvite ? (
          <AdminCenterLoader size="sm" />
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
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending && <ButtonSpinner className="mr-2" />}{updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
