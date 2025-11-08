import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserPermissionsDialogProps {
  userId: string | null;
  onClose: () => void;
  onUpdate: () => void;
  isPending?: boolean;
  inviteToken?: string;
}

const ADMIN_MODULES = [
  { value: "ai_settings", label: "Настройки AI" },
  { value: "data_management", label: "Управление данными" },
  { value: "patients", label: "Пациенты" },
  { value: "user_management", label: "Управление пользователями" },
];

export function UserPermissionsDialog({ userId, onClose, onUpdate, isPending = false, inviteToken }: UserPermissionsDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: customRoles } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-permissions", userId, isPending],
    queryFn: async () => {
      if (!userId) return null;

      // Для pending пользователей загружаем данные из invite_tokens
      if (isPending && inviteToken) {
        const { data: invite, error: inviteError } = await supabase
          .from("invite_tokens")
          .select("*")
          .eq("token", inviteToken)
          .single();

        if (inviteError) throw inviteError;

        const metadata = invite.metadata as any || {};
        
        return {
          id: invite.token, // используем token как id
          name: metadata.name || invite.invited_email || "Без имени",
          role: invite.role,
          role_id: null,
          custom_role: null,
          modules: [],
          isPending: true,
          invited_email: invite.invited_email,
        };
      }

      // Для активных пользователей загружаем из profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role, role_id, custom_roles(*)")
        .eq("user_id", userId)
        .single();

      const { data: permissions } = await supabase
        .from("admin_permissions")
        .select("module, enabled")
        .eq("user_id", userId);

      const enabledModules = (permissions || [])
        .filter((p) => p.enabled)
        .map((p) => p.module);

      return {
        ...profile,
        role: userRole?.role || "user",
        role_id: userRole?.role_id || null,
        custom_role: userRole?.custom_roles,
        modules: enabledModules,
        isPending: false,
      };
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (user && customRoles) {
      // Для pending пользователей находим role_id по имени роли
      if (isPending) {
        const roleData = customRoles.find((r) => r.name === user.role);
        setSelectedRoleId(roleData?.id || "");
      } else {
        setSelectedRoleId(user.role_id || "");
      }
      setSelectedModules(user.modules || []);
    }
  }, [user, customRoles, isPending]);

  const isSuperadmin = user?.role === "superadmin";
  const selectedRole = customRoles?.find((r) => r.id === selectedRoleId);

  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !selectedRoleId) return;

      const selectedRoleData = customRoles?.find((r) => r.id === selectedRoleId);
      if (!selectedRoleData) throw new Error("Роль не найдена");

      // Для pending пользователей обновляем invite_token
      if (isPending && inviteToken) {
        const { error } = await supabase
          .from("invite_tokens")
          .update({
            role: selectedRoleData.name,
          })
          .eq("token", inviteToken);

        if (error) throw error;
        return;
      }

      // Для активных пользователей обновляем role и permissions
      // Delete old role
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Insert new role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: userId, 
          role: selectedRoleData.name as "user" | "doctor" | "admin" | "superadmin",
          role_id: selectedRoleId
        });

      if (roleError) throw roleError;

      // Update permissions
      // First, get all existing permissions
      const { data: existingPermissions } = await supabase
        .from("admin_permissions")
        .select("id, module")
        .eq("user_id", userId);

      const existingModules = (existingPermissions || []).map((p) => p.module);

      // Delete permissions not in selectedModules
      const toDelete = existingModules.filter((m) => !selectedModules.includes(m));
      if (toDelete.length > 0) {
        await supabase
          .from("admin_permissions")
          .delete()
          .eq("user_id", userId)
          .in("module", toDelete);
      }

      // Upsert selected modules
      for (const module of selectedModules) {
        const existing = existingPermissions?.find((p) => p.module === module);
        
        if (existing) {
          await supabase
            .from("admin_permissions")
            .update({ enabled: true })
            .eq("id", existing.id);
        } else {
          const { error: insertError } = await supabase
            .from("admin_permissions")
            .insert({ 
              user_id: userId, 
              module: module as "ai_settings" | "data_management" | "patients" | "user_management", 
              enabled: true 
            });
          
          if (insertError) throw insertError;
        }
      }

      // Disable modules not in selectedModules
      const toDisable = existingModules.filter((m) => !selectedModules.includes(m));
      if (toDisable.length > 0) {
        await supabase
          .from("admin_permissions")
          .update({ enabled: false })
          .eq("user_id", userId)
          .in("module", toDisable);
      }
    },
    onSuccess: () => {
      toast({
        title: "Права обновлены",
        description: isPending 
          ? "Роль инвайта успешно обновлена" 
          : "Права доступа пользователя успешно обновлены",
      });
      onUpdate();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить права: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleModuleToggle = (module: string, checked: boolean) => {
    if (checked) {
      setSelectedModules([...selectedModules, module]);
    } else {
      setSelectedModules(selectedModules.filter((m) => m !== module));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройка прав доступа</DialogTitle>
          <DialogDescription>
            Управляйте ролью пользователя и доступом к модулям админки
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : user ? (
          <div className="space-y-6">
            {isPending && (
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Пользователь еще не зарегистрировался. Изменения роли будут применены после регистрации. Доступы к модулям можно настроить только после регистрации.
                </AlertDescription>
              </Alert>
            )}

            {isSuperadmin && (
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Суперадмин не может быть изменен. Эта роль имеет полный доступ ко всем функциям системы.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                {isPending && (user as any).invited_email && (
                  <p className="text-sm text-muted-foreground">{(user as any).invited_email}</p>
                )}
                {!isPending && (
                  <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role" className="text-base font-semibold">
                  Роль пользователя
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {isPending 
                    ? "Роль будет присвоена после регистрации"
                    : "Определяет права доступа и модули"}
                </p>
                <Select 
                  value={selectedRoleId} 
                  onValueChange={setSelectedRoleId}
                  disabled={isSuperadmin}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {customRoles?.filter((role) => role.name !== "user").map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span>{role.display_name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground">
                              - {role.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isPending && (
                <>
                  <Separator />

                  <div>
                    <Label className="text-base font-semibold">Дополнительные доступы к модулям</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isSuperadmin
                        ? "Суперадмин имеет доступ ко всем модулям автоматически"
                        : "Дополнительные модули сверх роли"}
                    </p>

                    <div className="space-y-3">
                      {ADMIN_MODULES.map((module) => {
                        const isChecked = selectedModules.includes(module.value);

                        return (
                          <div
                            key={module.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              isSuperadmin ? "opacity-50" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              id={module.value}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleModuleToggle(module.value, checked as boolean)
                              }
                              disabled={isSuperadmin}
                            />
                            <Label
                              htmlFor={module.value}
                              className={`flex-1 ${isSuperadmin ? "" : "cursor-pointer"}`}
                            >
                              {module.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => updatePermissionsMutation.mutate()}
            disabled={updatePermissionsMutation.isPending || isSuperadmin}
          >
            Сохранить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
