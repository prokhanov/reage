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
import { Shield, Settings, Users, Database } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface UserPermissionsDialogProps {
  userId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const ADMIN_MODULES = [
  { value: "ai_settings", label: "Настройки AI", icon: Settings },
  { value: "data_management", label: "Управление данными", icon: Database },
  { value: "patients", label: "Пациенты", icon: Users },
  { value: "user_management", label: "Управление пользователями", icon: Shield },
];

export function UserPermissionsDialog({ userId, onClose, onUpdate }: UserPermissionsDialogProps) {
  const [selectedRole, setSelectedRole] = useState<"user" | "doctor" | "admin" | "superadmin">("user");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userRoles = (roles || []).map((r) => r.role);
      const primaryRole = userRoles.includes("superadmin")
        ? "superadmin"
        : userRoles.includes("admin")
        ? "admin"
        : userRoles.includes("doctor")
        ? "doctor"
        : "user";

      const { data: permissions } = await supabase
        .from("admin_permissions")
        .select("module, enabled")
        .eq("user_id", userId);

      const enabledModules = (permissions || [])
        .filter((p) => p.enabled)
        .map((p) => p.module);

      return {
        ...profile,
        role: primaryRole,
        modules: enabledModules,
      };
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role as "user" | "admin" | "superadmin");
      setSelectedModules(user.modules || []);
    }
  }, [user]);

  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;

      // Update role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", selectedRole)
        .maybeSingle();

      if (!existingRole) {
        // Delete old roles
        await supabase.from("user_roles").delete().eq("user_id", userId);
        
        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: selectedRole });

        if (roleError) throw roleError;
      }

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
        description: "Права доступа пользователя успешно обновлены",
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
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role" className="text-base font-semibold">
                  Роль пользователя
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Определяет базовые права доступа
                </p>
                <Select 
                  value={selectedRole} 
                  onValueChange={(v) => setSelectedRole(v as "user" | "admin" | "superadmin")}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Пациент</Badge>
                        <span className="text-xs text-muted-foreground">
                          - Только личный кабинет
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="doctor">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Врач</Badge>
                        <span className="text-xs text-muted-foreground">
                          - Доступ к пациентам
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Админ</Badge>
                        <span className="text-xs text-muted-foreground">
                          - Доступ к выбранным модулям
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Суперадмин</Badge>
                        <span className="text-xs text-muted-foreground">
                          - Полный доступ
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Доступ к модулям админки</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedRole === "superadmin"
                    ? "Суперадмин имеет доступ ко всем модулям автоматически"
                    : selectedRole === "doctor"
                    ? "Врач автоматически имеет доступ к модулю Пациенты"
                    : selectedRole === "user"
                    ? "Пациент не имеет доступа к административным модулям"
                    : "Выберите модули, к которым будет доступ"}
                </p>

                <div className="space-y-3">
                  {ADMIN_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isDisabled = selectedRole === "superadmin" || selectedRole === "user" || 
                      (selectedRole === "doctor" && module.value === "patients");
                    const isChecked =
                      selectedRole === "superadmin" || 
                      (selectedRole === "doctor" && module.value === "patients") ||
                      selectedModules.includes(module.value);

                    return (
                      <div
                        key={module.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isDisabled ? "opacity-50" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={module.value}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleModuleToggle(module.value, checked as boolean)
                          }
                          disabled={isDisabled}
                        />
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <Label
                          htmlFor={module.value}
                          className={`flex-1 ${isDisabled ? "" : "cursor-pointer"}`}
                        >
                          {module.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => updatePermissionsMutation.mutate()}
            disabled={updatePermissionsMutation.isPending}
          >
            Сохранить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
