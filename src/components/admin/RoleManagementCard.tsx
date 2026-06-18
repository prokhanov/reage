import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ADMIN_MODULES = [
  { value: "ai_settings", label: "Настройки AI" },
  { value: "data_management", label: "Управление данными" },
  { value: "patients", label: "Пациенты" },
  { value: "user_management", label: "Управление пользователями" },
  { value: "analysis_bookings", label: "Записи на анализы" },
  { value: "my_assignments", label: "Назначены мне" },
];

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
}

export function RoleManagementCard() {
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    permissions: [] as string[],
  });
  const { toast } = useToast();

  const { data: roles, isLoading, refetch } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .neq("name", "user") // Исключаем роль "Пациент" из управления
        .order("is_system", { ascending: false })
        .order("display_name");

      if (error) throw error;
      return data as Role[];
    },
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_id, module");

      if (error) throw error;
      return data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async () => {
      const { data: role, error: roleError } = await supabase
        .from("custom_roles")
        .insert({
          name: formData.name.toLowerCase().replace(/\s+/g, "_"),
          display_name: formData.display_name,
          description: formData.description || null,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      if (formData.permissions.length > 0) {
        const { error: permError } = await supabase
          .from("role_permissions")
          .insert(
            formData.permissions.map((module) => ({
              role_id: role.id,
              module: module as "ai_settings" | "data_management" | "patients" | "user_management",
              enabled: true,
            }))
          );

        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Роль создана",
        description: "Новая роль успешно добавлена",
      });
      setIsCreating(false);
      setFormData({ name: "", display_name: "", description: "", permissions: [] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editingRole) return;

      const { error: roleError } = await supabase
        .from("custom_roles")
        .update({
          display_name: formData.display_name,
          description: formData.description || null,
        })
        .eq("id", editingRole.id);

      if (roleError) throw roleError;

      await supabase.from("role_permissions").delete().eq("role_id", editingRole.id);

      if (formData.permissions.length > 0) {
        const { error: permError } = await supabase
          .from("role_permissions")
          .insert(
            formData.permissions.map((module) => ({
              role_id: editingRole.id,
              module: module as "ai_settings" | "data_management" | "patients" | "user_management",
              enabled: true,
            }))
          );

        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Роль обновлена",
        description: "Изменения успешно сохранены",
      });
      setEditingRole(null);
      setFormData({ name: "", display_name: "", description: "", permissions: [] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: usersCount } = useQuery({
    queryKey: ["users-by-role"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((ur) => {
        if (ur.role_id) {
          counts[ur.role_id] = (counts[ur.role_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const userCount = usersCount?.[roleId] || 0;
      if (userCount > 0) {
        throw new Error(`Невозможно удалить роль: её используют ${userCount} пользователей`);
      }
      const { error } = await supabase.from("custom_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Роль удалена",
        description: "Роль успешно удалена",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    const perms = rolePermissions?.filter((p) => p.role_id === role.id).map((p) => p.module) || [];
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      permissions: perms,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateRoleMutation.mutate();
    } else {
      createRoleMutation.mutate();
    }
  };

  const getRolePermissions = (roleId: string) => {
    return rolePermissions?.filter((p) => p.role_id === roleId).map((p) => p.module) || [];
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Управление ролями</CardTitle>
              <CardDescription>Создавайте и редактируйте роли с доступами к модулям</CardDescription>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать роль
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminCenterLoader size="sm" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Роль</TableHead>
                  <TableHead>Доступы</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => {
                  const permissions = getRolePermissions(role.id);
                  const isSuperadmin = role.name === "superadmin";

                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{role.display_name}</span>
                            {role.is_system && (
                              <Badge variant="outline" className="text-xs">
                                Системная
                              </Badge>
                            )}
                            {isSuperadmin && (
                              <Shield className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSuperadmin ? (
                          <Badge variant="outline">Полный доступ</Badge>
                        ) : permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {ADMIN_MODULES.find((m) => m.value === perm)?.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Нет доступа</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                            disabled={isSuperadmin}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!role.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const userCount = usersCount?.[role.id] || 0;
                                if (userCount > 0) {
                                  toast({
                                    title: "Невозможно удалить",
                                    description: `Эту роль используют ${userCount} пользователей. Сначала измените их роли.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (window.confirm(`Удалить роль "${role.display_name}"?`)) {
                                  deleteRoleMutation.mutate(role.id);
                                }
                              }}
                              disabled={deleteRoleMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreating || !!editingRole} onOpenChange={() => {
        setIsCreating(false);
        setEditingRole(null);
        setFormData({ name: "", display_name: "", description: "", permissions: [] });
      }}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRole ? "Редактировать роль" : "Создать роль"}</DialogTitle>
              <DialogDescription>
                {editingRole ? "Измените параметры роли" : "Добавьте новую роль в систему"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!editingRole && (
                <div className="space-y-2">
                  <Label htmlFor="name">Идентификатор роли</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="manager"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется в системе (только латиница и подчеркивания)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="display_name">Отображаемое название</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Менеджер"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание роли"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Доступ к модулям</Label>
                {ADMIN_MODULES.map((module) => (
                  <div key={module.value} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Checkbox
                      id={module.value}
                      checked={formData.permissions.includes(module.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            permissions: [...formData.permissions, module.value],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            permissions: formData.permissions.filter((p) => p !== module.value),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={module.value} className="flex-1 cursor-pointer">
                      {module.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingRole(null);
                  setFormData({ name: "", display_name: "", description: "", permissions: [] });
                }}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
              >
                {editingRole ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
